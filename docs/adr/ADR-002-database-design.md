# ADR-002: Database Design

## Status
Proposed

## Context
foohut.com requires a database strategy that supports:
- Four-tier document hierarchy (Organization > Collection > Space > Page)
- Block-based content with version history
- Vector embeddings for semantic search (RAG)
- Multi-tenant data isolation
- Change request workflows
- High read throughput with strong consistency for writes

We must balance query performance, data integrity, and operational simplicity.

## Decision
We will use **PostgreSQL 16** with **pgvector** extension, accessed via **Drizzle ORM** with type-safe migrations.

### Database Architecture
```
+------------------------------------------------------------------+
|                      PostgreSQL 16 Cluster                        |
+------------------------------------------------------------------+
|  +-------------------+  +-------------------+  +----------------+ |
|  |   Core Schema     |  |   Content Schema  |  |  Vector Schema | |
|  |                   |  |                   |  |                | |
|  | - organizations   |  | - pages           |  | - embeddings   | |
|  | - collections     |  | - blocks          |  | - search_index | |
|  | - spaces          |  | - page_versions   |  |                | |
|  | - users           |  | - change_requests |  |                | |
|  | - memberships     |  | - comments        |  |                | |
|  | - permissions     |  | - git_commits     |  |                | |
|  +-------------------+  +-------------------+  +----------------+ |
+------------------------------------------------------------------+
```

### Core Entity Relationship Diagram
```
organizations (1) ─────< (N) collections
                              │
collections (1) ──────< (N) spaces
                              │
spaces (1) ───────────< (N) pages
                              │
pages (1) ────────────< (N) blocks
    │                         │
    │ (1)                     │ (N)
    └─────< page_versions     └─────< embeddings
              │
              └─────< change_requests
```

### Schema Design

#### Organizations & Hierarchy
```sql
-- organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  custom_domain VARCHAR(255) UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- collections (top-level grouping within org)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_public BOOLEAN DEFAULT false,
  git_repo_url VARCHAR(500),
  git_branch VARCHAR(100) DEFAULT 'main',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- spaces (sections within collections)
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, slug)
);
```

#### Content & Versioning
```sql
-- pages
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  cover_image VARCHAR(500),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  current_version_id UUID,  -- FK added after page_versions created
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(space_id, slug)
);

-- blocks (JSON content blocks, TipTap compatible)
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,  -- paragraph, heading, code, image, etc.
  content JSONB NOT NULL,     -- TipTap node content
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- page_versions (immutable snapshots)
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  content_snapshot JSONB NOT NULL,  -- Full block tree snapshot
  markdown_content TEXT,            -- Serialized markdown
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, version_number)
);

-- Add FK from pages to page_versions
ALTER TABLE pages ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES page_versions(id);
```

#### Change Requests (PR-like workflow)
```sql
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  source_version_id UUID NOT NULL REFERENCES page_versions(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',  -- draft, open, approved, merged, closed
  proposed_content JSONB NOT NULL,
  diff_summary JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE change_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  block_reference UUID,  -- Optional reference to specific block
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Vector Embeddings (pgvector)
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- embeddings for semantic search
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL,  -- SHA-256 of source content
  embedding vector(1536) NOT NULL,     -- OpenAI ada-002 or Claude embedding
  content_preview TEXT,                -- First 500 chars for display
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, block_id, content_hash)
);

-- HNSW index for fast similarity search
CREATE INDEX ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Partial index for organization-scoped search
CREATE INDEX idx_embeddings_org ON embeddings(page_id)
  INCLUDE (embedding);
```

#### Access Control
```sql
-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  password_hash VARCHAR(255),  -- NULL for SSO users
  sso_provider VARCHAR(50),
  sso_id VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organization memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,  -- administrator, creator, editor, commenter, visitor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- granular permissions (optional overrides)
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(20) NOT NULL,  -- collection, space, page
  resource_id UUID NOT NULL,
  permission VARCHAR(20) NOT NULL,     -- view, edit, admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_type, resource_id)
);
```

### Drizzle ORM Schema Example
```typescript
// schema/pages.ts
import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { spaces } from './spaces';
import { users } from './users';
import { blocks } from './blocks';

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => pages.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  coverImage: varchar('cover_image', { length: 500 }),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  sortOrder: integer('sort_order').default(0),
  currentVersionId: uuid('current_version_id'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const pagesRelations = relations(pages, ({ one, many }) => ({
  space: one(spaces, {
    fields: [pages.spaceId],
    references: [spaces.id],
  }),
  parent: one(pages, {
    fields: [pages.parentId],
    references: [pages.id],
    relationName: 'parentChild',
  }),
  children: many(pages, { relationName: 'parentChild' }),
  blocks: many(blocks),
  creator: one(users, {
    fields: [pages.createdBy],
    references: [users.id],
  }),
}));
```

### Indexing Strategy
```sql
-- Hierarchy navigation
CREATE INDEX idx_collections_org ON collections(organization_id);
CREATE INDEX idx_spaces_collection ON spaces(collection_id);
CREATE INDEX idx_pages_space ON pages(space_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);
CREATE INDEX idx_blocks_page ON blocks(page_id);

-- Slug lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_collections_slug ON collections(organization_id, slug);
CREATE INDEX idx_spaces_slug ON spaces(collection_id, slug);
CREATE INDEX idx_pages_slug ON pages(space_id, slug);

-- Full-text search (backup for when vector search unavailable)
CREATE INDEX idx_pages_fts ON pages
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Access control
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);
CREATE INDEX idx_permissions_user ON permissions(user_id, resource_type);

-- Temporal queries
CREATE INDEX idx_pages_updated ON pages(updated_at DESC);
CREATE INDEX idx_page_versions_created ON page_versions(page_id, created_at DESC);
```

## Consequences

### Positive
- **Type Safety**: Drizzle provides compile-time SQL validation
- **Performance**: pgvector HNSW indexes enable sub-100ms semantic search
- **Flexibility**: JSONB content allows schema evolution without migrations
- **Consistency**: PostgreSQL ACID guarantees for critical operations
- **Scalability**: Read replicas and connection pooling handle growth

### Negative
- **Operational Complexity**: pgvector requires PostgreSQL 16+ with extension
- **Storage Costs**: Embeddings consume significant space (~6KB per vector)
- **Cold Start**: HNSW index loading can slow initial queries

### Mitigations
- Use Neon PostgreSQL (serverless, pgvector included) or Supabase
- Implement embedding deduplication via content_hash
- Warm connection pools on deployment

## Technical Details

### Migration Strategy
```bash
# Generate migration from schema changes
npx drizzle-kit generate:pg

# Apply migrations
npx drizzle-kit push:pg

# Production: Use migrate() in application startup
```

### Connection Pooling
```typescript
// db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);
```

### Query Performance Targets
| Query Type | Target | Index Used |
|------------|--------|------------|
| Page by slug | < 5ms | idx_pages_slug |
| Page tree (children) | < 20ms | idx_pages_parent |
| Semantic search (top 10) | < 100ms | HNSW on embeddings |
| Full-text search | < 50ms | GIN on pages |
| Version history | < 10ms | idx_page_versions_created |

### Backup Strategy
- **Point-in-Time Recovery**: Enabled with 7-day retention
- **Logical Backups**: Daily pg_dump to object storage
- **Cross-Region Replication**: For production disaster recovery

## References
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL JSONB Best Practices](https://www.postgresql.org/docs/current/datatype-json.html)
