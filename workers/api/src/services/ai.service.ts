import {
  Env,
  ChatMessage,
  RAGResult,
  OpenRouterResponse,
  EmbeddingResponse,
  VectorizeMatchWithMetadata
} from '../types';

/**
 * Generate embedding using Workers AI (bge-base-en-v1.5 outputs 768 dimensions)
 * @param env - Environment bindings
 * @param text - Text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [text]
  }) as EmbeddingResponse;

  if (!result.data || !result.data[0]) {
    throw new Error('Failed to generate embedding: empty response from AI');
  }

  return result.data[0];
}

/**
 * Generate embeddings for multiple texts in batch
 * @param env - Environment bindings
 * @param texts - Array of texts to embed
 * @returns Array of 768-dimensional embedding vectors
 */
export async function generateEmbeddings(env: Env, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: texts
  }) as EmbeddingResponse;

  if (!result.data) {
    throw new Error('Failed to generate embeddings: empty response from AI');
  }

  return result.data;
}

/**
 * Store embedding in Vectorize
 * @param env - Environment bindings
 * @param id - Unique identifier for the vector
 * @param embedding - 768-dimensional embedding vector
 * @param metadata - Metadata to store with the vector
 */
export async function storeEmbedding(
  env: Env,
  id: string,
  embedding: number[],
  metadata: Record<string, string>
): Promise<void> {
  await env.VECTORIZE.upsert([{
    id,
    values: embedding,
    metadata
  }]);
}

/**
 * Store multiple embeddings in batch
 * @param env - Environment bindings
 * @param vectors - Array of vectors with id, embedding, and metadata
 */
export async function storeEmbeddings(
  env: Env,
  vectors: Array<{
    id: string;
    embedding: number[];
    metadata: Record<string, string>;
  }>
): Promise<void> {
  if (vectors.length === 0) {
    return;
  }

  await env.VECTORIZE.upsert(
    vectors.map(v => ({
      id: v.id,
      values: v.embedding,
      metadata: v.metadata
    }))
  );
}

/**
 * Delete embedding from Vectorize
 * @param env - Environment bindings
 * @param ids - Array of vector IDs to delete
 */
export async function deleteEmbeddings(env: Env, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  await env.VECTORIZE.deleteByIds(ids);
}

/**
 * Query similar documents from Vectorize
 * @param env - Environment bindings
 * @param embedding - Query embedding vector
 * @param topK - Number of results to return (default: 5)
 * @param filter - Optional metadata filter
 * @returns Array of matching vectors with scores and metadata
 */
export async function querySimilar(
  env: Env,
  embedding: number[],
  topK: number = 5,
  filter?: Record<string, string>
): Promise<VectorizeMatchWithMetadata[]> {
  const results = await env.VECTORIZE.query(embedding, {
    topK,
    returnMetadata: 'all',
    filter
  });

  return results.matches as VectorizeMatchWithMetadata[];
}

/**
 * Chat completion using OpenRouter
 * @param env - Environment bindings
 * @param messages - Array of chat messages
 * @param model - Model to use (default: anthropic/claude-3.5-sonnet)
 * @param options - Additional options (temperature, max_tokens, etc.)
 * @returns Generated response content
 */
export async function chatCompletion(
  env: Env,
  messages: ChatMessage[],
  model: string = 'anthropic/claude-3.5-sonnet',
  options: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
  } = {}
): Promise<string> {
  const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://foohut.com',
      'X-Title': 'foohut'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      top_p: options.top_p ?? 1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as OpenRouterResponse;

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Invalid response from OpenRouter API');
  }

  return data.choices[0].message.content;
}

/**
 * Streaming chat completion using OpenRouter
 * @param env - Environment bindings
 * @param messages - Array of chat messages
 * @param model - Model to use
 * @returns ReadableStream for streaming response
 */
export async function chatCompletionStream(
  env: Env,
  messages: ChatMessage[],
  model: string = 'anthropic/claude-3.5-sonnet'
): Promise<ReadableStream> {
  const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://foohut.com',
      'X-Title': 'foohut'
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body from OpenRouter API');
  }

  return response.body;
}

/**
 * RAG: Retrieval-Augmented Generation
 * Searches for similar documents and generates an answer with context
 * @param env - Environment bindings
 * @param query - User's question
 * @param spaceId - Optional space ID to filter results
 * @param options - Additional options
 * @returns Generated answer with source citations
 */
export async function ragQuery(
  env: Env,
  query: string,
  spaceId?: string,
  options: {
    topK?: number;
    model?: string;
    systemPrompt?: string;
  } = {}
): Promise<RAGResult> {
  const {
    topK = 5,
    model = 'anthropic/claude-3.5-sonnet',
    systemPrompt = 'You are a helpful documentation assistant. Answer questions based on the provided context. Always cite your sources by referencing the document titles. If the context does not contain enough information to answer the question, say so clearly.'
  } = options;

  // 1. Generate embedding for query
  const queryEmbedding = await generateEmbedding(env, query);

  // 2. Find similar documents with optional space filter
  const filter = spaceId ? { spaceId } : undefined;
  const matches = await querySimilar(env, queryEmbedding, topK, filter);

  // 3. Build context from matches
  const contextParts = matches
    .filter(m => m.metadata?.content)
    .map((m, idx) => {
      const title = m.metadata?.title || 'Untitled';
      const content = m.metadata?.content || '';
      return `[Document ${idx + 1}: "${title}"]\n${content}`;
    });

  const context = contextParts.join('\n\n---\n\n');

  // 4. Handle case with no matches
  if (contextParts.length === 0) {
    return {
      answer: 'I could not find any relevant documents to answer your question. Please try rephrasing your query or ensure the relevant content has been indexed.',
      sources: []
    };
  }

  // 5. Generate answer with context
  const answer = await chatCompletion(
    env,
    [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\n---\n\nQuestion: ${query}`
      }
    ],
    model
  );

  return {
    answer,
    sources: matches.map(m => ({
      pageId: m.metadata?.pageId,
      title: m.metadata?.title,
      score: m.score
    }))
  };
}

/**
 * Conversational RAG with message history
 * Maintains context across multiple turns
 * @param env - Environment bindings
 * @param messages - Conversation history
 * @param spaceId - Optional space ID to filter results
 * @returns Generated answer with sources
 */
export async function conversationalRAG(
  env: Env,
  messages: ChatMessage[],
  spaceId?: string
): Promise<RAGResult> {
  // Get the last user message for retrieval
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  if (!lastUserMessage) {
    throw new Error('No user message found in conversation');
  }

  // Generate embedding for the last user query
  const queryEmbedding = await generateEmbedding(env, lastUserMessage.content);

  // Find similar documents
  const filter = spaceId ? { spaceId } : undefined;
  const matches = await querySimilar(env, queryEmbedding, 5, filter);

  // Build context
  const context = matches
    .filter(m => m.metadata?.content)
    .map((m, idx) => {
      const title = m.metadata?.title || 'Untitled';
      const content = m.metadata?.content || '';
      return `[Document ${idx + 1}: "${title}"]\n${content}`;
    })
    .join('\n\n---\n\n');

  // Build conversation with context injection
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are a helpful documentation assistant. Answer questions based on the provided context and conversation history. Always cite your sources.

Context from documentation:
${context}`
  };

  // Generate response with full conversation context
  const answer = await chatCompletion(env, [systemMessage, ...messages]);

  return {
    answer,
    sources: matches.map(m => ({
      pageId: m.metadata?.pageId,
      title: m.metadata?.title,
      score: m.score
    }))
  };
}

/**
 * Summarize text using AI
 * @param env - Environment bindings
 * @param text - Text to summarize
 * @param maxLength - Maximum summary length hint
 * @returns Summarized text
 */
export async function summarizeText(
  env: Env,
  text: string,
  maxLength: number = 200
): Promise<string> {
  return chatCompletion(
    env,
    [
      {
        role: 'system',
        content: `You are a summarization assistant. Provide concise summaries in approximately ${maxLength} words or less.`
      },
      {
        role: 'user',
        content: `Please summarize the following text:\n\n${text}`
      }
    ],
    'anthropic/claude-3.5-sonnet',
    { temperature: 0.3 }
  );
}

/**
 * RAG-powered chat with conversation history
 * Retrieves relevant context and generates response with streaming support
 *
 * @param env - Environment bindings
 * @param messages - Conversation history
 * @param options - Chat options
 * @returns Generated response or stream
 */
export async function chat(
  env: Env,
  messages: ChatMessage[],
  options: {
    spaceId?: string;
    stream?: boolean;
    model?: string;
    topK?: number;
  } = {}
): Promise<string | ReadableStream> {
  const {
    spaceId,
    stream = false,
    model = 'anthropic/claude-3-haiku',
    topK = 5
  } = options;

  // Get the last user message for retrieval
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  if (!lastUserMessage) {
    throw new Error('No user message found in conversation');
  }

  // Generate embedding and search for context
  const queryEmbedding = await generateEmbedding(env, lastUserMessage.content);

  // Build filter
  const filter = spaceId ? { spaceId } : undefined;
  const matches = await querySimilar(env, queryEmbedding, topK, filter);

  // Build context from matches
  const contextParts = matches
    .filter(m => m.metadata?.content)
    .map((m, idx) => {
      const title = m.metadata?.title || 'Untitled';
      const content = m.metadata?.content || '';
      return `[${idx + 1}] "${title}"\n${content}`;
    });

  const context = contextParts.length > 0
    ? contextParts.join('\n\n---\n\n')
    : '';

  // Build system message with context
  const systemMessage: ChatMessage = {
    role: 'system',
    content: context
      ? `You are a helpful documentation assistant for foohut.com. Answer questions based on the provided context and conversation history. Cite sources by referencing document titles when applicable.

Relevant documentation:
${context}

If the provided context doesn't contain enough information to answer the question, acknowledge this and provide the best answer you can based on general knowledge.`
      : `You are a helpful assistant for foohut.com. Answer questions to the best of your ability. If you're unsure about something specific to this documentation platform, suggest checking the documentation or asking for clarification.`
  };

  // Prepare messages with context
  const chatMessages = [systemMessage, ...messages];

  if (stream) {
    return chatCompletionStream(env, chatMessages, model);
  }

  return chatCompletion(env, chatMessages, model);
}

/**
 * Generate content based on a prompt with optional context
 *
 * @param env - Environment bindings
 * @param prompt - Generation prompt
 * @param options - Generation options
 * @returns Generated content
 */
export async function generateContent(
  env: Env,
  prompt: string,
  options: {
    context?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    style?: 'technical' | 'casual' | 'formal' | 'creative';
  } = {}
): Promise<string> {
  const {
    context,
    model = 'anthropic/claude-3-haiku',
    temperature = 0.7,
    maxTokens = 2048,
    style = 'technical'
  } = options;

  const styleGuides: Record<string, string> = {
    technical: 'Use clear, precise technical language. Include code examples where appropriate. Structure content with headers and bullet points.',
    casual: 'Write in a friendly, conversational tone. Keep explanations simple and accessible.',
    formal: 'Use professional, formal language. Be thorough and comprehensive.',
    creative: 'Be creative and engaging. Use metaphors and analogies to explain concepts.'
  };

  let systemPrompt = `You are a skilled technical writer for documentation. ${styleGuides[style]}`;

  if (context) {
    systemPrompt += `\n\nContext to incorporate:\n${context}`;
  }

  return chatCompletion(
    env,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    model,
    { temperature, max_tokens: maxTokens }
  );
}

/**
 * Improve or rewrite text based on instructions
 *
 * @param env - Environment bindings
 * @param text - Original text to improve
 * @param instruction - What to improve/change
 * @param options - Improvement options
 * @returns Improved text
 */
export async function improveText(
  env: Env,
  text: string,
  instruction: string,
  options: {
    model?: string;
    preserveFormatting?: boolean;
    tone?: 'professional' | 'friendly' | 'technical' | 'simple';
  } = {}
): Promise<string> {
  const {
    model = 'anthropic/claude-3-haiku',
    preserveFormatting = true,
    tone = 'professional'
  } = options;

  const toneDescriptions: Record<string, string> = {
    professional: 'professional and polished',
    friendly: 'warm and approachable',
    technical: 'precise and technical',
    simple: 'clear and easy to understand'
  };

  let systemPrompt = `You are an expert editor and writer. Your task is to improve text based on specific instructions.

Guidelines:
- Maintain the ${toneDescriptions[tone]} tone
- ${preserveFormatting ? 'Preserve the original formatting (headers, lists, code blocks, etc.)' : 'Feel free to restructure for better readability'}
- Focus on clarity and accuracy
- Return ONLY the improved text, no explanations or meta-commentary`;

  return chatCompletion(
    env,
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Original text:
${text}

Instruction: ${instruction}

Please provide the improved version:`
      }
    ],
    model,
    { temperature: 0.5, max_tokens: 4096 }
  );
}

/**
 * Suggest improvements for text without rewriting
 *
 * @param env - Environment bindings
 * @param text - Text to analyze
 * @returns Array of suggestions
 */
export async function suggestImprovements(
  env: Env,
  text: string
): Promise<Array<{ type: string; suggestion: string; location?: string }>> {
  const response = await chatCompletion(
    env,
    [
      {
        role: 'system',
        content: `You are a documentation quality expert. Analyze the provided text and suggest improvements.

Return a JSON array of suggestions with this structure:
[
  {
    "type": "clarity" | "grammar" | "structure" | "completeness" | "style",
    "suggestion": "Description of the improvement",
    "location": "Optional: where in the text this applies"
  }
]

Limit to 5 most important suggestions. Focus on actionable improvements.`
      },
      {
        role: 'user',
        content: text
      }
    ],
    'anthropic/claude-3-haiku',
    { temperature: 0.3, max_tokens: 1024 }
  );

  try {
    // Parse JSON response
    const suggestions = JSON.parse(response);
    if (Array.isArray(suggestions)) {
      return suggestions;
    }
    return [];
  } catch {
    // If JSON parsing fails, return empty array
    return [];
  }
}

/**
 * Generate a title for content
 *
 * @param env - Environment bindings
 * @param content - Content to generate title for
 * @returns Generated title
 */
export async function generateTitle(env: Env, content: string): Promise<string> {
  const response = await chatCompletion(
    env,
    [
      {
        role: 'system',
        content: 'Generate a concise, descriptive title for the following content. Return only the title, no quotes or extra formatting.'
      },
      {
        role: 'user',
        content: content.slice(0, 2000) // Limit input
      }
    ],
    'anthropic/claude-3-haiku',
    { temperature: 0.3, max_tokens: 50 }
  );

  return response.trim();
}

/**
 * Generate SEO description for content
 *
 * @param env - Environment bindings
 * @param content - Content to generate description for
 * @param title - Page title for context
 * @returns SEO description (max 160 chars)
 */
export async function generateSeoDescription(
  env: Env,
  content: string,
  title?: string
): Promise<string> {
  const response = await chatCompletion(
    env,
    [
      {
        role: 'system',
        content: 'Generate an SEO-optimized meta description (max 160 characters) for the following content. Be concise and include key information. Return only the description.'
      },
      {
        role: 'user',
        content: title
          ? `Title: ${title}\n\nContent:\n${content.slice(0, 2000)}`
          : content.slice(0, 2000)
      }
    ],
    'anthropic/claude-3-haiku',
    { temperature: 0.3, max_tokens: 60 }
  );

  // Ensure max 160 chars
  return response.trim().slice(0, 160);
}

/**
 * Translate content to another language
 *
 * @param env - Environment bindings
 * @param content - Content to translate
 * @param targetLanguage - Target language (e.g., "Spanish", "French", "Japanese")
 * @returns Translated content
 */
export async function translateContent(
  env: Env,
  content: string,
  targetLanguage: string
): Promise<string> {
  return chatCompletion(
    env,
    [
      {
        role: 'system',
        content: `You are a professional translator. Translate the following content to ${targetLanguage}. Preserve all formatting, code blocks, and technical terms. If a term should not be translated (like brand names or technical jargon), keep it in the original language.`
      },
      {
        role: 'user',
        content
      }
    ],
    'anthropic/claude-3.5-sonnet', // Use better model for translation
    { temperature: 0.3, max_tokens: 4096 }
  );
}

/**
 * Extract key topics and tags from content
 *
 * @param env - Environment bindings
 * @param content - Content to analyze
 * @returns Array of topics/tags
 */
export async function extractTopics(env: Env, content: string): Promise<string[]> {
  const response = await chatCompletion(
    env,
    [
      {
        role: 'system',
        content: 'Extract 3-7 key topics or tags from the following content. Return only a JSON array of strings, e.g., ["topic1", "topic2"]. Use lowercase, no special characters.'
      },
      {
        role: 'user',
        content: content.slice(0, 3000)
      }
    ],
    'anthropic/claude-3-haiku',
    { temperature: 0.3, max_tokens: 100 }
  );

  try {
    const topics = JSON.parse(response);
    if (Array.isArray(topics)) {
      return topics.map(t => String(t).toLowerCase().trim()).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}
