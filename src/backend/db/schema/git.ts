// ============================================================================
// foohut.com Drizzle Schema - Git Integration
// Git repository synchronization and version control
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
import { syncStatusEnum, gitProviderEnum } from './enums';
import { spaces } from './content';
import { changeRequests } from './collaboration';

// ============================================================================
// GIT SYNC CONFIG
// ============================================================================

export const gitSyncConfigs = pgTable(
  'git_sync_configs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent space (1:1 relationship)
    spaceId: uuid('space_id')
      .notNull()
      .unique()
      .references(() => spaces.id, { onDelete: 'cascade' }),

    // Repository information
    provider: gitProviderEnum('provider').default('github').notNull(),
    repositoryUrl: text('repository_url').notNull(),
    repositoryOwner: varchar('repository_owner', { length: 255 }).notNull(),
    repositoryName: varchar('repository_name', { length: 255 }).notNull(),

    // Authentication (encrypted at rest)
    accessTokenEncrypted: text('access_token_encrypted'),
    webhookSecretEncrypted: text('webhook_secret_encrypted'),

    // Settings
    defaultBranch: varchar('default_branch', { length: 255 }).default('main').notNull(),
    rootPath: varchar('root_path', { length: 500 }).default('./docs').notNull(),
    configFilePath: varchar('config_file_path', { length: 255 }).default('.foohut.yaml').notNull(),

    // Sync state
    syncStatus: syncStatusEnum('sync_status').default('idle').notNull(),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    lastSyncCommit: varchar('last_sync_commit', { length: 40 }),
    lastError: text('last_error'),

    // Webhook
    webhookId: varchar('webhook_id', { length: 255 }),
    webhookActive: boolean('webhook_active').default(false).notNull(),

    // Auto sync settings
    autoSyncEnabled: boolean('auto_sync_enabled').default(true).notNull(),
    commitMessageTemplate: text('commit_message_template').default('docs: {summary} [foohut]').notNull(),

    // File patterns
    includePatterns: jsonb('include_patterns').default(['**/*.md', '**/*.mdx']).notNull(),
    excludePatterns: jsonb('exclude_patterns').default(['node_modules/**', '.git/**']).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    spaceIdIdx: uniqueIndex('git_sync_configs_space_id_idx').on(table.spaceId),
    providerIdx: index('git_sync_configs_provider_idx').on(table.provider),
    syncStatusIdx: index('git_sync_configs_sync_status_idx').on(table.syncStatus),
    repoIdx: index('git_sync_configs_repo_idx').on(table.repositoryOwner, table.repositoryName),
  })
);

// ============================================================================
// GIT COMMITS
// ============================================================================

export const gitCommits = pgTable(
  'git_commits',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent git sync config
    gitSyncConfigId: uuid('git_sync_config_id')
      .notNull()
      .references(() => gitSyncConfigs.id, { onDelete: 'cascade' }),

    // Commit information
    commitSha: varchar('commit_sha', { length: 40 }).notNull(),
    commitMessage: text('commit_message'),
    commitAuthor: varchar('commit_author', { length: 255 }),
    commitAuthorEmail: varchar('commit_author_email', { length: 255 }),
    committedAt: timestamp('committed_at', { withTimezone: true }),

    // Sync direction
    direction: varchar('direction', { length: 20 }).notNull(), // push, pull

    // Associated change request (if any)
    changeRequestId: uuid('change_request_id').references(() => changeRequests.id),

    // Changed files
    filesChanged: jsonb('files_changed').default([]).notNull(),

    // Sync result
    syncResult: varchar('sync_result', { length: 20 }), // success, partial, failed
    errorMessage: text('error_message'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    configCommitIdx: uniqueIndex('git_commits_config_sha_idx').on(
      table.gitSyncConfigId,
      table.commitSha
    ),
    configIdIdx: index('git_commits_config_id_idx').on(table.gitSyncConfigId),
    changeRequestIdIdx: index('git_commits_change_request_id_idx').on(table.changeRequestId),
    createdAtIdx: index('git_commits_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// GIT BRANCHES
// ============================================================================

export const gitBranches = pgTable(
  'git_branches',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent git sync config
    gitSyncConfigId: uuid('git_sync_config_id')
      .notNull()
      .references(() => gitSyncConfigs.id, { onDelete: 'cascade' }),

    // Branch information
    branchName: varchar('branch_name', { length: 255 }).notNull(),
    displayLabel: varchar('display_label', { length: 255 }),

    // State
    headCommit: varchar('head_commit', { length: 40 }),
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    // Version variants configuration
    variantConfig: jsonb('variant_config').default({}).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    configBranchIdx: uniqueIndex('git_branches_config_branch_idx').on(
      table.gitSyncConfigId,
      table.branchName
    ),
    configIdIdx: index('git_branches_config_id_idx').on(table.gitSyncConfigId),
    defaultIdx: index('git_branches_default_idx').on(table.isDefault).where(sql`${table.isDefault} = true`),
  })
);

// ============================================================================
// SYNC HISTORY (Audit trail for sync operations)
// ============================================================================

export const syncHistory = pgTable(
  'sync_history',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent git sync config
    gitSyncConfigId: uuid('git_sync_config_id')
      .notNull()
      .references(() => gitSyncConfigs.id, { onDelete: 'cascade' }),

    // Sync operation details
    operation: varchar('operation', { length: 20 }).notNull(), // full_sync, incremental, webhook
    direction: varchar('direction', { length: 20 }).notNull(), // push, pull, bidirectional

    // State before and after
    startCommit: varchar('start_commit', { length: 40 }),
    endCommit: varchar('end_commit', { length: 40 }),

    // Results
    status: syncStatusEnum('status').notNull(),
    filesProcessed: integer('files_processed').default(0).notNull(),
    pagesCreated: integer('pages_created').default(0).notNull(),
    pagesUpdated: integer('pages_updated').default(0).notNull(),
    pagesDeleted: integer('pages_deleted').default(0).notNull(),

    // Errors and conflicts
    errors: jsonb('errors').default([]).notNull(),
    conflicts: jsonb('conflicts').default([]).notNull(),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),

    // Metadata
    triggeredBy: varchar('triggered_by', { length: 50 }), // user, webhook, scheduled
    metadata: jsonb('metadata').default({}).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    configIdIdx: index('sync_history_config_id_idx').on(table.gitSyncConfigId),
    statusIdx: index('sync_history_status_idx').on(table.status),
    startedAtIdx: index('sync_history_started_at_idx').on(table.startedAt),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const gitSyncConfigsRelations = relations(gitSyncConfigs, ({ one, many }) => ({
  space: one(spaces, {
    fields: [gitSyncConfigs.spaceId],
    references: [spaces.id],
  }),
  commits: many(gitCommits),
  branches: many(gitBranches),
  syncHistory: many(syncHistory),
}));

export const gitCommitsRelations = relations(gitCommits, ({ one }) => ({
  gitSyncConfig: one(gitSyncConfigs, {
    fields: [gitCommits.gitSyncConfigId],
    references: [gitSyncConfigs.id],
  }),
  changeRequest: one(changeRequests, {
    fields: [gitCommits.changeRequestId],
    references: [changeRequests.id],
  }),
}));

export const gitBranchesRelations = relations(gitBranches, ({ one }) => ({
  gitSyncConfig: one(gitSyncConfigs, {
    fields: [gitBranches.gitSyncConfigId],
    references: [gitSyncConfigs.id],
  }),
}));

export const syncHistoryRelations = relations(syncHistory, ({ one }) => ({
  gitSyncConfig: one(gitSyncConfigs, {
    fields: [syncHistory.gitSyncConfigId],
    references: [gitSyncConfigs.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GitSyncConfig = typeof gitSyncConfigs.$inferSelect;
export type NewGitSyncConfig = typeof gitSyncConfigs.$inferInsert;
export type GitCommit = typeof gitCommits.$inferSelect;
export type NewGitCommit = typeof gitCommits.$inferInsert;
export type GitBranch = typeof gitBranches.$inferSelect;
export type NewGitBranch = typeof gitBranches.$inferInsert;
export type SyncHistoryEntry = typeof syncHistory.$inferSelect;
export type NewSyncHistoryEntry = typeof syncHistory.$inferInsert;
