import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Env, Variables, ChatMessage } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  ragQuery,
  conversationalRAG,
  generateEmbedding,
  storeEmbedding,
  deleteEmbeddings,
  chatCompletion,
  chatCompletionStream,
  summarizeText,
  chat,
  generateContent,
  improveText,
  suggestImprovements,
  generateTitle,
  generateSeoDescription,
  translateContent,
  extractTopics
} from '../services/ai.service';
import {
  indexPage,
  deletePageEmbeddings,
  chunkContent,
  extractTextFromBlocks
} from '../services/embedding.service';
import {
  semanticSearch,
  searchChunks,
  enrichResults,
  hybridSearch
} from '../services/search.service';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * POST /ai/search
 * Semantic search with RAG (Retrieval-Augmented Generation)
 *
 * Request body:
 * - query: string (required) - The search query
 * - spaceId: string (optional) - Filter results to a specific space
 * - topK: number (optional) - Number of documents to retrieve (default: 5)
 * - model: string (optional) - AI model to use for generation
 *
 * Response:
 * - answer: string - AI-generated answer based on context
 * - sources: array - Source documents used for the answer
 */
app.post('/search', requireAuth, async (c) => {
  const body = await c.req.json<{
    query: string;
    spaceId?: string;
    topK?: number;
    model?: string;
  }>();

  if (!body.query || typeof body.query !== 'string') {
    throw new HTTPException(400, { message: 'Query is required' });
  }

  if (body.query.length > 10000) {
    throw new HTTPException(400, { message: 'Query too long (max 10000 characters)' });
  }

  const result = await ragQuery(c.env, body.query, body.spaceId, {
    topK: body.topK,
    model: body.model
  });

  return c.json(result);
});

/**
 * POST /ai/chat
 * Conversational AI with context from documentation
 * Maintains conversation history for multi-turn interactions
 *
 * Request body:
 * - messages: array (required) - Conversation history
 * - spaceId: string (optional) - Filter context to a specific space
 * - stream: boolean (optional) - Enable streaming response
 *
 * Response:
 * - answer: string - AI-generated response
 * - sources: array - Source documents used
 */
app.post('/chat', requireAuth, async (c) => {
  const body = await c.req.json<{
    messages: ChatMessage[];
    spaceId?: string;
    stream?: boolean;
  }>();

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new HTTPException(400, { message: 'Messages array is required' });
  }

  // Validate message format
  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      throw new HTTPException(400, { message: 'Each message must have role and content' });
    }
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      throw new HTTPException(400, { message: 'Invalid message role' });
    }
  }

  // Limit conversation length
  if (body.messages.length > 50) {
    throw new HTTPException(400, { message: 'Too many messages (max 50)' });
  }

  if (body.stream) {
    // Streaming response
    const stream = await chatCompletionStream(c.env, body.messages);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  // Non-streaming response with RAG
  const result = await conversationalRAG(c.env, body.messages, body.spaceId);
  return c.json(result);
});

/**
 * POST /ai/complete
 * Direct chat completion without RAG context
 * For general AI tasks that don't need documentation context
 *
 * Request body:
 * - messages: array (required) - Messages for completion
 * - model: string (optional) - Model to use
 * - temperature: number (optional) - Sampling temperature (0-2)
 * - max_tokens: number (optional) - Maximum response tokens
 *
 * Response:
 * - content: string - Generated response
 */
app.post('/complete', requireAuth, async (c) => {
  const body = await c.req.json<{
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }>();

  if (!body.messages || !Array.isArray(body.messages)) {
    throw new HTTPException(400, { message: 'Messages array is required' });
  }

  const content = await chatCompletion(
    c.env,
    body.messages,
    body.model,
    {
      temperature: body.temperature,
      max_tokens: body.max_tokens
    }
  );

  return c.json({ content });
});

/**
 * POST /ai/embed
 * Embed a document and store in Vectorize
 * Internal use for indexing pages and content
 *
 * Request body:
 * - pageId: string (required) - Unique identifier for the page
 * - content: string (required) - Text content to embed
 * - metadata: object (required) - Metadata to store with the embedding
 *   - title: string (required) - Document title
 *   - spaceId: string (optional) - Space the document belongs to
 *   - [key]: string - Additional metadata fields
 *
 * Response:
 * - success: boolean
 * - pageId: string
 */
app.post('/embed', requireAuth, async (c) => {
  const body = await c.req.json<{
    pageId: string;
    content: string;
    metadata: {
      title: string;
      spaceId?: string;
      [key: string]: string | undefined;
    };
  }>();

  if (!body.pageId || typeof body.pageId !== 'string') {
    throw new HTTPException(400, { message: 'pageId is required' });
  }

  if (!body.content || typeof body.content !== 'string') {
    throw new HTTPException(400, { message: 'content is required' });
  }

  if (!body.metadata || !body.metadata.title) {
    throw new HTTPException(400, { message: 'metadata.title is required' });
  }

  // Truncate content if too long (embedding models have limits)
  const truncatedContent = body.content.slice(0, 8000);

  const embedding = await generateEmbedding(c.env, truncatedContent);

  // Store full metadata including content snippet for retrieval
  const metadata: Record<string, string> = {
    pageId: body.pageId,
    title: body.metadata.title,
    content: truncatedContent.slice(0, 2000), // Store snippet for display
    ...Object.fromEntries(
      Object.entries(body.metadata)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  };

  await storeEmbedding(c.env, body.pageId, embedding, metadata);

  return c.json({
    success: true,
    pageId: body.pageId
  });
});

/**
 * DELETE /ai/embed/:pageId
 * Remove an embedding from Vectorize
 *
 * Path params:
 * - pageId: string - Page ID to remove
 *
 * Response:
 * - success: boolean
 */
app.delete('/embed/:pageId', requireAuth, async (c) => {
  const pageId = c.req.param('pageId');

  if (!pageId) {
    throw new HTTPException(400, { message: 'pageId is required' });
  }

  await deleteEmbeddings(c.env, [pageId]);

  return c.json({ success: true });
});

/**
 * POST /ai/embed/batch
 * Embed multiple documents in batch
 * More efficient for bulk operations
 *
 * Request body:
 * - documents: array (required)
 *   - pageId: string
 *   - content: string
 *   - metadata: object
 *
 * Response:
 * - success: boolean
 * - count: number - Number of documents embedded
 */
app.post('/embed/batch', requireAuth, async (c) => {
  const body = await c.req.json<{
    documents: Array<{
      pageId: string;
      content: string;
      metadata: Record<string, string>;
    }>;
  }>();

  if (!body.documents || !Array.isArray(body.documents)) {
    throw new HTTPException(400, { message: 'documents array is required' });
  }

  if (body.documents.length > 100) {
    throw new HTTPException(400, { message: 'Maximum 100 documents per batch' });
  }

  // Process in parallel but with rate limiting consideration
  const results = await Promise.all(
    body.documents.map(async (doc) => {
      const truncatedContent = doc.content.slice(0, 8000);
      const embedding = await generateEmbedding(c.env, truncatedContent);
      return {
        id: doc.pageId,
        embedding,
        metadata: {
          ...doc.metadata,
          pageId: doc.pageId,
          content: truncatedContent.slice(0, 2000)
        }
      };
    })
  );

  // Batch upsert to Vectorize
  await c.env.VECTORIZE.upsert(
    results.map(r => ({
      id: r.id,
      values: r.embedding,
      metadata: r.metadata
    }))
  );

  return c.json({
    success: true,
    count: results.length
  });
});

/**
 * POST /ai/summarize
 * Summarize text content
 *
 * Request body:
 * - text: string (required) - Text to summarize
 * - maxLength: number (optional) - Target summary length in words
 *
 * Response:
 * - summary: string
 */
app.post('/summarize', requireAuth, async (c) => {
  const body = await c.req.json<{
    text: string;
    maxLength?: number;
  }>();

  if (!body.text || typeof body.text !== 'string') {
    throw new HTTPException(400, { message: 'text is required' });
  }

  if (body.text.length > 50000) {
    throw new HTTPException(400, { message: 'Text too long (max 50000 characters)' });
  }

  const summary = await summarizeText(c.env, body.text, body.maxLength);

  return c.json({ summary });
});

/**
 * POST /ai/generate
 * Generate content based on a prompt
 *
 * Request body:
 * - prompt: string (required) - Generation prompt
 * - context: string (optional) - Additional context to incorporate
 * - style: string (optional) - Writing style: technical, casual, formal, creative
 * - model: string (optional) - Model to use
 * - temperature: number (optional) - Sampling temperature
 *
 * Response:
 * - content: string - Generated content
 */
app.post('/generate', requireAuth, async (c) => {
  const body = await c.req.json<{
    prompt: string;
    context?: string;
    style?: 'technical' | 'casual' | 'formal' | 'creative';
    model?: string;
    temperature?: number;
  }>();

  if (!body.prompt || typeof body.prompt !== 'string') {
    throw new HTTPException(400, { message: 'prompt is required' });
  }

  if (body.prompt.length > 10000) {
    throw new HTTPException(400, { message: 'Prompt too long (max 10000 characters)' });
  }

  const content = await generateContent(c.env, body.prompt, {
    context: body.context,
    style: body.style,
    model: body.model,
    temperature: body.temperature
  });

  return c.json({ content });
});

/**
 * POST /ai/improve
 * Improve or rewrite text based on instructions
 *
 * Request body:
 * - text: string (required) - Original text to improve
 * - instruction: string (required) - What to improve/change
 * - tone: string (optional) - Tone: professional, friendly, technical, simple
 * - preserveFormatting: boolean (optional) - Keep original formatting
 *
 * Response:
 * - text: string - Improved text
 */
app.post('/improve', requireAuth, async (c) => {
  const body = await c.req.json<{
    text: string;
    instruction: string;
    tone?: 'professional' | 'friendly' | 'technical' | 'simple';
    preserveFormatting?: boolean;
  }>();

  if (!body.text || typeof body.text !== 'string') {
    throw new HTTPException(400, { message: 'text is required' });
  }

  if (!body.instruction || typeof body.instruction !== 'string') {
    throw new HTTPException(400, { message: 'instruction is required' });
  }

  if (body.text.length > 50000) {
    throw new HTTPException(400, { message: 'Text too long (max 50000 characters)' });
  }

  const improvedText = await improveText(c.env, body.text, body.instruction, {
    tone: body.tone,
    preserveFormatting: body.preserveFormatting
  });

  return c.json({ text: improvedText });
});

/**
 * POST /ai/suggest
 * Get improvement suggestions for text
 *
 * Request body:
 * - text: string (required) - Text to analyze
 *
 * Response:
 * - suggestions: array - Array of suggestions with type, suggestion, and location
 */
app.post('/suggest', requireAuth, async (c) => {
  const body = await c.req.json<{
    text: string;
  }>();

  if (!body.text || typeof body.text !== 'string') {
    throw new HTTPException(400, { message: 'text is required' });
  }

  if (body.text.length > 50000) {
    throw new HTTPException(400, { message: 'Text too long (max 50000 characters)' });
  }

  const suggestions = await suggestImprovements(c.env, body.text);

  return c.json({ suggestions });
});

/**
 * POST /ai/title
 * Generate a title for content
 *
 * Request body:
 * - content: string (required) - Content to generate title for
 *
 * Response:
 * - title: string - Generated title
 */
app.post('/title', requireAuth, async (c) => {
  const body = await c.req.json<{
    content: string;
  }>();

  if (!body.content || typeof body.content !== 'string') {
    throw new HTTPException(400, { message: 'content is required' });
  }

  const title = await generateTitle(c.env, body.content);

  return c.json({ title });
});

/**
 * POST /ai/seo
 * Generate SEO description for content
 *
 * Request body:
 * - content: string (required) - Content to generate description for
 * - title: string (optional) - Page title for context
 *
 * Response:
 * - description: string - SEO description (max 160 chars)
 */
app.post('/seo', requireAuth, async (c) => {
  const body = await c.req.json<{
    content: string;
    title?: string;
  }>();

  if (!body.content || typeof body.content !== 'string') {
    throw new HTTPException(400, { message: 'content is required' });
  }

  const description = await generateSeoDescription(c.env, body.content, body.title);

  return c.json({ description });
});

/**
 * POST /ai/translate
 * Translate content to another language
 *
 * Request body:
 * - content: string (required) - Content to translate
 * - language: string (required) - Target language
 *
 * Response:
 * - content: string - Translated content
 */
app.post('/translate', requireAuth, async (c) => {
  const body = await c.req.json<{
    content: string;
    language: string;
  }>();

  if (!body.content || typeof body.content !== 'string') {
    throw new HTTPException(400, { message: 'content is required' });
  }

  if (!body.language || typeof body.language !== 'string') {
    throw new HTTPException(400, { message: 'language is required' });
  }

  if (body.content.length > 50000) {
    throw new HTTPException(400, { message: 'Content too long (max 50000 characters)' });
  }

  const translated = await translateContent(c.env, body.content, body.language);

  return c.json({ content: translated });
});

/**
 * POST /ai/topics
 * Extract key topics/tags from content
 *
 * Request body:
 * - content: string (required) - Content to analyze
 *
 * Response:
 * - topics: string[] - Array of extracted topics
 */
app.post('/topics', requireAuth, async (c) => {
  const body = await c.req.json<{
    content: string;
  }>();

  if (!body.content || typeof body.content !== 'string') {
    throw new HTTPException(400, { message: 'content is required' });
  }

  const topics = await extractTopics(c.env, body.content);

  return c.json({ topics });
});

/**
 * POST /ai/index
 * Index a page for semantic search (alternative to /ai/embed with chunking)
 *
 * Request body:
 * - pageId: string (required) - Page ID
 * - content: string (required) - Page content (plain text or blocks)
 * - blocks: array (optional) - Block content to extract text from
 * - metadata: object (required)
 *   - title: string (required)
 *   - spaceId: string (optional)
 *   - collectionId: string (optional)
 *   - path: string (optional)
 *
 * Response:
 * - success: boolean
 * - chunksIndexed: number
 */
app.post('/index', requireAuth, async (c) => {
  const body = await c.req.json<{
    pageId: string;
    content?: string;
    blocks?: Array<{ blockType: string; content: unknown; children?: Array<unknown> }>;
    metadata: {
      title: string;
      spaceId?: string;
      collectionId?: string;
      path?: string;
    };
  }>();

  if (!body.pageId || typeof body.pageId !== 'string') {
    throw new HTTPException(400, { message: 'pageId is required' });
  }

  if (!body.metadata?.title) {
    throw new HTTPException(400, { message: 'metadata.title is required' });
  }

  // Get content from either direct text or block extraction
  let content = body.content || '';
  if (!content && body.blocks && Array.isArray(body.blocks)) {
    content = extractTextFromBlocks(body.blocks);
  }

  if (!content) {
    throw new HTTPException(400, { message: 'content or blocks is required' });
  }

  const result = await indexPage(c.env, body.pageId, content, body.metadata);

  return c.json({
    success: true,
    pageId: body.pageId,
    chunksIndexed: result.chunksIndexed
  });
});

/**
 * DELETE /ai/index/:pageId
 * Remove a page from the search index
 */
app.delete('/index/:pageId', requireAuth, async (c) => {
  const pageId = c.req.param('pageId');

  if (!pageId) {
    throw new HTTPException(400, { message: 'pageId is required' });
  }

  await deletePageEmbeddings(c.env, pageId);

  return c.json({ success: true });
});

/**
 * POST /ai/semantic-search
 * Advanced semantic search with result enrichment
 *
 * Request body:
 * - query: string (required) - Search query
 * - spaceId: string (optional) - Filter by space
 * - collectionId: string (optional) - Filter by collection
 * - limit: number (optional) - Max results (default: 10)
 * - enrich: boolean (optional) - Include full page data (default: false)
 * - hybrid: boolean (optional) - Use hybrid search (default: false)
 *
 * Response:
 * - results: array - Search results with scores
 */
app.post('/semantic-search', requireAuth, async (c) => {
  const body = await c.req.json<{
    query: string;
    spaceId?: string;
    collectionId?: string;
    limit?: number;
    enrich?: boolean;
    hybrid?: boolean;
  }>();

  if (!body.query || typeof body.query !== 'string') {
    throw new HTTPException(400, { message: 'query is required' });
  }

  const options = {
    spaceId: body.spaceId,
    collectionId: body.collectionId,
    limit: body.limit || 10
  };

  let results;
  if (body.hybrid) {
    results = await hybridSearch(c.env, body.query, options);
  } else if (body.enrich) {
    const searchResults = await semanticSearch(c.env, body.query, options);
    results = await enrichResults(c.env, searchResults);
  } else {
    results = await semanticSearch(c.env, body.query, options);
  }

  return c.json({ results });
});

/**
 * POST /ai/chunks
 * Search for relevant content chunks (for RAG context)
 *
 * Request body:
 * - query: string (required) - Search query
 * - spaceId: string (optional) - Filter by space
 * - limit: number (optional) - Max results (default: 10)
 *
 * Response:
 * - chunks: array - Matching chunks with content and scores
 */
app.post('/chunks', requireAuth, async (c) => {
  const body = await c.req.json<{
    query: string;
    spaceId?: string;
    limit?: number;
  }>();

  if (!body.query || typeof body.query !== 'string') {
    throw new HTTPException(400, { message: 'query is required' });
  }

  const chunks = await searchChunks(c.env, body.query, {
    spaceId: body.spaceId,
    limit: body.limit || 10
  });

  return c.json({ chunks });
});

export default app;
