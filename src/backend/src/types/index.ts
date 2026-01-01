/**
 * Type definitions for foohut.com backend API
 */

import type { Request } from 'express';

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: Session;
}

// ============================================================================
// Organization Types
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  ownerId: string;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  defaultVisibility: 'public' | 'private' | 'internal';
  allowPublicPages: boolean;
  aiEnabled: boolean;
  maxMembers: number;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  description?: string;
};

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

// ============================================================================
// Collection Types
// ============================================================================

export interface Collection {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  position: number;
  visibility: 'public' | 'private' | 'internal';
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCollectionInput = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  visibility?: 'public' | 'private' | 'internal';
};

export type UpdateCollectionInput = Partial<CreateCollectionInput>;

// ============================================================================
// Space Types
// ============================================================================

export interface Space {
  id: string;
  collectionId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  position: number;
  visibility: 'public' | 'private' | 'internal';
  settings: SpaceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpaceSettings {
  allowComments: boolean;
  allowReactions: boolean;
  defaultPageTemplate: string | null;
}

export type CreateSpaceInput = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'public' | 'private' | 'internal';
};

export type UpdateSpaceInput = Partial<CreateSpaceInput>;

// ============================================================================
// Page Types
// ============================================================================

export interface Page {
  id: string;
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  content: PageContent;
  contentText: string;
  icon: string | null;
  coverImage: string | null;
  position: number;
  visibility: 'public' | 'private' | 'internal';
  status: 'draft' | 'published' | 'archived';
  createdById: string;
  lastEditedById: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageContent {
  type: 'doc';
  content: PageBlock[];
}

export interface PageBlock {
  type: string;
  content?: PageBlock[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  content: PageContent;
  contentText: string;
  createdById: string;
  createdAt: Date;
  changeDescription: string | null;
}

export type CreatePageInput = {
  title: string;
  slug: string;
  content?: PageContent;
  parentId?: string;
  icon?: string;
  coverImage?: string;
  visibility?: 'public' | 'private' | 'internal';
  status?: 'draft' | 'published';
};

export type UpdatePageInput = Partial<CreatePageInput>;

// ============================================================================
// AI Types
// ============================================================================

export interface AISearchRequest {
  query: string;
  organizationId?: string;
  collectionId?: string;
  spaceId?: string;
  limit?: number;
  threshold?: number;
}

export interface AISearchResult {
  pageId: string;
  title: string;
  excerpt: string;
  score: number;
  highlights: string[];
  path: string;
}

export interface AIGenerateRequest {
  prompt: string;
  context?: string;
  pageId?: string;
  type: 'complete' | 'rewrite' | 'summarize' | 'explain' | 'translate';
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    language?: string;
  };
}

export interface AIGenerateResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface Embedding {
  id: string;
  pageId: string;
  chunkIndex: number;
  chunkText: string;
  embedding: number[];
  createdAt: Date;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;
