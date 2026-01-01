// ============================================================================
// foohut.com Drizzle Schema - Content
// Collection, Space, Page, and Block content management
// ============================================================================

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  real,
} from 'drizzle-orm/pg-core';
import { publishModeEnum, blockTypeEnum } from './enums';
import { organizations } from './organizations';
import { users } from './auth';

// ============================================================================
// COLLECTIONS
// ============================================================================

export const collections = pgTable(
  'collections',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent organization
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Identity
    slug: varchar('slug', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }),

    // Ordering
    position: integer('position').default(0).notNull(),

    // Settings
    settings: jsonb('settings').default({}).notNull(),
    inheritPermissions: boolean('inherit_permissions').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
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

export const spaces = pgTable(
  'spaces',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent collection
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),

    // Identity
    slug: varchar('slug', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }),

    // Ordering
    position: integer('position').default(0).notNull(),

    // Publishing
    publishMode: publishModeEnum('publish_mode').default('private').notNull(),
    customDomain: varchar('custom_domain', { length: 255 }).unique(),
    customDomainVerified: boolean('custom_domain_verified').default(false).notNull(),
    shareableLinkToken: uuid('shareable_link_token').default(sql`uuid_generate_v4()`).notNull(),

    // Theme
    themeConfig: jsonb('theme_config').default({}).notNull(),

    // SEO
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),
    canonicalUrl: text('canonical_url'),

    // Settings
    settings: jsonb('settings').default({}).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
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

export const pages = pgTable(
  'pages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent space
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),

    // Nested hierarchy
    parentId: uuid('parent_id'),

    // Identity
    slug: varchar('slug', { length: 255 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }),

    // Nested structure
    path: text('path').notNull(), // Full path like /getting-started/quick-start
    depth: integer('depth').default(0).notNull(),
    position: integer('position').default(0).notNull(),

    // Page type
    pageType: varchar('page_type', { length: 50 }).default('document').notNull(),
    templateId: uuid('template_id'),

    // Publishing
    isPublished: boolean('is_published').default(false).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    // SEO
    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
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

// Self-reference for parent must be added after table definition
// This is handled via the relation definition

// ============================================================================
// BLOCKS
// ============================================================================

export const blocks = pgTable(
  'blocks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent page
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),

    // Nested block hierarchy
    parentBlockId: uuid('parent_block_id'),

    // Block type
    blockType: blockTypeEnum('block_type').notNull(),

    // Ordering
    position: integer('position').default(0).notNull(),

    // Content as JSONB (flexible schema per block type)
    content: jsonb('content').default({}).notNull(),

    // Code blocks
    language: varchar('language', { length: 50 }),

    // Reusable blocks
    isReusable: boolean('is_reusable').default(false).notNull(),
    reusableBlockId: uuid('reusable_block_id'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    pageIdIdx: index('blocks_page_id_idx').on(table.pageId),
    parentBlockIdIdx: index('blocks_parent_block_id_idx').on(table.parentBlockId),
    positionIdx: index('blocks_position_idx').on(table.position),
    blockTypeIdx: index('blocks_block_type_idx').on(table.blockType),
    reusableIdx: index('blocks_reusable_idx').on(table.isReusable).where(sql`${table.isReusable} = true`),
  })
);

// ============================================================================
// PAGE VERSIONS
// ============================================================================

export const pageVersions = pgTable(
  'page_versions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent page
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),

    // Version tracking
    versionNumber: integer('version_number').notNull(),

    // Snapshot
    title: varchar('title', { length: 500 }).notNull(),
    contentSnapshot: jsonb('content_snapshot').notNull(),

    // Authorship
    createdBy: uuid('created_by').references(() => users.id),
    changeSummary: text('change_summary'),

    // Git integration
    gitCommitSha: varchar('git_commit_sha', { length: 40 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pageVersionIdx: uniqueIndex('page_versions_page_version_idx').on(table.pageId, table.versionNumber),
    pageIdIdx: index('page_versions_page_id_idx').on(table.pageId),
    gitCommitIdx: index('page_versions_git_commit_idx').on(table.gitCommitSha),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [collections.organizationId],
    references: [organizations.id],
  }),
  spaces: many(spaces),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  collection: one(collections, {
    fields: [spaces.collectionId],
    references: [collections.id],
  }),
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  space: one(spaces, {
    fields: [pages.spaceId],
    references: [spaces.id],
  }),
  parent: one(pages, {
    fields: [pages.parentId],
    references: [pages.id],
    relationName: 'pageHierarchy',
  }),
  children: many(pages, { relationName: 'pageHierarchy' }),
  blocks: many(blocks),
  versions: many(pageVersions),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  page: one(pages, {
    fields: [blocks.pageId],
    references: [pages.id],
  }),
  parentBlock: one(blocks, {
    fields: [blocks.parentBlockId],
    references: [blocks.id],
    relationName: 'blockHierarchy',
  }),
  childBlocks: many(blocks, { relationName: 'blockHierarchy' }),
  reusableSource: one(blocks, {
    fields: [blocks.reusableBlockId],
    references: [blocks.id],
    relationName: 'reusableBlock',
  }),
  reusableUsages: many(blocks, { relationName: 'reusableBlock' }),
}));

export const pageVersionsRelations = relations(pageVersions, ({ one }) => ({
  page: one(pages, {
    fields: [pageVersions.pageId],
    references: [pages.id],
  }),
  creator: one(users, {
    fields: [pageVersions.createdBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

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
