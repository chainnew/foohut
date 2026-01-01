/**
 * Embedding Service
 * Handles content chunking, embedding generation, and Vectorize indexing
 */

import { Env, EmbeddingResponse } from '../types';

/**
 * Estimate token count for text (rough approximation: ~4 chars per token)
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into sentences for better chunking
 * @param text - Text to split
 * @returns Array of sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the delimiter
  const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/g;
  const sentences = text.split(sentencePattern).filter(s => s.trim().length > 0);
  return sentences;
}

/**
 * Split text into paragraphs
 * @param text - Text to split
 * @returns Array of paragraphs
 */
function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0);
}

/**
 * Chunk content into segments of approximately maxTokens tokens
 * Uses semantic boundaries (paragraphs, sentences) when possible
 *
 * @param text - Text content to chunk
 * @param maxTokens - Maximum tokens per chunk (default: 500)
 * @returns Array of text chunks
 */
export function chunkContent(text: string, maxTokens: number = 500): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.trim();
  const totalTokens = estimateTokens(cleanedText);

  // If text fits in a single chunk, return as-is
  if (totalTokens <= maxTokens) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  const maxChars = maxTokens * 4; // Approximate chars per token

  // First, try to split by paragraphs
  const paragraphs = splitIntoParagraphs(cleanedText);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If this paragraph alone exceeds maxTokens, split it by sentences
    if (paragraphTokens > maxTokens) {
      // Save current chunk if not empty
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Split paragraph by sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceChunk = '';

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        // If sentence alone exceeds maxTokens, split by character limit
        if (sentenceTokens > maxTokens) {
          if (sentenceChunk.trim()) {
            chunks.push(sentenceChunk.trim());
            sentenceChunk = '';
          }
          // Split long sentence into fixed-size chunks
          for (let i = 0; i < sentence.length; i += maxChars) {
            const part = sentence.slice(i, i + maxChars).trim();
            if (part) {
              chunks.push(part);
            }
          }
        } else if (estimateTokens(sentenceChunk + ' ' + sentence) > maxTokens) {
          // Adding this sentence would exceed limit
          if (sentenceChunk.trim()) {
            chunks.push(sentenceChunk.trim());
          }
          sentenceChunk = sentence;
        } else {
          // Add sentence to current sentence chunk
          sentenceChunk = sentenceChunk ? sentenceChunk + ' ' + sentence : sentence;
        }
      }

      // Save remaining sentence chunk
      if (sentenceChunk.trim()) {
        currentChunk = sentenceChunk;
      }
    } else if (estimateTokens(currentChunk + '\n\n' + paragraph) > maxTokens) {
      // Adding this paragraph would exceed limit
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      // Add paragraph to current chunk
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    }
  }

  // Save final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate embedding using Workers AI (bge-base-en-v1.5)
 *
 * @param ai - Workers AI binding
 * @param text - Text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
  // Truncate text if too long (model has input limits)
  const truncatedText = text.slice(0, 8000);

  const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: [truncatedText]
  }) as EmbeddingResponse;

  if (!result.data || !result.data[0]) {
    throw new Error('Failed to generate embedding: empty response from AI');
  }

  return result.data[0];
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param ai - Workers AI binding
 * @param texts - Array of texts to embed
 * @returns Array of 768-dimensional embedding vectors
 */
export async function generateEmbeddings(ai: Ai, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Truncate each text
  const truncatedTexts = texts.map(t => t.slice(0, 8000));

  const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: truncatedTexts
  }) as EmbeddingResponse;

  if (!result.data) {
    throw new Error('Failed to generate embeddings: empty response from AI');
  }

  return result.data;
}

/**
 * Index a page's content in Vectorize
 * Chunks the content, generates embeddings for each chunk, and upserts to Vectorize
 *
 * @param env - Environment bindings
 * @param pageId - Unique page identifier
 * @param content - Full text content of the page
 * @param metadata - Additional metadata (title, spaceId, etc.)
 */
export async function indexPage(
  env: Env,
  pageId: string,
  content: string,
  metadata: {
    title: string;
    spaceId?: string;
    collectionId?: string;
    path?: string;
    [key: string]: string | undefined;
  }
): Promise<{ chunksIndexed: number }> {
  // First, delete any existing embeddings for this page
  await deletePageEmbeddings(env, pageId);

  // Chunk the content
  const chunks = chunkContent(content, 500);

  if (chunks.length === 0) {
    return { chunksIndexed: 0 };
  }

  // Generate embeddings for all chunks in batch
  const embeddings = await generateEmbeddings(env.AI, chunks);

  // Prepare vectors for upsert
  const vectors = chunks.map((chunk, index) => ({
    id: `${pageId}-chunk-${index}`,
    values: embeddings[index],
    metadata: {
      pageId,
      chunkIndex: String(index),
      totalChunks: String(chunks.length),
      title: metadata.title || '',
      content: chunk.slice(0, 2000), // Store truncated content for display
      spaceId: metadata.spaceId || '',
      collectionId: metadata.collectionId || '',
      path: metadata.path || '',
      ...Object.fromEntries(
        Object.entries(metadata)
          .filter(([key, value]) => value !== undefined && !['title', 'spaceId', 'collectionId', 'path'].includes(key))
          .map(([key, value]) => [key, String(value)])
      )
    }
  }));

  // Upsert to Vectorize in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await env.VECTORIZE.upsert(batch);
  }

  return { chunksIndexed: chunks.length };
}

/**
 * Delete all embeddings for a page from Vectorize
 *
 * @param env - Environment bindings
 * @param pageId - Page identifier to delete embeddings for
 */
export async function deletePageEmbeddings(env: Env, pageId: string): Promise<void> {
  // We need to find and delete all chunk IDs for this page
  // Since Vectorize doesn't support filter-based deletion, we need to know the IDs

  // Strategy: Query with a dummy embedding to find all chunks for this page
  // Then delete by IDs

  try {
    // Create a zero vector for querying (768 dimensions for bge-base-en-v1.5)
    const dummyVector = new Array(768).fill(0);

    // Query to find chunks belonging to this page
    const results = await env.VECTORIZE.query(dummyVector, {
      topK: 1000, // Get up to 1000 chunks
      returnMetadata: 'all',
      filter: { pageId }
    });

    if (results.matches && results.matches.length > 0) {
      const idsToDelete = results.matches.map(m => m.id);
      await env.VECTORIZE.deleteByIds(idsToDelete);
    }
  } catch (error) {
    // If filter doesn't work, try pattern-based deletion
    // This is a fallback approach
    const maxChunks = 100; // Assume max 100 chunks per page
    const idsToDelete: string[] = [];

    for (let i = 0; i < maxChunks; i++) {
      idsToDelete.push(`${pageId}-chunk-${i}`);
    }

    // Also try the legacy single-embedding format
    idsToDelete.push(pageId);

    try {
      await env.VECTORIZE.deleteByIds(idsToDelete);
    } catch {
      // Ignore errors from non-existent IDs
    }
  }
}

/**
 * Re-index multiple pages efficiently
 *
 * @param env - Environment bindings
 * @param pages - Array of pages to index
 * @returns Summary of indexing operation
 */
export async function indexPages(
  env: Env,
  pages: Array<{
    pageId: string;
    content: string;
    metadata: {
      title: string;
      spaceId?: string;
      collectionId?: string;
      path?: string;
      [key: string]: string | undefined;
    };
  }>
): Promise<{ pagesIndexed: number; totalChunks: number }> {
  let totalChunks = 0;

  // Process pages sequentially to avoid rate limits
  for (const page of pages) {
    const result = await indexPage(env, page.pageId, page.content, page.metadata);
    totalChunks += result.chunksIndexed;
  }

  return {
    pagesIndexed: pages.length,
    totalChunks
  };
}

/**
 * Extract plain text from block content
 * Recursively processes nested blocks
 *
 * @param blocks - Array of block objects
 * @returns Concatenated plain text content
 */
export function extractTextFromBlocks(blocks: Array<{
  blockType: string;
  content: unknown;
  children?: Array<unknown>;
}>): string {
  const textParts: string[] = [];

  for (const block of blocks) {
    const content = block.content as Record<string, unknown>;

    // Extract text based on block type
    switch (block.blockType) {
      case 'paragraph':
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
      case 'heading_4':
      case 'heading_5':
      case 'heading_6':
      case 'blockquote':
        if (content.text) {
          textParts.push(String(content.text));
        }
        break;

      case 'code_block':
        if (content.code) {
          textParts.push(String(content.code));
        }
        break;

      case 'hint_info':
      case 'hint_warning':
      case 'hint_danger':
      case 'hint_success':
        if (content.text) {
          textParts.push(String(content.text));
        }
        break;

      case 'toggle':
        if (content.title) {
          textParts.push(String(content.title));
        }
        if (content.content) {
          textParts.push(String(content.content));
        }
        break;

      case 'table':
        if (Array.isArray(content.rows)) {
          for (const row of content.rows as Array<{ cells: Array<string> }>) {
            if (Array.isArray(row.cells)) {
              textParts.push(row.cells.join(' '));
            }
          }
        }
        break;

      default:
        // Try to extract any text-like content
        if (content.text) {
          textParts.push(String(content.text));
        }
        if (content.content && typeof content.content === 'string') {
          textParts.push(content.content);
        }
    }

    // Process nested children if present
    if (block.children && Array.isArray(block.children)) {
      const childText = extractTextFromBlocks(
        block.children as Array<{ blockType: string; content: unknown; children?: Array<unknown> }>
      );
      if (childText) {
        textParts.push(childText);
      }
    }
  }

  return textParts.join('\n\n');
}
