# ADR-006: Database Schema Design

**Status:** Accepted
**Date:** 2024-12-31
**Decision Makers:** Backend Development Team
**Technical Area:** Data Architecture

## Context

foohut.com requires a robust database schema to support its AI-native documentation platform. The schema must handle:

1. Four-tier organizational taxonomy (Organization > Collection > Space > Page)
2. Block-based content with flexible JSONB storage
3. Role-based access control (RBAC) with five permission levels
4. Bi-directional Git synchronization with branch-based versioning
5. AI embeddings for semantic search via pgvector
6. Change Request workflow for collaborative editing
7. Comprehensive audit logging

## Decision

We will use PostgreSQL as the primary database with the following design principles:

### 1. Core Entity Structure

```
Organization (1)
    └── Collection (N)
            └── Space (N)
                    └── Page (N)
                            └── Block (N)
```

Each tier has:
- UUID primary keys for distributed system compatibility
- Soft delete via `deleted_at` timestamp
- Automatic `created_at` and `updated_at` timestamps
- JSONB settings/config fields for extensibility

### 2. Content Model: Block-Based Architecture

**Decision:** Store page content as individual Block records with JSONB content rather than monolithic page content.

**Rationale:**
- Enables block-level versioning and conflict resolution
- Supports reusable content blocks across pages
- Facilitates granular permissions and commenting
- Aligns with Git sync granularity for better merge handling
- Allows efficient partial updates

**Block Types Supported:**
- Text: paragraph, heading_1-6, blockquote
- Code: code_block with syntax highlighting
- Structure: table, toggle, tabs, divider
- Media: image, video, embed, file_attachment
- Documentation: hint_info/warning/danger/success
- Special: reusable_block, api_block, math, action_button

### 3. RBAC Permission Model

**Hierarchy (highest to lowest):**

| Role | Level | Capabilities |
|------|-------|--------------|
| Admin | 5 | Full control, billing, integrations |
| Creator | 4 | Space configuration, publishing |
| Editor | 3 | Content creation, Change Requests |
| Commenter | 2 | Read + feedback capabilities |
| Visitor | 1 | Published content only |

**Permission Resolution:**
1. Check direct `permissions` table for resource-specific grants
2. Fall back to `organization_members` role
3. Use inherited permissions through Collection hierarchy

**Implementation:**
```sql
-- Helper function for permission checking
CREATE FUNCTION has_permission(user_id, resource_type, resource_id, required_role)
RETURNS BOOLEAN
```

### 4. Git Synchronization Schema

**Tables:**
- `git_sync_configs`: Per-space repository configuration
- `git_commits`: Tracking of all synced commits
- `git_branches`: Multi-variant versioning support

**Key Fields:**
- `sync_status`: idle, syncing, success, conflict, error
- `last_sync_commit`: SHA of last successful sync
- `direction`: 'push' (platform to repo) or 'pull' (repo to platform)

**Conflict Handling:**
- Block-granular detection using content hashes
- Store both versions for visual diff
- AI-suggested resolution for common patterns

### 5. AI Embeddings with pgvector

**Vector Storage:**
```sql
CREATE TABLE embeddings (
    embedding vector(1536),  -- OpenAI ada-002 dimensions
    content_hash VARCHAR(64),
    chunk_index INTEGER
);

-- IVFFlat index for approximate nearest neighbor
CREATE INDEX idx_embeddings_vector ON embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

**Chunking Strategy:**
- Long content split into chunks (~500 tokens each)
- Each chunk stored with `chunk_index`
- `content_hash` for cache invalidation on updates

**Semantic Search Function:**
```sql
CREATE FUNCTION semantic_search(
    space_id UUID,
    query_embedding vector(1536),
    limit INTEGER,
    similarity_threshold FLOAT
) RETURNS TABLE (...)
```

### 6. Full-Text Search Strategy

**Dual Approach:**
1. **PostgreSQL tsvector** for fast keyword search
2. **pgvector embeddings** for semantic search

**tsvector Configuration:**
- Weighted vectors: Title (A), Description (B), Content (D)
- English language dictionary
- GIN indexes for fast lookups

**Search Index Table:**
- Denormalized search data for query performance
- Includes metadata for filtering
- Boost scores for ranking customization

### 7. Change Request Workflow

**States:** draft > pending_review > in_review > approved > rejected > merged > closed

**Tables:**
- `change_requests`: Main request metadata
- `change_request_changes`: Per-page changes with before/after snapshots
- `change_request_comments`: Block-level threaded comments

**Features:**
- Branch-based isolation (source_branch, target_branch)
- Multi-reviewer support with approval tracking
- Resolution tracking for comments

### 8. Audit Logging

**Design Principles:**
- Immutable records (no UPDATE/DELETE)
- Preserve user email even after user deletion
- Capture request context (IP, user agent, request ID)
- Store old/new values as JSONB for flexibility

**Indexed Fields:**
- user_id, organization_id
- action type
- resource_type + resource_id
- created_at (for time-range queries)

## Index Strategy

### Primary Access Patterns

| Query Pattern | Index | Type |
|--------------|-------|------|
| Organization by slug | `idx_organizations_slug` | B-tree |
| Spaces by collection | `idx_spaces_collection` | B-tree |
| Pages by path | `idx_pages_path` | B-tree |
| Full-text search | `idx_*_search` | GIN |
| Semantic search | `idx_embeddings_vector` | IVFFlat |
| Audit by date | `idx_audit_date` | B-tree DESC |

### Partial Indexes

Partial indexes used for soft-delete filtering:
```sql
CREATE INDEX idx_pages_space ON pages(space_id)
    WHERE deleted_at IS NULL;
```

### Composite Indexes

For common multi-column queries:
```sql
-- Page hierarchy navigation
CREATE INDEX idx_pages_depth ON pages(space_id, depth, position);

-- Permission lookups
CREATE INDEX idx_permissions_resource ON permissions(resource_type, resource_id);
```

## Query Optimization Notes

### 1. Page Tree Loading

Use materialized path pattern with `path` column:
```sql
-- Get all descendants
SELECT * FROM pages
WHERE space_id = $1 AND path LIKE $2 || '%'
ORDER BY depth, position;
```

### 2. Permission Checks

Cache organization membership in application layer. Use database function for complex permission resolution:
```sql
SELECT has_permission($user_id, 'page', $page_id, 'editor');
```

### 3. Search Performance

For combined keyword + semantic search:
1. First filter by space_id (index scan)
2. Apply keyword filter (tsvector match)
3. Re-rank by semantic similarity

### 4. Audit Log Queries

Partition by month for large deployments:
```sql
-- Future consideration
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 5. Embedding Updates

Batch embedding updates during off-peak hours:
- Queue content changes
- Process in batches of 100
- Use content_hash to skip unchanged content

## Row Level Security (RLS)

RLS enabled on all user-facing tables:

```sql
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY pages_access ON pages
    USING (has_permission(current_setting('app.current_user_id')::uuid,
                          'page', id, 'visitor'));
```

Application sets user context:
```sql
SET app.current_user_id = '<user-uuid>';
```

## Consequences

### Positive

1. **Scalability**: UUID keys enable horizontal scaling
2. **Flexibility**: JSONB fields allow schema evolution without migrations
3. **Performance**: Optimized indexes for all primary access patterns
4. **AI-Ready**: pgvector integration for semantic search from day one
5. **Auditability**: Complete change history for compliance
6. **Git Integration**: Schema designed around bi-directional sync requirements

### Negative

1. **Complexity**: Multiple permission layers require careful application logic
2. **Storage**: JSONB snapshots in versions increase storage needs
3. **Migration Overhead**: Full schema requires significant initial setup
4. **pgvector Learning Curve**: Team needs to understand vector operations

### Neutral

1. **ORM Compatibility**: Prisma schema provided but raw SQL needed for vector ops
2. **RLS Overhead**: Small performance cost for row-level security
3. **Index Maintenance**: More indexes mean slower writes but faster reads

## Alternatives Considered

### 1. Document Database (MongoDB)

**Rejected because:**
- Weaker transaction support for RBAC
- No native vector search (requires Atlas Vector Search)
- Less mature full-text search

### 2. Separate Search Service (Elasticsearch)

**Deferred:**
- PostgreSQL full-text + pgvector sufficient for MVP
- Can add Elasticsearch for scale later if needed
- Reduces infrastructure complexity

### 3. Monolithic Page Content

**Rejected because:**
- Block-level collaboration impossible
- Git merge conflicts harder to resolve
- Reusable blocks not feasible

## Migration Path

1. **001_initial_schema.sql**: Complete schema as documented
2. Future migrations will follow sequential numbering
3. Prisma migrations generate SQL from schema changes
4. Rollback scripts maintained for each migration

## Related ADRs

- ADR-001: Technology Stack Selection
- ADR-002: Authentication Architecture
- ADR-003: Git Sync Strategy
- ADR-005: AI Integration Architecture

## References

- [PostgreSQL JSONB Best Practices](https://www.postgresql.org/docs/current/datatype-json.html)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Full-Text Search in PostgreSQL](https://www.postgresql.org/docs/current/textsearch.html)
- [Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
