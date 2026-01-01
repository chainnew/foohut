import { z } from 'zod';
import {
  MAX_PAGE_TITLE_LENGTH,
  MAX_PAGE_DESCRIPTION_LENGTH,
  MAX_SLUG_LENGTH,
} from './constants';

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

export const slugSchema = z
  .string()
  .min(1)
  .max(MAX_SLUG_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens');

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().max(255);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// AUTH VALIDATORS
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
});

// =============================================================================
// ORGANIZATION VALIDATORS
// =============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema.optional(),
  logoUrl: z.string().url().optional(),
  billingEmail: emailSchema.optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// =============================================================================
// COLLECTION VALIDATORS
// =============================================================================

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  iconEmoji: z.string().max(10).optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

// =============================================================================
// SPACE VALIDATORS
// =============================================================================

export const publishModeSchema = z.enum(['public', 'shareable', 'private', 'authenticated']);

export const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional(),
  publishMode: publishModeSchema.default('private'),
});

export const updateSpaceSchema = createSpaceSchema.partial();

// =============================================================================
// PAGE VALIDATORS
// =============================================================================

export const createPageSchema = z.object({
  title: z.string().min(1).max(MAX_PAGE_TITLE_LENGTH),
  slug: slugSchema.optional(),
  parentId: uuidSchema.optional(),
  description: z.string().max(MAX_PAGE_DESCRIPTION_LENGTH).optional(),
  iconEmoji: z.string().max(10).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(MAX_PAGE_TITLE_LENGTH).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(MAX_PAGE_DESCRIPTION_LENGTH).optional(),
  iconEmoji: z.string().max(10).optional(),
  coverImageUrl: z.string().url().optional(),
  position: z.number().int().min(0).optional(),
});

// =============================================================================
// BLOCK VALIDATORS
// =============================================================================

export const blockTypeSchema = z.enum([
  'paragraph',
  'heading',
  'code',
  'blockquote',
  'list',
  'table',
  'image',
  'video',
  'embed',
  'hint',
  'divider',
  'math',
  'api_block',
  'reusable',
]);

export const blockSchema = z.object({
  type: blockTypeSchema,
  content: z.record(z.unknown()),
  position: z.number().int().min(0),
  parentBlockId: uuidSchema.optional(),
});

export const updateBlocksSchema = z.object({
  blocks: z.array(blockSchema).max(500),
});

// =============================================================================
// CHANGE REQUEST VALIDATORS
// =============================================================================

export const changeRequestStatusSchema = z.enum([
  'draft',
  'open',
  'in_review',
  'approved',
  'merged',
  'closed',
]);

export const createChangeRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
});

export const updateChangeRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  status: changeRequestStatusSchema.optional(),
});

// =============================================================================
// GIT SYNC VALIDATORS
// =============================================================================

export const gitProviderSchema = z.enum(['github', 'gitlab']);

export const gitSyncConfigSchema = z.object({
  provider: gitProviderSchema,
  repositoryUrl: z.string().url(),
  branch: z.string().min(1).max(100).default('main'),
  rootPath: z.string().max(500).default('./docs'),
});

// =============================================================================
// AI / SEARCH VALIDATORS
// =============================================================================

export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  spaceId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  includeAIAnswer: z.boolean().default(false),
});

export const aiGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  spaceId: uuidSchema,
  context: z.string().max(10000).optional(),
  style: z.enum(['formal', 'casual', 'technical']).default('formal'),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: uuidSchema.optional(),
  spaceId: uuidSchema,
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type BlockInput = z.infer<typeof blockSchema>;
export type CreateChangeRequestInput = z.infer<typeof createChangeRequestSchema>;
export type UpdateChangeRequestInput = z.infer<typeof updateChangeRequestSchema>;
export type GitSyncConfigInput = z.infer<typeof gitSyncConfigSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>;
export type AIChatInput = z.infer<typeof aiChatSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
