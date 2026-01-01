// ============================================================================
// foohut.com Drizzle Schema - Enums
// PostgreSQL enum types for type-safe database operations
// ============================================================================

import { pgEnum } from 'drizzle-orm/pg-core';

// User roles for RBAC
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'creator',
  'editor',
  'commenter',
  'visitor',
]);

// Publishing visibility modes
export const publishModeEnum = pgEnum('publish_mode', [
  'public',
  'shareable',
  'private',
  'authenticated',
]);

// Change request workflow states
export const changeRequestStatusEnum = pgEnum('change_request_status', [
  'draft',
  'pending_review',
  'in_review',
  'approved',
  'rejected',
  'merged',
  'closed',
]);

// Git synchronization states
export const syncStatusEnum = pgEnum('sync_status', [
  'idle',
  'syncing',
  'success',
  'conflict',
  'error',
]);

// Content block types
export const blockTypeEnum = pgEnum('block_type', [
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'heading_4',
  'heading_5',
  'heading_6',
  'blockquote',
  'code_block',
  'table',
  'hint_info',
  'hint_warning',
  'hint_danger',
  'hint_success',
  'reusable_block',
  'image',
  'video',
  'embed',
  'math',
  'divider',
  'toggle',
  'tabs',
  'api_block',
  'file_attachment',
  'action_button',
]);

// Audit log action types
export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'restore',
  'publish',
  'unpublish',
  'merge',
  'sync',
  'permission_change',
  'login',
  'logout',
]);

// Git provider types
export const gitProviderEnum = pgEnum('git_provider', [
  'github',
  'gitlab',
  'bitbucket',
  'azure_devops',
]);

// API specification format types
export const specFormatEnum = pgEnum('spec_format', [
  'openapi',
  'asyncapi',
  'graphql',
]);

// Embedding model versions
export const embeddingModelEnum = pgEnum('embedding_model', [
  'text-embedding-ada-002',
  'text-embedding-3-small',
  'text-embedding-3-large',
]);
