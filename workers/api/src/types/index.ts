/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Storage
  STORAGE: R2Bucket;

  // Vectorize for RAG embeddings
  VECTORIZE: VectorizeIndex;

  // Workers AI
  AI: Ai;

  // Environment variables
  ENVIRONMENT: string;
  OPENROUTER_API_KEY: string;
  OPENROUTER_BASE_URL: string;
  JWT_SECRET: string;

  // Auth0 Configuration
  AUTH0_DOMAIN: string;
  AUTH0_AUDIENCE: string;

  // Legacy Kinde (fallback)
  KINDE_DOMAIN?: string;
  KINDE_AUDIENCE?: string;
}

/**
 * Authenticated user context
 */
export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  is_admin?: boolean;
}

/**
 * Subdomain type
 */
export type SubdomainType = 'main' | 'developer' | 'api' | 'docs' | 'custom';

/**
 * Extended Hono context with auth
 */
export interface Variables {
  user: AuthUser;
  userId: string;
  jwtPayload?: JWTPayload;
  subdomain?: SubdomainType;
  subdomainRaw?: string | null;
  customDomain?: string | null;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Organization member role
 */
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Block type enumeration
 */
export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'todo'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'image'
  | 'video'
  | 'file'
  | 'embed'
  | 'table'
  | 'column_list'
  | 'column';

/**
 * Block content structure
 */
export interface BlockContent {
  type: BlockType;
  text?: string;
  checked?: boolean;
  language?: string;
  url?: string;
  caption?: string;
  children?: BlockContent[];
  properties?: Record<string, unknown>;
}

/**
 * Vectorize match result with metadata
 */
export interface VectorizeMatchWithMetadata {
  id: string;
  score: number;
  metadata?: {
    pageId?: string;
    spaceId?: string;
    title?: string;
    content?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Chat message format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * RAG query result
 */
export interface RAGResult {
  answer: string;
  sources: Array<{
    pageId?: string;
    title?: string;
    score: number;
  }>;
}

/**
 * OpenRouter API response
 */
export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Workers AI embedding response
 */
export interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}
