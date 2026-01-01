/**
 * Shared TypeScript types for foohut.com
 * Used by both backend and frontend
 */

// ============================================
// Core Entity Types
// ============================================

export type UUID = string;
export type ISO8601 = string;

// User roles in the system
export type UserRole = 'admin' | 'creator' | 'editor' | 'commenter' | 'visitor';

// Publishing modes for spaces
export type PublishMode = 'public' | 'shareable' | 'private' | 'authenticated';

// Change request status
export type ChangeRequestStatus = 'draft' | 'pending_review' | 'approved' | 'merged' | 'rejected';

// ============================================
// User & Authentication
// ============================================

export interface User {
  id: UUID;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: ISO8601;
}

export interface Session {
  user: User;
  tokens: AuthTokens;
}

// ============================================
// Organization Hierarchy (4-tier taxonomy)
// ============================================

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logoUrl?: string;
  settings: OrganizationSettings;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface OrganizationSettings {
  defaultPublishMode: PublishMode;
  allowPublicSpaces: boolean;
  ssoEnabled: boolean;
  ssoProvider?: 'okta' | 'azure_ad' | 'auth0';
}

export interface OrganizationMember {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  role: UserRole;
  user?: User;
  joinedAt: ISO8601;
}

export interface Collection {
  id: UUID;
  organizationId: UUID;
  name: string;
  slug: string;
  description?: string;
  iconEmoji?: string;
  position: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface Space {
  id: UUID;
  collectionId: UUID;
  name: string;
  slug: string;
  description?: string;
  iconEmoji?: string;
  publishMode: PublishMode;
  customDomain?: string;
  gitConfig?: GitSyncConfig;
  position: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

export interface Page {
  id: UUID;
  spaceId: UUID;
  parentId?: UUID;
  title: string;
  slug: string;
  path: string; // Full path including parent slugs
  content: Block[];
  description?: string;
  iconEmoji?: string;
  position: number;
  isPublished: boolean;
  publishedAt?: ISO8601;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ============================================
// Block-based Content
// ============================================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'blockquote'
  | 'table'
  | 'image'
  | 'video'
  | 'embed'
  | 'divider'
  | 'callout'
  | 'math'
  | 'apiEndpoint'
  | 'reusableBlock';

export type CalloutType = 'info' | 'warning' | 'danger' | 'success';

export interface Block {
  id: UUID;
  type: BlockType;
  content: BlockContent;
  children?: Block[];
  attrs?: Record<string, unknown>;
}

export interface BlockContent {
  text?: string;
  marks?: TextMark[];
  language?: string; // For code blocks
  level?: number; // For headings (1-6)
  calloutType?: CalloutType;
  src?: string; // For images/videos
  alt?: string;
  checked?: boolean; // For task items
}

export type TextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; attrs: { href: string; target?: string } }
  | { type: 'highlight'; attrs: { color?: string } };

// ============================================
// Git Synchronization
// ============================================

export interface GitSyncConfig {
  id: UUID;
  spaceId: UUID;
  provider: 'github' | 'gitlab';
  repositoryUrl: string;
  branch: string;
  rootPath: string;
  syncEnabled: boolean;
  lastSyncAt?: ISO8601;
  lastSyncCommit?: string;
  lastSyncStatus: 'success' | 'failed' | 'pending';
  webhookSecret?: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: ISO8601;
}

// ============================================
// Change Requests (Draft workflow)
// ============================================

export interface ChangeRequest {
  id: UUID;
  spaceId: UUID;
  title: string;
  description?: string;
  status: ChangeRequestStatus;
  authorId: UUID;
  author?: User;
  reviewerId?: UUID;
  reviewer?: User;
  changes: PageChange[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
  mergedAt?: ISO8601;
}

export interface PageChange {
  pageId: UUID;
  type: 'create' | 'update' | 'delete';
  beforeContent?: Block[];
  afterContent?: Block[];
}

export interface Comment {
  id: UUID;
  changeRequestId?: UUID;
  pageId?: UUID;
  blockId?: UUID;
  authorId: UUID;
  author?: User;
  content: string;
  resolved: boolean;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ============================================
// AI Features
// ============================================

export interface AISearchQuery {
  query: string;
  spaceIds?: UUID[];
  limit?: number;
  includeSnippets?: boolean;
}

export interface AISearchResult {
  pageId: UUID;
  page?: Page;
  score: number;
  snippet?: string;
  highlights?: string[];
}

export interface AIGenerateRequest {
  prompt: string;
  context?: string;
  pageId?: UUID;
  tone?: 'professional' | 'casual' | 'technical';
  maxLength?: number;
}

export interface AIGenerateResponse {
  content: Block[];
  citations?: string[];
  confidence: number;
}

export interface AIEmbedding {
  id: UUID;
  pageId: UUID;
  blockId?: UUID;
  content: string;
  embedding: number[];
  createdAt: ISO8601;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    cursor?: string;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
}

// ============================================
// Event Types (for real-time updates)
// ============================================

export type EventType =
  | 'page.created'
  | 'page.updated'
  | 'page.deleted'
  | 'page.published'
  | 'changeRequest.created'
  | 'changeRequest.merged'
  | 'comment.created'
  | 'git.synced';

export interface Event<T = unknown> {
  type: EventType;
  payload: T;
  userId: UUID;
  timestamp: ISO8601;
}
