// ============================================================================
// foohut.com D1/SQLite Schema
// Converted from PostgreSQL Drizzle schema for Cloudflare Workers
// ============================================================================

import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateUUID = () => crypto.randomUUID();
const currentTimestamp = () => new Date();

// ============================================================================
// USERS
// ============================================================================

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Core auth fields
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
    passwordHash: text('password_hash'),

    // Profile
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),

    // Auth provider (Better-Auth compatible)
    authProvider: text('auth_provider').default('email').notNull(),
    authProviderId: text('auth_provider_id'),

    // Settings (JSON serialized)
    preferences: text('preferences', { mode: 'json' }).default('{}').notNull(),
    notificationSettings: text('notification_settings', { mode: 'json' }).default('{}').notNull(),

    // Status
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),

    // Timestamps (Unix ms)
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    authProviderIdx: index('users_auth_provider_idx').on(table.authProvider, table.authProviderId),
    activeIdx: index('users_active_idx').on(table.isActive),
  })
);

// ============================================================================
// SESSIONS
// ============================================================================

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Token (hashed for security)
    tokenHash: text('token_hash').notNull(),

    // Metadata
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    deviceInfo: text('device_info', { mode: 'json' }).default('{}').notNull(),

    // Expiration
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    lastActiveAt: integer('last_active_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),

    // Revocation
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    revokedReason: text('revoked_reason'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    tokenHashIdx: index('sessions_token_hash_idx').on(table.tokenHash),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// ACCOUNTS (Better-Auth OAuth Accounts)
// ============================================================================

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // OAuth provider info
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),

    // Tokens (encrypted at rest)
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),

    // Token type and scope
    tokenType: text('token_type'),
    scope: text('scope'),

    // Provider-specific data
    providerData: text('provider_data', { mode: 'json' }).default('{}').notNull(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
    providerAccountIdx: uniqueIndex('accounts_provider_account_idx').on(
      table.provider,
      table.providerAccountId
    ),
  })
);

// ============================================================================
// VERIFICATION TOKENS (Better-Auth compatible)
// ============================================================================

export const verificationTokens = sqliteTable(
  'verification_tokens',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Token identification
    identifier: text('identifier').notNull(),
    token: text('token').notNull().unique(),

    // Token purpose (email_verification, password_reset, etc.)
    type: text('type').notNull(),

    // Expiration
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),

    // Usage tracking
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    identifierIdx: index('verification_tokens_identifier_idx').on(table.identifier),
    tokenIdx: uniqueIndex('verification_tokens_token_idx').on(table.token),
    expiresAtIdx: index('verification_tokens_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = sqliteTable(
  'organizations',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Identity
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),

    // Settings (JSON serialized)
    settings: text('settings', { mode: 'json' }).default('{}').notNull(),
    billingInfo: text('billing_info', { mode: 'json' }).default('{}').notNull(),

    // Feature flags
    features: text('features', { mode: 'json' }).default('{}').notNull(),

    // Plan/tier
    plan: text('plan').default('free').notNull(),
    planExpiresAt: integer('plan_expires_at', { mode: 'timestamp_ms' }),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
    createdAtIdx: index('organizations_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

export const organizationMembers = sqliteTable(
  'organization_members',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Foreign keys
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Role assignment (admin, creator, editor, commenter, visitor)
    role: text('role').default('editor').notNull(),

    // Invitation tracking
    invitedBy: text('invited_by').references(() => users.id),
    invitedAt: integer('invited_at', { mode: 'timestamp_ms' }),
    acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),

    // Member status
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex('organization_members_org_user_idx').on(
      table.organizationId,
      table.userId
    ),
    userIdIdx: index('organization_members_user_id_idx').on(table.userId),
    roleIdx: index('organization_members_role_idx').on(table.role),
  })
);

// ============================================================================
// ORGANIZATION INVITATIONS
// ============================================================================

export const organizationInvitations = sqliteTable(
  'organization_invitations',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Foreign keys
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Invitation details
    email: text('email').notNull(),
    role: text('role').default('editor').notNull(),

    // Token for accepting invitation
    token: text('token').notNull().unique(),

    // Tracking
    invitedBy: text('invited_by')
      .notNull()
      .references(() => users.id),

    // Status
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('organization_invitations_token_idx').on(table.token),
    orgEmailIdx: index('organization_invitations_org_email_idx').on(
      table.organizationId,
      table.email
    ),
    expiresAtIdx: index('organization_invitations_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// PERMISSIONS (Granular resource-level permissions)
// ============================================================================

export const permissions = sqliteTable(
  'permissions',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Permission target
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Polymorphic resource reference
    resourceType: text('resource_type').notNull(), // collection, space, page
    resourceId: text('resource_id').notNull(),

    // Permission level (admin, creator, editor, commenter, visitor)
    role: text('role').notNull(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    userResourceIdx: uniqueIndex('permissions_user_resource_idx').on(
      table.userId,
      table.resourceType,
      table.resourceId
    ),
    resourceIdx: index('permissions_resource_idx').on(table.resourceType, table.resourceId),
    userIdIdx: index('permissions_user_id_idx').on(table.userId),
  })
);

// ============================================================================
// COLLECTIONS
// ============================================================================

export const collections = sqliteTable(
  'collections',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Parent organization
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Identity
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),

    // Ordering
    position: integer('position').default(0).notNull(),

    // Settings
    settings: text('settings', { mode: 'json' }).default('{}').notNull(),
    inheritPermissions: integer('inherit_permissions', { mode: 'boolean' }).default(true).notNull(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    orgSlugIdx: uniqueIndex('collections_org_slug_idx').on(table.organizationId, table.slug),
    orgIdIdx: index('collections_org_id_idx').on(table.organizationId),
    positionIdx: index('collections_position_idx').on(table.position),
  })
);

// ============================================================================
// SPACES
// ============================================================================

export const spaces = sqliteTable(
  'spaces',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Parent collection
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),

    // Identity
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),

    // Ordering
    position: integer('position').default(0).notNull(),

    // Publishing (public, shareable, private, authenticated)
    publishMode: text('publish_mode').default('private').notNull(),
    customDomain: text('custom_domain').unique(),
    customDomainVerified: integer('custom_domain_verified', { mode: 'boolean' }).default(false).notNull(),
    shareableLinkToken: text('shareable_link_token').$defaultFn(generateUUID).notNull(),

    // Theme
    themeConfig: text('theme_config', { mode: 'json' }).default('{}').notNull(),

    // SEO
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    canonicalUrl: text('canonical_url'),

    // Settings
    settings: text('settings', { mode: 'json' }).default('{}').notNull(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    collectionSlugIdx: uniqueIndex('spaces_collection_slug_idx').on(table.collectionId, table.slug),
    collectionIdIdx: index('spaces_collection_id_idx').on(table.collectionId),
    customDomainIdx: index('spaces_custom_domain_idx').on(table.customDomain),
    publishModeIdx: index('spaces_publish_mode_idx').on(table.publishMode),
    positionIdx: index('spaces_position_idx').on(table.position),
  })
);

// ============================================================================
// PAGES
// ============================================================================

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Parent space
    spaceId: text('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),

    // Nested hierarchy (self-reference handled via text)
    parentId: text('parent_id'),

    // Identity
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    icon: text('icon'),

    // Nested structure
    path: text('path').notNull(), // Full path like /getting-started/quick-start
    depth: integer('depth').default(0).notNull(),
    position: integer('position').default(0).notNull(),

    // Page type
    pageType: text('page_type').default('document').notNull(),
    templateId: text('template_id'),

    // Publishing
    isPublished: integer('is_published', { mode: 'boolean' }).default(false).notNull(),
    publishedAt: integer('published_at', { mode: 'timestamp_ms' }),

    // SEO
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    spacePathIdx: uniqueIndex('pages_space_path_idx').on(table.spaceId, table.path),
    spaceIdIdx: index('pages_space_id_idx').on(table.spaceId),
    parentIdIdx: index('pages_parent_id_idx').on(table.parentId),
    publishedIdx: index('pages_published_idx').on(table.isPublished),
    positionIdx: index('pages_position_idx').on(table.position),
    pathIdx: index('pages_path_idx').on(table.path),
  })
);

// ============================================================================
// BLOCKS
// ============================================================================

export const blocks = sqliteTable(
  'blocks',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Parent page
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),

    // Nested block hierarchy (self-reference handled via text)
    parentBlockId: text('parent_block_id'),

    // Block type (paragraph, heading_1, heading_2, code_block, etc.)
    blockType: text('block_type').notNull(),

    // Ordering
    position: integer('position').default(0).notNull(),

    // Content as JSON (flexible schema per block type)
    content: text('content', { mode: 'json' }).default('{}').notNull(),

    // Code blocks
    language: text('language'),

    // Reusable blocks
    isReusable: integer('is_reusable', { mode: 'boolean' }).default(false).notNull(),
    reusableBlockId: text('reusable_block_id'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    pageIdIdx: index('blocks_page_id_idx').on(table.pageId),
    parentBlockIdIdx: index('blocks_parent_block_id_idx').on(table.parentBlockId),
    positionIdx: index('blocks_position_idx').on(table.position),
    blockTypeIdx: index('blocks_block_type_idx').on(table.blockType),
    reusableIdx: index('blocks_reusable_idx').on(table.isReusable),
  })
);

// ============================================================================
// PAGE VERSIONS
// ============================================================================

export const pageVersions = sqliteTable(
  'page_versions',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Parent page
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),

    // Version tracking
    versionNumber: integer('version_number').notNull(),

    // Snapshot
    title: text('title').notNull(),
    contentSnapshot: text('content_snapshot', { mode: 'json' }).notNull(),

    // Authorship
    createdBy: text('created_by').references(() => users.id),
    changeSummary: text('change_summary'),

    // Git integration
    gitCommitSha: text('git_commit_sha'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    pageVersionIdx: uniqueIndex('page_versions_page_version_idx').on(table.pageId, table.versionNumber),
    pageIdIdx: index('page_versions_page_id_idx').on(table.pageId),
    gitCommitIdx: index('page_versions_git_commit_idx').on(table.gitCommitSha),
  })
);

// ============================================================================
// AI CONVERSATIONS
// ============================================================================

export const aiConversations = sqliteTable(
  'ai_conversations',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Context
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    spaceId: text('space_id').references(() => spaces.id, { onDelete: 'cascade' }),
    pageId: text('page_id').references(() => pages.id, { onDelete: 'cascade' }),

    // Metadata
    title: text('title'),
    context: text('context', { mode: 'json' }).default('{}').notNull(),

    // Status
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
    spaceIdIdx: index('ai_conversations_space_id_idx').on(table.spaceId),
    pageIdIdx: index('ai_conversations_page_id_idx').on(table.pageId),
    activeIdx: index('ai_conversations_active_idx').on(table.isActive),
  })
);

// ============================================================================
// AI MESSAGES
// ============================================================================

export const aiMessages = sqliteTable(
  'ai_messages',
  {
    id: text('id').primaryKey().$defaultFn(generateUUID),

    // Parent conversation
    conversationId: text('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),

    // Message content
    role: text('role').notNull(), // user, assistant, system
    content: text('content').notNull(),

    // Metadata
    metadata: text('metadata', { mode: 'json' }).default('{}').notNull(),

    // Token usage
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).$defaultFn(currentTimestamp).notNull(),
  },
  (table) => ({
    conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
    roleIdx: index('ai_messages_role_idx').on(table.role),
    createdAtIdx: index('ai_messages_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type Space = typeof spaces.$inferSelect;
export type NewSpace = typeof spaces.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;
export type PageVersion = typeof pageVersions.$inferSelect;
export type NewPageVersion = typeof pageVersions.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type NewAiConversation = typeof aiConversations.$inferInsert;
export type AiMessage = typeof aiMessages.$inferSelect;
export type NewAiMessage = typeof aiMessages.$inferInsert;

// ============================================================================
// VALID ENUM VALUES (for app-level validation)
// ============================================================================

export const USER_ROLES = ['admin', 'creator', 'editor', 'commenter', 'visitor'] as const;
export type UserRole = typeof USER_ROLES[number];

export const PUBLISH_MODES = ['public', 'shareable', 'private', 'authenticated'] as const;
export type PublishMode = typeof PUBLISH_MODES[number];

export const BLOCK_TYPES = [
  'paragraph', 'heading_1', 'heading_2', 'heading_3', 'heading_4', 'heading_5', 'heading_6',
  'blockquote', 'code_block', 'table', 'hint_info', 'hint_warning', 'hint_danger', 'hint_success',
  'reusable_block', 'image', 'video', 'embed', 'math', 'divider', 'toggle', 'tabs',
  'api_block', 'file_attachment', 'action_button',
] as const;
export type BlockType = typeof BLOCK_TYPES[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type MessageRole = typeof MESSAGE_ROLES[number];
