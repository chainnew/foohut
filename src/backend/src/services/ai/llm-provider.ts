/**
 * LLM Provider Service
 * Supports multiple AI backends: OpenAI, Anthropic, and OpenRouter
 *
 * OpenRouter provides access to 100+ models through a unified API
 */

import { config } from '../../config';
import { logger } from '../../index';

// ============================================
// Types
// ============================================

export type LLMProvider = 'openai' | 'anthropic' | 'openrouter';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  model?: string;
  provider?: LLMProvider;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

export interface LLMCompletionResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface EmbeddingOptions {
  model?: string;
  provider?: LLMProvider;
  input: string | string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: LLMProvider;
  usage: {
    totalTokens: number;
  };
}

// ============================================
// Provider Configurations
// ============================================

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  defaultEmbeddingModel: string;
  headers: Record<string, string>;
}

const getProviderConfig = (provider: LLMProvider): ProviderConfig => {
  switch (provider) {
    case 'openai':
      return {
        baseUrl: config.openaiBaseUrl || 'https://api.openai.com/v1',
        apiKey: config.openaiApiKey || '',
        defaultModel: 'gpt-4-turbo-preview',
        defaultEmbeddingModel: 'text-embedding-3-small',
        headers: {
          'Authorization': `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      };

    case 'anthropic':
      return {
        baseUrl: config.anthropicBaseUrl || 'https://api.anthropic.com/v1',
        apiKey: config.anthropicApiKey || '',
        defaultModel: 'claude-3-opus-20240229',
        defaultEmbeddingModel: '', // Anthropic doesn't have embeddings yet
        headers: {
          'x-api-key': config.anthropicApiKey || '',
          'anthropic-version': '2024-01-01',
          'Content-Type': 'application/json',
        },
      };

    case 'openrouter':
      return {
        baseUrl: config.openrouterBaseUrl || 'https://openrouter.ai/api/v1',
        apiKey: config.openrouterApiKey || '',
        defaultModel: 'anthropic/claude-3-opus',
        defaultEmbeddingModel: 'openai/text-embedding-3-small',
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'HTTP-Referer': config.appUrl || 'https://foohut.com',
          'X-Title': 'foohut.com',
          'Content-Type': 'application/json',
        },
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};

// ============================================
// LLM Provider Class
// ============================================

export class LLMProviderService {
  private defaultProvider: LLMProvider;

  constructor() {
    // Determine default provider based on available API keys
    if (config.openrouterApiKey) {
      this.defaultProvider = 'openrouter';
    } else if (config.anthropicApiKey) {
      this.defaultProvider = 'anthropic';
    } else if (config.openaiApiKey) {
      this.defaultProvider = 'openai';
    } else {
      throw new Error('No LLM API keys configured. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY');
    }

    logger.info({ provider: this.defaultProvider }, 'LLM Provider initialized');
  }

  /**
   * Get chat completion from any provider
   */
  async completion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    const provider = options.provider || this.defaultProvider;
    const providerConfig = getProviderConfig(provider);

    if (!providerConfig.apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`);
    }

    const model = options.model || providerConfig.defaultModel;

    // Handle Anthropic's different API format
    if (provider === 'anthropic') {
      return this.anthropicCompletion(options, providerConfig, model);
    }

    // OpenAI and OpenRouter use the same API format
    return this.openaiStyleCompletion(options, providerConfig, model, provider);
  }

  /**
   * OpenAI-style completion (works for OpenAI and OpenRouter)
   */
  private async openaiStyleCompletion(
    options: LLMCompletionOptions,
    providerConfig: ProviderConfig,
    model: string,
    provider: LLMProvider
  ): Promise<LLMCompletionResponse> {
    const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1,
        stream: options.stream || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`${provider} API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      model: data.model,
      provider,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Anthropic-style completion
   */
  private async anthropicCompletion(
    options: LLMCompletionOptions,
    providerConfig: ProviderConfig,
    model: string
  ): Promise<LLMCompletionResponse> {
    // Extract system message if present
    const systemMessage = options.messages.find(m => m.role === 'system');
    const otherMessages = options.messages.filter(m => m.role !== 'system');

    const response = await fetch(`${providerConfig.baseUrl}/messages`, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || 4096,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 1,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      model: data.model,
      provider: 'anthropic',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      finishReason: data.stop_reason,
    };
  }

  /**
   * Get embeddings from any provider
   */
  async embeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    // Anthropic doesn't have embeddings, use OpenRouter or OpenAI
    const provider = options.provider ||
      (config.openrouterApiKey ? 'openrouter' : 'openai');

    if (provider === 'anthropic') {
      throw new Error('Anthropic does not support embeddings. Use OpenAI or OpenRouter.');
    }

    const providerConfig = getProviderConfig(provider);
    const model = options.model || providerConfig.defaultEmbeddingModel;

    const response = await fetch(`${providerConfig.baseUrl}/embeddings`, {
      method: 'POST',
      headers: providerConfig.headers,
      body: JSON.stringify({
        model,
        input: options.input,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`${provider} embeddings error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      embeddings: data.data.map((d: { embedding: number[] }) => d.embedding),
      model: data.model,
      provider,
      usage: {
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<string[]> {
    if (!config.openrouterApiKey) {
      return [];
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.data.map((m: { id: string }) => m.id);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch OpenRouter models');
      return [];
    }
  }
}

// Singleton instance
export const llmProvider = new LLMProviderService();
