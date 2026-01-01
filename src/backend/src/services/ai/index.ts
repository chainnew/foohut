/**
 * AI Services Module
 * Exports all AI-related services for foohut.com
 */

export { llmProvider, LLMProviderService } from './llm-provider';
export type {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from './llm-provider';

// Re-export from other AI services (to be implemented)
// export { ragService } from './rag';
// export { searchService } from './search';
// export { embeddingService } from './embeddings';
