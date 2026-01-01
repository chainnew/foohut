# Database Architecture Recommendation
## foohut.com AI-Native Documentation Platform

**Research Agent**: Hive Mind Researcher
**Date**: December 31, 2025
**Version**: 1.0

---

## Executive Summary

This document provides comprehensive database architecture recommendations for foohut.com, an AI-native documentation platform with a four-tier taxonomy (Organization > Collection > Space > Page). The architecture must support:

- 10,000+ pages with block-based content
- 100+ concurrent users
- Search response < 500ms
- AI Assistant response < 3s
- RAG-based semantic search with embeddings

**Recommended Stack**:
- **Primary Database**: PostgreSQL with pgvector extension
- **Hierarchical Storage**: Hybrid model (Adjacency List + ltree materialized path)
- **Content Storage**: Hybrid JSONB + normalized tables
- **Connection Pooling**: PgBouncer in transaction mode
- **Search**: PostgreSQL FTS (Phase 1) with Meilisearch upgrade path (Phase 2+)

---

## 1. Vector Database Analysis: pgvector vs Dedicated Solutions

### Research Findings

| Solution | Query Performance | Scale Limit | Operational Complexity | Cost |
|----------|-------------------|-------------|------------------------|------|
| **pgvector** | 471 QPS at 99% recall (50M vectors) | 10-100M vectors | Low (single DB) | Low |
| **Pinecone** | High (10-100ms) | Billions | Very Low (managed) | High |
| **Qdrant** | 41.47 QPS at 99% recall (50M vectors) | Billions | Medium (self-hosted) | Medium |
| **Weaviate** | Single-digit ms for 10-NN (millions) | Billions | Medium | Medium |

### Recommendation: **pgvector with PostgreSQL**

**Justification**:

1. **Scale Alignment**: foohut requires ~10,000 pages. With semantic chunking at 400-500 tokens per chunk, expecting ~5-10 chunks per page = 50,000-100,000 vectors. pgvector handles this with ease.

2. **Unified Architecture**: Keeping vectors in PostgreSQL eliminates:
   - ETL pipeline complexity
   - Data synchronization lag (critical for real-time search)
   - Additional infrastructure management
   - Multiple authentication/security systems

3. **Performance**: Recent pgvectorscale benchmarks show 471 QPS at 99% recall on 50M vectors - far exceeding foohut's requirements.

4. **Cost Efficiency**: No additional vector database service costs.

5. **ACID Compliance**: Vectors stay transactionally consistent with content changes.

**Migration Path**: If scale exceeds 100M vectors, migrate to Qdrant (open-source, self-hosted) or Weaviate for their advanced hybrid search capabilities.

### Implementation Schema

```sql
-- Vector embeddings table
CREATE TABLE page_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, chunk_index)
);

-- HNSW index for fast similarity search (recommended over IVFFlat)
CREATE INDEX ON page_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Metadata index for filtered searches
CREATE INDEX ON page_embeddings USING gin (metadata);
```

### RAG Chunking Strategy

Based on research, recommended chunking approach:

| Content Type | Chunk Size | Overlap | Strategy |
|--------------|------------|---------|----------|
| Technical docs | 400-500 tokens | 10-20% | Recursive/semantic |
| API reference | 300-400 tokens | 15% | Section-based |
| Tutorials | 500-600 tokens | 20% | Heading-based |

---

## 2. Hierarchical Data Storage: Schema Pattern Selection

### Research Findings

| Pattern | Insert/Update | Read (Ancestors) | Read (Descendants) | Move Subtree |
|---------|---------------|------------------|--------------------|--------------|
| **Adjacency List** | O(1) | O(depth) recursive | O(n) recursive | O(1) |
| **Nested Sets** | O(n) expensive | O(1) | O(1) | O(n) very expensive |
| **Materialized Path (ltree)** | O(1) | O(1) with index | O(log n) with index | O(subtree size) |
| **Closure Table** | O(depth) | O(1) | O(1) | O(subtree size) |

### Recommendation: **Hybrid Adjacency List + ltree Materialized Path**

**Justification**:

1. **Balanced Workload**: Documentation platforms have ~70% reads, 30% writes. ltree provides excellent read performance while adjacency list enables cheap inserts.

2. **Four-Tier Structure**: Organization > Collection > Space > Page is relatively shallow (max 4 levels + nested pages). ltree handles this efficiently with path lengths well under the 65,535 label limit.

3. **Powerful Queries**: ltree's lquery support enables pattern matching like finding all pages under a collection with single-query efficiency.

4. **Trigger-Based Sync**: Use database triggers to maintain ltree paths when adjacency relationships change, trading slight write overhead for massive read optimization.

### Implementation Schema

```sql
-- Organizations (root level)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Spaces
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    git_config JSONB DEFAULT '{}',  -- Git sync configuration
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, slug)
);

-- Pages with hybrid hierarchical storage
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Adjacency List (for simple parent lookups and inserts)
    parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,

    -- Materialized Path (for efficient subtree queries)
    path ltree NOT NULL,

    slug VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    position INTEGER DEFAULT 0,

    -- Content stored separately for TOAST efficiency
    content_id UUID,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,

    UNIQUE(space_id, path)
);

-- ltree indexes
CREATE INDEX pages_path_gist_idx ON pages USING gist (path);
CREATE INDEX pages_path_btree_idx ON pages USING btree (path);
CREATE INDEX pages_parent_idx ON pages (parent_id);
CREATE INDEX pages_space_idx ON pages (space_id);

-- Trigger to maintain ltree path on insert/update
CREATE OR REPLACE FUNCTION maintain_page_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Root page in space
        NEW.path = text2ltree(NEW.slug);
    ELSE
        -- Child page - derive path from parent
        SELECT path || text2ltree(NEW.slug) INTO NEW.path
        FROM pages WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_path_trigger
    BEFORE INSERT OR UPDATE OF parent_id, slug ON pages
    FOR EACH ROW EXECUTE FUNCTION maintain_page_path();
```

---

## 3. Block-Based Content Storage: JSONB vs Normalized

### Research Findings

| Approach | Write Performance | Read Performance | Partial Updates | Query Flexibility |
|----------|-------------------|------------------|-----------------|-------------------|
| **JSONB (single doc)** | O(n) rewrites whole doc | Fast for full doc | Poor (full rewrite) | Good with GIN |
| **Normalized blocks** | O(1) per block | O(n) with joins | Excellent | Excellent |
| **Hybrid** | O(1) per block | Optimized | Good | Excellent |

### TOAST Considerations

PostgreSQL applies TOAST compression to JSONB documents >2KB, introducing retrieval overhead. Block-based editors typically produce documents exceeding 2KB for any substantial page.

### Recommendation: **Hybrid Normalized Blocks with JSONB Properties**

**Justification**:

1. **Partial Updates**: Users edit one block at a time. Normalized storage enables O(1) updates without rewriting entire documents.

2. **Concurrent Editing**: Fine-grained locking at block level supports 100+ concurrent users without conflicts.

3. **TOAST Avoidance**: Individual blocks typically <2KB, avoiding compression overhead.

4. **Flexible Properties**: JSONB for block-specific properties (formatting, metadata) preserves extensibility.

5. **Notion Pattern**: Notion successfully uses this approach with 200+ billion blocks on PostgreSQL.

### Implementation Schema

```sql
-- Block types enumeration
CREATE TYPE block_type AS ENUM (
    'paragraph', 'heading1', 'heading2', 'heading3',
    'heading4', 'heading5', 'heading6',
    'bullet_list', 'numbered_list', 'todo_list',
    'code', 'quote', 'callout', 'divider',
    'image', 'video', 'embed', 'file',
    'table', 'toggle', 'synced_block',
    'api_method', 'api_parameter'  -- OpenAPI specific
);

-- Blocks table (core content storage)
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,

    -- Hierarchical position within page
    parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,

    -- Block type and content
    type block_type NOT NULL,

    -- Text content (stored separately for FTS indexing)
    text_content TEXT,

    -- Structured properties (formatting, links, metadata)
    properties JSONB DEFAULT '{}',

    -- Version tracking for collaborative editing
    version INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX blocks_page_idx ON blocks (page_id);
CREATE INDEX blocks_parent_idx ON blocks (parent_block_id);
CREATE INDEX blocks_page_position_idx ON blocks (page_id, position);
CREATE INDEX blocks_properties_idx ON blocks USING gin (properties);

-- Full-text search index on block content
CREATE INDEX blocks_text_search_idx ON blocks
    USING gin (to_tsvector('english', COALESCE(text_content, '')));

-- Page content view (reconstructs full page)
CREATE VIEW page_content AS
SELECT
    p.id AS page_id,
    p.title,
    p.path,
    jsonb_agg(
        jsonb_build_object(
            'id', b.id,
            'type', b.type,
            'text', b.text_content,
            'properties', b.properties,
            'children', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', c.id,
                        'type', c.type,
                        'text', c.text_content,
                        'properties', c.properties
                    ) ORDER BY c.position
                )
                FROM blocks c WHERE c.parent_block_id = b.id
            )
        ) ORDER BY b.position
    ) FILTER (WHERE b.parent_block_id IS NULL) AS blocks
FROM pages p
LEFT JOIN blocks b ON b.page_id = p.id
GROUP BY p.id;
```

---

## 4. Connection Pooling Strategy

### Research Findings

| Pooler | Latency (<50 conn) | Scale (1M+ conn) | CPU Efficiency | Operational Complexity |
|--------|-------------------|------------------|----------------|------------------------|
| **PgBouncer** | Best | Limited (single-thread) | Excellent | Low |
| **PgCat** | Good | Good | Best (1250 conn/400% CPU) | Medium |
| **Supavisor** | 80-160% higher | Best (1M+ conn) | Poor (700% CPU/100 conn) | Medium |

### Recommendation: **PgBouncer in Transaction Mode**

**Justification**:

1. **Scale Match**: 100 concurrent users requires ~200-500 connections (with spikes). PgBouncer handles this easily.

2. **Latency Priority**: Sub-500ms search requirement favors PgBouncer's superior latency.

3. **Proven Stability**: Battle-tested (used by Notion with 200B blocks).

4. **Simple Operations**: Single binary, minimal configuration.

### Configuration

```ini
; /etc/pgbouncer/pgbouncer.ini

[databases]
foohut = host=localhost dbname=foohut

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1

; Transaction pooling - connections returned after each transaction
pool_mode = transaction

; Connection limits
max_client_conn = 1000      ; Max client connections
default_pool_size = 25      ; Connections per user/database pair
min_pool_size = 5           ; Minimum idle connections
reserve_pool_size = 5       ; Extra connections for burst
reserve_pool_timeout = 3    ; Seconds before using reserve pool

; Timeouts
server_idle_timeout = 600   ; Close idle server connections after 10 min
client_idle_timeout = 300   ; Close idle client connections after 5 min
query_timeout = 30          ; Max query execution time

; Security
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Logging
log_connections = 1
log_disconnections = 1
stats_period = 60
```

### Application Connection Settings

```javascript
// Node.js pg pool configuration (connects to PgBouncer)
const pool = new Pool({
    host: 'localhost',
    port: 6432,  // PgBouncer port
    database: 'foohut',
    max: 20,  // Application-level pool (smaller since PgBouncer manages)
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

---

## 5. Full-Text Search Strategy

### Research Findings

| Solution | Query Latency | Typo Tolerance | Faceted Search | Operational Cost |
|----------|---------------|----------------|----------------|------------------|
| **PostgreSQL FTS** | Good (<100ms) | Requires pg_trgm | Complex to implement | None (built-in) |
| **Meilisearch** | Excellent (<50ms) | Built-in | Built-in | Low |
| **Elasticsearch** | Excellent | Built-in | Excellent | High |

### Recommendation: **Phased Approach**

**Phase 1 (MVP)**: PostgreSQL Full-Text Search with pg_trgm
- Zero additional infrastructure
- Meets <500ms requirement for 10,000 pages
- Good for exact and prefix matching

**Phase 2 (Growth)**: Add Meilisearch
- When UX becomes a growth lever
- Typo tolerance improves user experience
- Instant search results (<50ms)

### Phase 1 Implementation

```sql
-- Enable trigram extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search configuration for documentation
CREATE TEXT SEARCH CONFIGURATION doc_search (COPY = english);

-- Add programming language dictionary for code terms
ALTER TEXT SEARCH CONFIGURATION doc_search
    ALTER MAPPING FOR asciiword, word
    WITH english_stem;

-- Materialized view for fast full-text search
CREATE MATERIALIZED VIEW search_index AS
SELECT
    p.id AS page_id,
    p.space_id,
    p.title,
    p.path,
    s.name AS space_name,
    c.name AS collection_name,

    -- Combined searchable content
    setweight(to_tsvector('doc_search', COALESCE(p.title, '')), 'A') ||
    setweight(to_tsvector('doc_search', COALESCE(string_agg(b.text_content, ' '), '')), 'B')
    AS search_vector,

    -- Raw text for highlighting
    p.title || ' ' || COALESCE(string_agg(b.text_content, ' '), '') AS raw_text

FROM pages p
JOIN spaces s ON p.space_id = s.id
JOIN collections c ON s.collection_id = c.id
LEFT JOIN blocks b ON b.page_id = p.id
GROUP BY p.id, p.space_id, p.title, p.path, s.name, c.name;

-- GIN index for full-text search
CREATE INDEX search_index_fts_idx ON search_index USING gin (search_vector);

-- Trigram index for fuzzy/prefix matching
CREATE INDEX search_index_trgm_idx ON search_index
    USING gin (raw_text gin_trgm_ops);

-- Refresh function (call after content changes)
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY search_index;
END;
$$ LANGUAGE plpgsql;

-- Search function with ranking
CREATE OR REPLACE FUNCTION search_pages(
    query_text TEXT,
    space_filter UUID DEFAULT NULL,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    page_id UUID,
    title VARCHAR,
    path ltree,
    space_name VARCHAR,
    headline TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.page_id,
        si.title,
        si.path,
        si.space_name,
        ts_headline('doc_search', si.raw_text, websearch_to_tsquery('doc_search', query_text),
            'MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=FALSE') AS headline,
        ts_rank(si.search_vector, websearch_to_tsquery('doc_search', query_text)) AS rank
    FROM search_index si
    WHERE
        si.search_vector @@ websearch_to_tsquery('doc_search', query_text)
        AND (space_filter IS NULL OR si.space_id = space_filter)
    ORDER BY rank DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Complete Schema Overview

### Entity Relationship Diagram

```
Organization (1) ----< (N) Collection (1) ----< (N) Space (1) ----< (N) Page
                                                          |
                                                          v
                                                    (N) Block
                                                          |
                                                          v
                                                 (N) PageEmbedding
```

### Database Extensions Required

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "ltree";       -- Hierarchical paths
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Fuzzy text matching
CREATE EXTENSION IF NOT EXISTS "vector";      -- pgvector for embeddings
```

---

## 7. Performance Optimization Strategies

### 1. Read Optimization

```sql
-- Partial indexes for common queries
CREATE INDEX pages_published_idx ON pages (space_id, published_at)
    WHERE published_at IS NOT NULL;

-- Include columns for index-only scans
CREATE INDEX blocks_page_content_idx ON blocks (page_id)
    INCLUDE (type, text_content, position);
```

### 2. Write Optimization

```sql
-- Batch insert for bulk operations (Git sync)
-- Use COPY instead of INSERT for large imports

-- Efficient upsert pattern
INSERT INTO blocks (id, page_id, type, text_content, properties, position)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO UPDATE SET
    text_content = EXCLUDED.text_content,
    properties = EXCLUDED.properties,
    position = EXCLUDED.position,
    updated_at = NOW(),
    version = blocks.version + 1;
```

### 3. Query Optimization

```sql
-- Use prepared statements for repeated queries
PREPARE get_page_blocks (UUID) AS
    SELECT id, type, text_content, properties, parent_block_id, position
    FROM blocks
    WHERE page_id = $1
    ORDER BY position;

-- Materialized view refresh schedule
-- Run every 5 minutes or on significant content changes
SELECT cron.schedule('refresh-search', '*/5 * * * *',
    'SELECT refresh_search_index()');
```

### 4. Connection Efficiency

```sql
-- Keep statistics updated
ALTER TABLE blocks SET (autovacuum_analyze_scale_factor = 0.01);
ALTER TABLE pages SET (autovacuum_analyze_scale_factor = 0.01);

-- Monitor slow queries
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

---

## 8. Trade-offs Summary

| Decision | Choice | Trade-off |
|----------|--------|-----------|
| Vector DB | pgvector | Simpler architecture vs. dedicated vector DB scale |
| Hierarchy | ltree + Adjacency | Read performance vs. subtree move complexity |
| Content | Normalized blocks | Partial update efficiency vs. full-doc retrieval speed |
| Pooling | PgBouncer | Low latency vs. massive connection scale |
| Search | PostgreSQL FTS -> Meilisearch | Operational simplicity vs. search UX features |

---

## 9. Scaling Path

### Current Architecture (10K pages, 100 users)
- Single PostgreSQL instance (8 vCPU, 32GB RAM)
- PgBouncer for connection pooling
- pgvector for embeddings
- PostgreSQL FTS for search

### Growth Stage (100K pages, 500 users)
- Add read replica for search and analytics
- Introduce Meilisearch for enhanced search UX
- Consider pg_partman for table partitioning by space_id

### Scale Stage (1M+ pages, 5000+ users)
- Implement logical sharding by organization_id
- Migrate to dedicated vector DB (Qdrant/Weaviate)
- Add Elasticsearch for advanced search features
- Consider Citus for distributed PostgreSQL

---

## 10. Implementation Priority

1. **Week 1-2**: Core schema (organizations, collections, spaces, pages, blocks)
2. **Week 3**: ltree hierarchical indexing and triggers
3. **Week 4**: pgvector setup and embedding pipeline
4. **Week 5**: Full-text search with materialized views
5. **Week 6**: PgBouncer configuration and load testing

---

## References

### Vector Databases
- [Best Vector Databases in 2025](https://www.firecrawl.dev/blog/best-vector-databases-2025)
- [Vector Database Comparison Guide](https://sysdebug.com/posts/vector-database-comparison-guide-2025/)
- [Choosing the Right Vector Database](https://medium.com/@elisheba.t.anderson/choosing-the-right-vector-database-opensearch-vs-pinecone-vs-qdrant-vs-weaviate-vs-milvus-vs-037343926d7e)
- [pgvector vs Dedicated Vector DBs](https://wearemicro.co/vector-database-comparison/)

### Hierarchical Data
- [Hierarchical Models in PostgreSQL](https://www.ackee.agency/blog/hierarchical-models-in-postgresql)
- [LTREE vs Adjacency List vs Closure Table](https://dev.to/dowerdev/implementing-hierarchical-data-structures-in-postgresql-ltree-vs-adjacency-list-vs-closure-table-2jpb)
- [PostgreSQL ltree Documentation](https://www.postgresql.org/docs/current/ltree.html)

### JSONB and Content Storage
- [PostgreSQL JSONB Storage](https://www.architecture-weekly.com/p/postgresql-jsonb-powerful-storage)
- [When to Avoid JSONB](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema)
- [Notion's Data Model](https://www.notion.com/blog/data-model-behind-notion)
- [How Notion Handles 200 Billion Notes](https://dev.to/aadarsh-nagrath/how-notion-handles-200-billion-notes-without-crashing-a-technical-deep-dive-5deh)

### Connection Pooling
- [Benchmarking PostgreSQL Connection Poolers](https://legacy.tembo.io/blog/postgres-connection-poolers/)
- [PgBouncer for PostgreSQL](https://www.percona.com/blog/pgbouncer-for-postgresql-how-connection-pooling-solves-enterprise-slowdowns/)
- [Supavisor GitHub](https://github.com/supabase/supavisor)

### Full-Text Search
- [Postgres Full Text Search vs the Rest](https://supabase.com/blog/postgres-full-text-search-vs-the-rest)
- [Elasticsearch vs Postgres for FTS](https://www.paradedb.com/blog/elasticsearch_vs_postgres)
- [Postgres FTS Limitations](https://www.meilisearch.com/blog/postgres-full-text-search-limitations)

### RAG and Embeddings
- [Best Chunking Strategies for RAG 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/)
- [Weaviate Chunking Strategies](https://weaviate.io/blog/chunking-strategies-for-rag)
