/**
 * RAG (Retrieval-Augmented Generation) Service
 * Implements semantic search and AI-powered content retrieval for foohut.com
 */

import { llmProvider, LLMMessage } from './llm-provider';
import { config } from '../../config';
import { logger } from '../../index';
import type { AISearchQuery, AISearchResult, Block } from '@foohut/shared';

// ============================================
// Types
// ============================================

interface RetrievedContext {
  pageId: string;
  pageTitle: string;
  pagePath: string;
  content: string;
  score: number;
}

interface RAGResponse {
  answer: string;
  sources: RetrievedContext[];
  confidence: number;
}

// ============================================
// RAG Service Class
// ============================================

export class RAGService {
  private readonly maxContextLength = 8000; // Max tokens for context
  private readonly topK = 5; // Number of relevant documents to retrieve

  /**
   * Perform semantic search with RAG
   */
  async search(query: AISearchQuery): Promise<RAGResponse> {
    try {
      // Step 1: Generate embedding for the query
      const queryEmbedding = await this.getQueryEmbedding(query.query);

      // Step 2: Retrieve relevant documents from vector DB
      const relevantDocs = await this.retrieveRelevantDocuments(
        queryEmbedding,
        query.spaceIds,
        query.limit || this.topK
      );

      if (relevantDocs.length === 0) {
        return {
          answer: "I couldn't find any relevant information in the documentation for your query.",
          sources: [],
          confidence: 0,
        };
      }

      // Step 3: Build context from retrieved documents
      const context = this.buildContext(relevantDocs);

      // Step 4: Generate answer using LLM
      const answer = await this.generateAnswer(query.query, context);

      return {
        answer,
        sources: relevantDocs,
        confidence: this.calculateConfidence(relevantDocs),
      };
    } catch (error) {
      logger.error({ error, query }, 'RAG search failed');
      throw error;
    }
  }

  /**
   * Generate embedding for a query
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    const response = await llmProvider.embeddings({
      input: query,
      model: config.embeddingModel,
    });
    return response.embeddings[0];
  }

  /**
   * Retrieve relevant documents using vector similarity search
   * This would use pgvector in production
   */
  private async retrieveRelevantDocuments(
    _queryEmbedding: number[],
    _spaceIds?: string[],
    limit: number = 5
  ): Promise<RetrievedContext[]> {
    // TODO: Implement actual vector search using pgvector
    // This is a placeholder that would be replaced with actual DB queries

    // Example pgvector query:
    // SELECT p.id, p.title, p.path, p.content,
    //        1 - (e.embedding <=> $1) as score
    // FROM pages p
    // JOIN embeddings e ON e.page_id = p.id
    // WHERE p.space_id = ANY($2)
    // ORDER BY e.embedding <=> $1
    // LIMIT $3

    logger.debug({ limit }, 'Retrieving relevant documents');

    // Placeholder return - would come from actual vector search
    return [];
  }

  /**
   * Build context string from retrieved documents
   */
  private buildContext(docs: RetrievedContext[]): string {
    let context = '';
    let tokenCount = 0;

    for (const doc of docs) {
      // Rough token estimation (4 chars per token)
      const docTokens = Math.ceil(doc.content.length / 4);

      if (tokenCount + docTokens > this.maxContextLength) {
        break;
      }

      context += `\n---\nSource: ${doc.pageTitle} (${doc.pagePath})\n${doc.content}\n`;
      tokenCount += docTokens;
    }

    return context;
  }

  /**
   * Generate answer using LLM with retrieved context
   */
  private async generateAnswer(query: string, context: string): Promise<string> {
    const systemPrompt = `You are an AI assistant for foohut.com, a documentation platform.
Your role is to help users find information in their documentation.

IMPORTANT RULES:
1. Only answer based on the provided context from the documentation
2. If the context doesn't contain relevant information, say so honestly
3. Always cite your sources by mentioning the page title/path
4. Be concise and direct in your answers
5. Format code snippets properly with markdown
6. If information is partially available, provide what you can and note what's missing`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Based on the following documentation context, please answer the question.

DOCUMENTATION CONTEXT:
${context}

QUESTION: ${query}

Please provide a helpful, accurate answer based only on the documentation above. If the documentation doesn't contain the answer, say so.`,
      },
    ];

    const response = await llmProvider.completion({
      messages,
      maxTokens: 1500,
      temperature: 0.3, // Lower temperature for more factual responses
    });

    return response.content;
  }

  /**
   * Calculate confidence score based on retrieved documents
   */
  private calculateConfidence(docs: RetrievedContext[]): number {
    if (docs.length === 0) return 0;

    // Average of top document scores
    const avgScore = docs.reduce((sum, doc) => sum + doc.score, 0) / docs.length;

    // Normalize to 0-1 range
    return Math.min(Math.max(avgScore, 0), 1);
  }

  /**
   * Index a page's content for semantic search
   */
  async indexPage(pageId: string, title: string, content: Block[]): Promise<void> {
    try {
      // Convert blocks to plain text
      const textContent = this.blocksToText(content);

      // Split into chunks for embedding (max ~500 tokens each)
      const chunks = this.splitIntoChunks(textContent, 2000);

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        const embedding = await llmProvider.embeddings({
          input: chunk,
          model: config.embeddingModel,
        });

        // TODO: Store embedding in pgvector
        // INSERT INTO embeddings (page_id, content, embedding)
        // VALUES ($1, $2, $3)

        logger.debug({ pageId, chunkLength: chunk.length }, 'Indexed page chunk');
      }

      logger.info({ pageId, title, chunks: chunks.length }, 'Page indexed successfully');
    } catch (error) {
      logger.error({ error, pageId }, 'Failed to index page');
      throw error;
    }
  }

  /**
   * Convert blocks to plain text
   */
  private blocksToText(blocks: Block[]): string {
    let text = '';

    for (const block of blocks) {
      if (block.content.text) {
        text += block.content.text + '\n';
      }

      if (block.children) {
        text += this.blocksToText(block.children);
      }
    }

    return text;
  }

  /**
   * Split text into chunks for embedding
   */
  private splitIntoChunks(text: string, maxChars: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length > maxChars && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

// Singleton instance
export const ragService = new RAGService();
