# ADR-004: AI Integration and RAG Architecture

## Status
Proposed

## Context
foohut.com requires AI-powered features including:
- Semantic search across documentation with source citations
- AI-assisted answers to user questions (RAG)
- Content summarization and suggestions
- Intelligent content recommendations

We need an architecture that provides accurate, contextual responses while managing costs and latency. The system must:
- Generate embeddings for all documentation content
- Perform efficient similarity search across large document sets
- Integrate with Claude API for answer generation
- Provide source citations for transparency and verification

## Decision
We will implement a **Retrieval-Augmented Generation (RAG)** architecture using **pgvector** for vector storage, **Claude API** for embeddings and generation, with a **chunking strategy** optimized for documentation content.

### RAG Architecture Overview
```
+------------------------------------------------------------------+
|                         RAG Pipeline                              |
+------------------------------------------------------------------+

User Query Flow:
+--------+     +-----------+     +------------+     +-----------+
|  User  | --> |   Query   | --> |  Semantic  | --> |  Context  |
| Query  |     | Embedding |     |   Search   |     | Assembly  |
+--------+     +-----------+     +------------+     +-----------+
                                      |                   |
                     +----------------+       +-----------v-----------+
                     |                        |   Claude Generation   |
              +------v------+                 |   with Citations      |
              |  pgvector   |                 +-----------+-----------+
              |  Database   |                             |
              +-------------+                 +-----------v-----------+
                                              |  Answer + Sources    |
                                              +----------------------+

Content Ingestion Flow:
+--------+     +-----------+     +------------+     +-----------+
|  Page  | --> |  Chunker  | --> |  Embedder  | --> | pgvector  |
| Update |     |           |     | (Claude)   |     |  Storage  |
+--------+     +-----------+     +------------+     +-----------+
```

### Chunking Strategy

Documentation content requires intelligent chunking that preserves semantic meaning:

```typescript
// lib/ai/chunker.ts
interface Chunk {
  id: string;
  pageId: string;
  blockId?: string;
  content: string;
  metadata: {
    title: string;
    path: string;          // org/collection/space/page
    headings: string[];    // Hierarchical heading context
    blockType: string;
    position: number;
  };
}

interface ChunkingConfig {
  maxChunkSize: number;      // 1000 tokens
  minChunkSize: number;      // 100 tokens
  overlapSize: number;       // 100 tokens
  respectBoundaries: boolean; // Don't split mid-sentence
}

const DEFAULT_CONFIG: ChunkingConfig = {
  maxChunkSize: 1000,
  minChunkSize: 100,
  overlapSize: 100,
  respectBoundaries: true,
};

export function chunkDocument(page: Page, blocks: Block[], config = DEFAULT_CONFIG): Chunk[] {
  const chunks: Chunk[] = [];
  let currentHeadings: string[] = [page.title];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const block of blocks) {
    // Track heading hierarchy for context
    if (block.type === 'heading') {
      const level = block.content.level;
      currentHeadings = currentHeadings.slice(0, level);
      currentHeadings[level] = block.content.text;
    }

    const blockText = serializeBlock(block);
    const blockTokens = estimateTokens(blockText);

    // Check if adding this block would exceed max size
    if (currentTokens + blockTokens > config.maxChunkSize && currentTokens >= config.minChunkSize) {
      // Save current chunk
      chunks.push(createChunk(page, currentChunk, currentHeadings, block));

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, config.overlapSize);
      currentChunk = overlapText ? [overlapText] : [];
      currentTokens = estimateTokens(overlapText);
    }

    currentChunk.push(blockText);
    currentTokens += blockTokens;
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(createChunk(page, currentChunk, currentHeadings, null));
  }

  return chunks;
}
```

### Embedding Generation

```typescript
// lib/ai/embedder.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Use Claude's embedding endpoint (or OpenAI ada-002 as fallback)
  // Note: As of 2025, Claude has native embedding support
  const response = await anthropic.embeddings.create({
    model: 'claude-3-embed-20240101',
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    model: response.model,
    tokenCount: response.usage.total_tokens,
  };
}

// Batch embedding for efficiency
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  // Process in batches of 100 to respect rate limits
  const BATCH_SIZE = 100;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await anthropic.embeddings.create({
      model: 'claude-3-embed-20240101',
      input: batch,
    });

    results.push(...response.data.map((d, idx) => ({
      embedding: d.embedding,
      model: response.model,
      tokenCount: response.usage.total_tokens / batch.length,
    })));

    // Rate limiting delay
    if (i + BATCH_SIZE < texts.length) {
      await sleep(100);
    }
  }

  return results;
}
```

### Vector Search Implementation

```typescript
// lib/ai/search.ts
import { db } from '../db';
import { embeddings, pages, spaces, collections } from '../schema';
import { sql, cosineDistance, desc } from 'drizzle-orm';

interface SearchResult {
  pageId: string;
  blockId?: string;
  content: string;
  score: number;
  metadata: {
    title: string;
    path: string;
    url: string;
  };
}

interface SearchOptions {
  organizationId: string;
  collectionId?: string;
  spaceId?: string;
  limit?: number;
  minScore?: number;
}

export async function semanticSearch(
  query: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const { organizationId, collectionId, spaceId, limit = 10, minScore = 0.7 } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Build search query with organization scoping
  const results = await db
    .select({
      pageId: embeddings.pageId,
      blockId: embeddings.blockId,
      content: embeddings.contentPreview,
      score: sql<number>`1 - (${embeddings.embedding} <=> ${sql.raw(`'[${queryEmbedding.embedding.join(',')}]'::vector`)})`,
      title: pages.title,
      slug: pages.slug,
      spaceSlug: spaces.slug,
      collectionSlug: collections.slug,
    })
    .from(embeddings)
    .innerJoin(pages, eq(embeddings.pageId, pages.id))
    .innerJoin(spaces, eq(pages.spaceId, spaces.id))
    .innerJoin(collections, eq(spaces.collectionId, collections.id))
    .where(
      and(
        eq(collections.organizationId, organizationId),
        collectionId ? eq(collections.id, collectionId) : undefined,
        spaceId ? eq(spaces.id, spaceId) : undefined,
        sql`1 - (${embeddings.embedding} <=> ${sql.raw(`'[${queryEmbedding.embedding.join(',')}]'::vector`)}) >= ${minScore}`
      )
    )
    .orderBy(desc(sql`1 - (${embeddings.embedding} <=> ${sql.raw(`'[${queryEmbedding.embedding.join(',')}]'::vector`)})`))
    .limit(limit);

  return results.map(r => ({
    pageId: r.pageId,
    blockId: r.blockId,
    content: r.content,
    score: r.score,
    metadata: {
      title: r.title,
      path: `${r.collectionSlug}/${r.spaceSlug}/${r.slug}`,
      url: `/${r.collectionSlug}/${r.spaceSlug}/${r.slug}`,
    },
  }));
}
```

### RAG Answer Generation

```typescript
// lib/ai/rag.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface RAGRequest {
  question: string;
  organizationId: string;
  collectionId?: string;
  conversationHistory?: Message[];
}

interface RAGResponse {
  answer: string;
  sources: Source[];
  confidence: number;
  followUpQuestions: string[];
}

interface Source {
  pageId: string;
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
}

export async function generateRAGAnswer(request: RAGRequest): Promise<RAGResponse> {
  const { question, organizationId, collectionId, conversationHistory = [] } = request;

  // Step 1: Retrieve relevant context
  const searchResults = await semanticSearch(question, {
    organizationId,
    collectionId,
    limit: 5,
    minScore: 0.65,
  });

  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find relevant information in the documentation to answer your question. Could you rephrase or ask about a different topic?",
      sources: [],
      confidence: 0,
      followUpQuestions: [],
    };
  }

  // Step 2: Build context from search results
  const context = buildContext(searchResults);

  // Step 3: Generate answer with Claude
  const systemPrompt = `You are a helpful documentation assistant for foohut.
Answer questions based ONLY on the provided context.
Always cite your sources using [Source N] notation.
If the context doesn't contain enough information, say so.
Be concise but thorough.`;

  const userPrompt = `Context from documentation:
${context}

---

User question: ${question}

Provide a helpful answer based on the context above. Include [Source N] citations for each fact.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: 'user', content: userPrompt },
    ],
  });

  const answer = response.content[0].type === 'text' ? response.content[0].text : '';

  // Step 4: Extract cited sources and generate follow-ups
  const citedSources = extractCitedSources(answer, searchResults);
  const followUps = await generateFollowUpQuestions(question, answer, searchResults);

  // Calculate confidence based on source relevance
  const avgScore = searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;

  return {
    answer,
    sources: citedSources,
    confidence: avgScore,
    followUpQuestions: followUps,
  };
}

function buildContext(results: SearchResult[]): string {
  return results
    .map((r, idx) => `[Source ${idx + 1}] "${r.metadata.title}" (${r.metadata.url}):\n${r.content}`)
    .join('\n\n---\n\n');
}

function extractCitedSources(answer: string, results: SearchResult[]): Source[] {
  const citedIndices = new Set<number>();
  const citations = answer.matchAll(/\[Source (\d+)\]/g);

  for (const match of citations) {
    citedIndices.add(parseInt(match[1]) - 1);
  }

  return Array.from(citedIndices)
    .filter(idx => idx >= 0 && idx < results.length)
    .map(idx => ({
      pageId: results[idx].pageId,
      title: results[idx].metadata.title,
      url: results[idx].metadata.url,
      snippet: results[idx].content.slice(0, 200) + '...',
      relevanceScore: results[idx].score,
    }));
}

async function generateFollowUpQuestions(
  originalQuestion: string,
  answer: string,
  context: SearchResult[]
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Based on this Q&A:
Question: ${originalQuestion}
Answer: ${answer}

Generate 3 brief follow-up questions the user might want to ask. Return as JSON array of strings.`,
    }],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    return JSON.parse(text);
  } catch {
    return [];
  }
}
```

### Embedding Pipeline (Background Processing)

```typescript
// jobs/embedding-pipeline.ts
import { Queue, Worker } from 'bullmq';
import { db } from '../db';
import { pages, blocks, embeddings } from '../schema';

const embeddingQueue = new Queue('embeddings', {
  connection: redis,
});

// Trigger embedding on page update
export async function queuePageForEmbedding(pageId: string) {
  await embeddingQueue.add('embed-page', { pageId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  });
}

// Worker processes embedding jobs
const embeddingWorker = new Worker('embeddings', async (job) => {
  const { pageId } = job.data;

  // Load page and blocks
  const page = await db.query.pages.findFirst({
    where: eq(pages.id, pageId),
    with: { blocks: true, space: { with: { collection: true } } },
  });

  if (!page) return;

  // Generate chunks
  const chunks = chunkDocument(page, page.blocks);

  // Delete old embeddings for this page
  await db.delete(embeddings).where(eq(embeddings.pageId, pageId));

  // Generate new embeddings in batches
  const texts = chunks.map(c => c.content);
  const embeddingResults = await generateEmbeddings(texts);

  // Store embeddings
  const embeddingRows = chunks.map((chunk, idx) => ({
    pageId: chunk.pageId,
    blockId: chunk.blockId,
    contentHash: hash(chunk.content),
    embedding: embeddingResults[idx].embedding,
    contentPreview: chunk.content.slice(0, 500),
    metadata: chunk.metadata,
  }));

  await db.insert(embeddings).values(embeddingRows);

  job.updateProgress(100);
}, { connection: redis, concurrency: 5 });
```

### API Endpoints

```typescript
// routes/ai.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware';
import { semanticSearch, generateRAGAnswer } from '../lib/ai';

const router = Router();

// Semantic search endpoint
router.get(
  '/organizations/:orgId/search',
  authenticate,
  authorize('collection:view'),
  async (req, res) => {
    const { q, collection, space, limit = 10 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    const results = await semanticSearch(q, {
      organizationId: req.params.orgId,
      collectionId: collection as string,
      spaceId: space as string,
      limit: Math.min(parseInt(limit as string) || 10, 50),
    });

    res.json({ results });
  }
);

// AI Q&A endpoint
router.post(
  '/organizations/:orgId/ai/ask',
  authenticate,
  authorize('collection:view'),
  async (req, res) => {
    const { question, collectionId, conversationHistory } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await generateRAGAnswer({
      question,
      organizationId: req.params.orgId,
      collectionId,
      conversationHistory,
    });

    // Log for analytics
    await logAIQuery({
      organizationId: req.params.orgId,
      userId: req.user.id,
      question,
      sourcesUsed: response.sources.length,
      confidence: response.confidence,
    });

    res.json(response);
  }
);
```

## Consequences

### Positive
- **Accurate Answers**: RAG grounds responses in actual documentation
- **Transparency**: Source citations allow verification
- **Flexibility**: Chunking strategy optimized for documentation structure
- **Cost Efficiency**: pgvector eliminates need for external vector DB
- **Scalability**: Background processing handles embedding generation

### Negative
- **Latency**: RAG adds ~500-1000ms to query response time
- **Storage Costs**: Embeddings require ~6KB per chunk (1536 dimensions * 4 bytes)
- **Stale Data**: Embedding lag during high-volume updates
- **Token Costs**: Embedding + generation costs per query

### Mitigations
- Implement caching for frequent queries
- Use streaming responses for perceived latency improvement
- Prioritize embedding queue for recently accessed pages
- Set up cost monitoring and quotas per organization

## Technical Details

### Cost Estimation
```
Per 1,000 pages (avg 5 chunks each):
- Embeddings: 5,000 chunks * $0.0001 = $0.50
- Storage: 5,000 * 6KB = 30MB

Per 1,000 queries:
- Query embedding: 1,000 * $0.0001 = $0.10
- Generation (claude-sonnet-4-20250514): 1,000 * ~500 tokens * $0.003 = $1.50
- Total: ~$1.60 per 1,000 queries
```

### Performance Targets
| Operation | Target | Actual (p95) |
|-----------|--------|--------------|
| Query embedding | < 100ms | ~80ms |
| Vector search | < 100ms | ~50ms |
| Answer generation | < 3s | ~2s |
| Full RAG pipeline | < 4s | ~3s |
| Embedding generation (per page) | < 2s | ~1.5s |

### Monitoring & Observability
```typescript
// lib/ai/metrics.ts
interface AIMetrics {
  queryLatency: Histogram;
  embeddingLatency: Histogram;
  searchResultCount: Histogram;
  confidenceScore: Histogram;
  tokensUsed: Counter;
  errors: Counter;
}

// Track in DataDog/Prometheus
export function trackRAGQuery(metrics: {
  latencyMs: number;
  resultCount: number;
  confidence: number;
  tokensUsed: number;
  success: boolean;
}) {
  aiMetrics.queryLatency.observe(metrics.latencyMs);
  aiMetrics.searchResultCount.observe(metrics.resultCount);
  aiMetrics.confidenceScore.observe(metrics.confidence);
  aiMetrics.tokensUsed.inc(metrics.tokensUsed);
  if (!metrics.success) aiMetrics.errors.inc();
}
```

## References
- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [RAG Best Practices](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Chunking Strategies for RAG](https://www.llamaindex.ai/blog/evaluating-the-ideal-chunk-size-for-a-rag-system-using-llamaindex-6207e5d3fec5)
