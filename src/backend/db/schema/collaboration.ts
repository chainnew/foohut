// ============================================================================
// foohut.com Drizzle Schema - Collaboration
// Change requests, reviews, and comments for collaborative editing
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
} from 'drizzle-orm/pg-core';
import { changeRequestStatusEnum } from './enums';
import { spaces, pages, blocks } from './content';
import { users } from './auth';

// ============================================================================
// CHANGE REQUESTS
// ============================================================================

export const changeRequests = pgTable(
  'change_requests',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent space
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),

    // Request details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: changeRequestStatusEnum('status').default('draft').notNull(),

    // Branches (for Git integration)
    sourceBranch: varchar('source_branch', { length: 255 }),
    targetBranch: varchar('target_branch', { length: 255 }).default('main').notNull(),

    // Authorship
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    // Review
    reviewers: jsonb('reviewers').default([]).notNull(),
    approvedBy: jsonb('approved_by').default([]).notNull(), // Array of user UUIDs

    // Merge tracking
    mergedBy: uuid('merged_by').references(() => users.id),
    mergedAt: timestamp('merged_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    spaceIdIdx: index('change_requests_space_id_idx').on(table.spaceId),
    createdByIdx: index('change_requests_created_by_idx').on(table.createdBy),
    statusIdx: index('change_requests_status_idx').on(table.status),
    createdAtIdx: index('change_requests_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// CHANGE REQUEST CHANGES
// ============================================================================

export const changeRequestChanges = pgTable(
  'change_request_changes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent change request
    changeRequestId: uuid('change_request_id')
      .notNull()
      .references(() => changeRequests.id, { onDelete: 'cascade' }),

    // Affected page
    pageId: uuid('page_id').references(() => pages.id, { onDelete: 'set null' }),

    // Change type
    changeType: varchar('change_type', { length: 20 }).notNull(), // create, update, delete

    // Snapshots for diff
    beforeSnapshot: jsonb('before_snapshot'),
    afterSnapshot: jsonb('after_snapshot'),
    blockChanges: jsonb('block_changes').default([]).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    changeRequestIdIdx: index('change_request_changes_cr_id_idx').on(table.changeRequestId),
    pageIdIdx: index('change_request_changes_page_id_idx').on(table.pageId),
  })
);

// ============================================================================
// CHANGE REQUEST COMMENTS
// ============================================================================

export const changeRequestComments = pgTable(
  'change_request_comments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent change request
    changeRequestId: uuid('change_request_id')
      .notNull()
      .references(() => changeRequests.id, { onDelete: 'cascade' }),

    // Location (optional - for inline comments)
    pageId: uuid('page_id').references(() => pages.id, { onDelete: 'set null' }),
    blockId: uuid('block_id').references(() => blocks.id, { onDelete: 'set null' }),
    lineNumber: integer('line_number'),

    // Content
    content: text('content').notNull(),

    // Threading
    parentCommentId: uuid('parent_comment_id'),

    // Authorship
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    // Resolution
    isResolved: boolean('is_resolved').default(false).notNull(),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    changeRequestIdIdx: index('change_request_comments_cr_id_idx').on(table.changeRequestId),
    parentCommentIdIdx: index('change_request_comments_parent_idx').on(table.parentCommentId),
    createdByIdx: index('change_request_comments_created_by_idx').on(table.createdBy),
    resolvedIdx: index('change_request_comments_resolved_idx').on(table.isResolved),
  })
);

// ============================================================================
// REVIEWS
// ============================================================================

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent change request
    changeRequestId: uuid('change_request_id')
      .notNull()
      .references(() => changeRequests.id, { onDelete: 'cascade' }),

    // Reviewer
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id),

    // Review status
    status: varchar('status', { length: 20 }).notNull(), // pending, approved, changes_requested, commented

    // Review content
    body: text('body'),

    // Timestamps
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    changeRequestIdIdx: index('reviews_change_request_id_idx').on(table.changeRequestId),
    reviewerIdIdx: index('reviews_reviewer_id_idx').on(table.reviewerId),
    crReviewerIdx: uniqueIndex('reviews_cr_reviewer_idx').on(table.changeRequestId, table.reviewerId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const changeRequestsRelations = relations(changeRequests, ({ one, many }) => ({
  space: one(spaces, {
    fields: [changeRequests.spaceId],
    references: [spaces.id],
  }),
  creator: one(users, {
    fields: [changeRequests.createdBy],
    references: [users.id],
    relationName: 'changeRequestCreator',
  }),
  merger: one(users, {
    fields: [changeRequests.mergedBy],
    references: [users.id],
    relationName: 'changeRequestMerger',
  }),
  changes: many(changeRequestChanges),
  comments: many(changeRequestComments),
  reviews: many(reviews),
}));

export const changeRequestChangesRelations = relations(changeRequestChanges, ({ one }) => ({
  changeRequest: one(changeRequests, {
    fields: [changeRequestChanges.changeRequestId],
    references: [changeRequests.id],
  }),
  page: one(pages, {
    fields: [changeRequestChanges.pageId],
    references: [pages.id],
  }),
}));

export const changeRequestCommentsRelations = relations(changeRequestComments, ({ one, many }) => ({
  changeRequest: one(changeRequests, {
    fields: [changeRequestComments.changeRequestId],
    references: [changeRequests.id],
  }),
  page: one(pages, {
    fields: [changeRequestComments.pageId],
    references: [pages.id],
  }),
  block: one(blocks, {
    fields: [changeRequestComments.blockId],
    references: [blocks.id],
  }),
  parentComment: one(changeRequestComments, {
    fields: [changeRequestComments.parentCommentId],
    references: [changeRequestComments.id],
    relationName: 'commentThread',
  }),
  childComments: many(changeRequestComments, { relationName: 'commentThread' }),
  creator: one(users, {
    fields: [changeRequestComments.createdBy],
    references: [users.id],
    relationName: 'commentCreator',
  }),
  resolver: one(users, {
    fields: [changeRequestComments.resolvedBy],
    references: [users.id],
    relationName: 'commentResolver',
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  changeRequest: one(changeRequests, {
    fields: [reviews.changeRequestId],
    references: [changeRequests.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type NewChangeRequest = typeof changeRequests.$inferInsert;
export type ChangeRequestChange = typeof changeRequestChanges.$inferSelect;
export type NewChangeRequestChange = typeof changeRequestChanges.$inferInsert;
export type ChangeRequestComment = typeof changeRequestComments.$inferSelect;
export type NewChangeRequestComment = typeof changeRequestComments.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
