// ============================================================================
// foohut.com Drizzle Schema - AI & Embeddings
// Vector search with pgvector for RAG and semantic search
// ============================================================================

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core';
import { embeddingModelEnum } from './enums';
import { spaces } from './content';
import { users } from './auth';

// ============================================================================
// CUSTOM TYPES
// ============================================================================

// pgvector type for embedding storage
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // Parse vector string format: [0.1,0.2,0.3,...]
    return value
      .slice(1, -1)
      .split(',')
      .map((v) => parseFloat(v));
  },
});

// tsvector for full-text search
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

// ============================================================================
// EMBEDDINGS
// ============================================================================

export const embeddings = pgTable(
  'embeddings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Polymorphic source reference
    sourceType: varchar('source_type', { length: 50 }).notNull(), // page, block, api_spec
    sourceId: uuid('source_id').notNull(),

    // Vector embedding
    embedding: vector('embedding').notNull(),

    // Content tracking
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    modelVersion: embeddingModelEnum('model_version').default('text-embedding-ada-002').notNull(),

    // Chunking
    chunkIndex: integer('chunk_index').default(0).notNull(),
    chunkText: text('chunk_text'),
    chunkTokens: integer('chunk_tokens'),

    // Metadata
    metadata: jsonb('metadata').default({}).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceChunkIdx: uniqueIndex('embeddings_source_chunk_idx').on(
      table.sourceType,
      table.sourceId,
      table.chunkIndex
    ),
    sourceTypeIdx: index('embeddings_source_type_idx').on(table.sourceType),
    sourceIdIdx: index('embeddings_source_id_idx').on(table.sourceId),
    contentHashIdx: index('embeddings_content_hash_idx').on(table.contentHash),
    // Note: Vector similarity index (HNSW or IVFFlat) should be created via raw SQL migration
    // CREATE INDEX embeddings_vector_idx ON embeddings USING hnsw (embedding vector_cosine_ops);
  })
);

// ============================================================================
// SEARCH INDEX (Full-text search)
// ============================================================================

export const searchIndex = pgTable(
  'search_index',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Polymorphic source reference
    sourceType: varchar('source_type', { length: 50 }).notNull(),
    sourceId: uuid('source_id').notNull(),

    // Parent space for scoped search
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),

    // Searchable content
    title: text('title'),
    content: text('content'),

    // Full-text search vectors (generated columns in migration)
    titleVector: tsvector('title_vector'),
    contentVector: tsvector('content_vector'),

    // Search metadata
    metadata: jsonb('metadata').default({}).notNull(),
    boostScore: real('boost_score').default(1.0).notNull(),

    // Timestamps
    indexedAt: timestamp('indexed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceIdx: uniqueIndex('search_index_source_idx').on(table.sourceType, table.sourceId),
    spaceIdIdx: index('search_index_space_id_idx').on(table.spaceId),
    // Note: GIN indexes for tsvector should be created via raw SQL migration
    // CREATE INDEX search_index_title_gin_idx ON search_index USING gin(title_vector);
    // CREATE INDEX search_index_content_gin_idx ON search_index USING gin(content_vector);
  })
);

// ============================================================================
// SEARCH QUERIES (Analytics and caching)
// ============================================================================

export const searchQueries = pgTable(
  'search_queries',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Query context
    spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Query details
    queryText: text('query_text').notNull(),
    queryType: varchar('query_type', { length: 20 }).notNull(), // semantic, fulltext, hybrid

    // Query embedding (for semantic search caching)
    queryEmbedding: vector('query_embedding'),

    // Results
    resultCount: integer('result_count').default(0).notNull(),
    topResultIds: jsonb('top_result_ids').default([]).notNull(),

    // Performance metrics
    latencyMs: integer('latency_ms'),

    // User feedback
    clickedResultId: uuid('clicked_result_id'),
    feedbackScore: integer('feedback_score'), // 1-5 rating

    // Session tracking
    sessionId: uuid('session_id'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    spaceIdIdx: index('search_queries_space_id_idx').on(table.spaceId),
    userIdIdx: index('search_queries_user_id_idx').on(table.userId),
    createdAtIdx: index('search_queries_created_at_idx').on(table.createdAt),
    queryTypeIdx: index('search_queries_query_type_idx').on(table.queryType),
  })
);

// ============================================================================
// AI CONVERSATIONS (Chat history for AI assistant)
// ============================================================================

export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Context
    spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

    // Conversation metadata
    title: varchar('title', { length: 255 }),

    // State
    isActive: boolean('is_active').default(true).notNull(),

    // Token usage tracking
    totalTokens: integer('total_tokens').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
    spaceIdIdx: index('ai_conversations_space_id_idx').on(table.spaceId),
    createdAtIdx: index('ai_conversations_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// AI MESSAGES
// ============================================================================

export const aiMessages = pgTable(
  'ai_messages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent conversation
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => aiConversations.id, { onDelete: 'cascade' }),

    // Message details
    role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
    content: text('content').notNull(),

    // Token tracking
    tokenCount: integer('token_count'),

    // RAG context
    contextSources: jsonb('context_sources').default([]).notNull(),

    // Model info
    model: varchar('model', { length: 100 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
    roleIdx: index('ai_messages_role_idx').on(table.role),
    createdAtIdx: index('ai_messages_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const searchIndexRelations = relations(searchIndex, ({ one }) => ({
  space: one(spaces, {
    fields: [searchIndex.spaceId],
    references: [spaces.id],
  }),
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  space: one(spaces, {
    fields: [searchQueries.spaceId],
    references: [spaces.id],
  }),
  user: one(users, {
    fields: [searchQueries.userId],
    references: [users.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  space: one(spaces, {
    fields: [aiConversations.spaceId],
    references: [spaces.id],
  }),
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type SearchIndexEntry = typeof searchIndex.$inferSelect;
export type NewSearchIndexEntry = typeof searchIndex.$inferInsert;
export type SearchQuery = typeof searchQueries.$inferSelect;
export type NewSearchQuery = typeof searchQueries.$inferInsert;
export type AIConversation = typeof aiConversations.$inferSelect;
export type NewAIConversation = typeof aiConversations.$inferInsert;
export type AIMessage = typeof aiMessages.$inferSelect;
export type NewAIMessage = typeof aiMessages.$inferInsert;
