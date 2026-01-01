// Core Entity Types - Shared between frontend and backend

// =============================================================================
// ENUMS
// =============================================================================

export const UserRole = {
  ADMIN: 'admin',
  CREATOR: 'creator',
  EDITOR: 'editor',
  COMMENTER: 'commenter',
  VISITOR: 'visitor',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PublishMode = {
  PUBLIC: 'public',
  SHAREABLE: 'shareable',
  PRIVATE: 'private',
  AUTHENTICATED: 'authenticated',
} as const;

export type PublishMode = (typeof PublishMode)[keyof typeof PublishMode];

export const ChangeRequestStatus = {
  DRAFT: 'draft',
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const;

export type ChangeRequestStatus = (typeof ChangeRequestStatus)[keyof typeof ChangeRequestStatus];

export const BlockType = {
  PARAGRAPH: 'paragraph',
  HEADING: 'heading',
  CODE: 'code',
  BLOCKQUOTE: 'blockquote',
  LIST: 'list',
  TABLE: 'table',
  IMAGE: 'image',
  VIDEO: 'video',
  EMBED: 'embed',
  HINT: 'hint',
  DIVIDER: 'divider',
  MATH: 'math',
  API_BLOCK: 'api_block',
  REUSABLE: 'reusable',
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export const SyncStatus = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict',
  ERROR: 'error',
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

export const GitProvider = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
} as const;

export type GitProvider = (typeof GitProvider)[keyof typeof GitProvider];

// =============================================================================
// BASE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}

// =============================================================================
// USER & AUTH
// =============================================================================

export interface User extends BaseEntity {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export interface Session extends BaseEntity {
  userId: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

// =============================================================================
// ORGANIZATION
// =============================================================================

export interface Organization extends BaseEntity, SoftDeletable {
  name: string;
  slug: string;
  logoUrl: string | null;
  billingEmail: string | null;
}

export interface OrganizationMember extends BaseEntity {
  organizationId: string;
  userId: string;
  role: UserRole;
}

// =============================================================================
// CONTENT HIERARCHY
// =============================================================================

export interface Collection extends BaseEntity, SoftDeletable {
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string | null;
}

export interface Space extends BaseEntity, SoftDeletable {
  collectionId: string;
  name: string;
  slug: string;
  description: string | null;
  publishMode: PublishMode;
  customDomain: string | null;
  gitEnabled: boolean;
}

export interface Page extends BaseEntity, SoftDeletable {
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  description: string | null;
  iconEmoji: string | null;
  coverImageUrl: string | null;
  position: number;
  isPublished: boolean;
  publishedAt: Date | null;
}

export interface Block extends BaseEntity {
  pageId: string;
  type: BlockType;
  content: Record<string, unknown>;
  position: number;
  parentBlockId: string | null;
}

// =============================================================================
// COLLABORATION
// =============================================================================

export interface ChangeRequest extends BaseEntity {
  spaceId: string;
  authorId: string;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  sourceBranch: string | null;
  targetBranch: string | null;
  mergedAt: Date | null;
  mergedBy: string | null;
}

export interface Comment extends BaseEntity, SoftDeletable {
  changeRequestId: string | null;
  pageId: string | null;
  blockId: string | null;
  authorId: string;
  content: string;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

// =============================================================================
// GIT SYNC
// =============================================================================

export interface GitSyncConfig extends BaseEntity {
  spaceId: string;
  provider: GitProvider;
  repositoryUrl: string;
  branch: string;
  rootPath: string;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  installationId: string | null;
}

// =============================================================================
// AI / SEARCH
// =============================================================================

export interface SearchResult {
  pageId: string;
  pageTitle: string;
  spaceId: string;
  spaceName: string;
  snippet: string;
  score: number;
  highlights: string[];
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SearchResult[];
  timestamp: Date;
}

export interface AIConversation extends BaseEntity {
  spaceId: string;
  userId: string;
  title: string | null;
  messages: AIMessage[];
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// =============================================================================
// API REQUEST TYPES
// =============================================================================

export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  logoUrl?: string;
  billingEmail?: string;
}

export interface CreateCollectionRequest {
  name: string;
  slug?: string;
  description?: string;
  iconEmoji?: string;
}

export interface CreateSpaceRequest {
  name: string;
  slug?: string;
  description?: string;
  publishMode?: PublishMode;
}

export interface CreatePageRequest {
  title: string;
  slug?: string;
  parentId?: string;
  description?: string;
  iconEmoji?: string;
}

export interface UpdatePageRequest {
  title?: string;
  slug?: string;
  description?: string;
  iconEmoji?: string;
  coverImageUrl?: string;
  position?: number;
  blocks?: Block[];
}

export interface SearchRequest {
  query: string;
  spaceId?: string;
  limit?: number;
  includeAIAnswer?: boolean;
}

export interface AIGenerateRequest {
  prompt: string;
  spaceId: string;
  context?: string;
  style?: 'formal' | 'casual' | 'technical';
}
