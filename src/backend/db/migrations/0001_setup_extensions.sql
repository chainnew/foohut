-- ============================================================================
-- foohut.com Initial Migration
-- PostgreSQL extensions and custom indexes
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vector similarity search (for embeddings)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Trigram matching (for fuzzy search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- VECTOR INDEXES (HNSW for fast approximate nearest neighbor search)
-- ============================================================================

-- Embedding vector index for semantic search
-- Using HNSW (Hierarchical Navigable Small World) algorithm
-- vector_cosine_ops for cosine similarity
CREATE INDEX IF NOT EXISTS embeddings_vector_hnsw_idx
ON embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Query embedding index for search query caching
CREATE INDEX IF NOT EXISTS search_queries_vector_hnsw_idx
ON search_queries
USING hnsw (query_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (GIN indexes for tsvector)
-- ============================================================================

-- Title vector GIN index
CREATE INDEX IF NOT EXISTS search_index_title_gin_idx
ON search_index
USING gin(title_vector);

-- Content vector GIN index
CREATE INDEX IF NOT EXISTS search_index_content_gin_idx
ON search_index
USING gin(content_vector);

-- ============================================================================
-- GENERATED COLUMNS FOR TSVECTOR
-- ============================================================================

-- Add generated tsvector columns to search_index table
-- These columns are automatically updated when title/content changes
ALTER TABLE search_index
  ADD COLUMN IF NOT EXISTS title_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(title, ''))) STORED;

ALTER TABLE search_index
  ADD COLUMN IF NOT EXISTS content_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, ''))) STORED;

-- ============================================================================
-- TRIGRAM INDEXES (for fuzzy/autocomplete search)
-- ============================================================================

-- Organization name trigram index
CREATE INDEX IF NOT EXISTS organizations_name_trgm_idx
ON organizations
USING gin(name gin_trgm_ops);

-- Page title trigram index
CREATE INDEX IF NOT EXISTS pages_title_trgm_idx
ON pages
USING gin(title gin_trgm_ops);

-- Space name trigram index
CREATE INDEX IF NOT EXISTS spaces_name_trgm_idx
ON spaces
USING gin(name gin_trgm_ops);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- AUTO-UPDATE TRIGGERS FOR updated_at
-- ============================================================================

-- Users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Collections
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Spaces
DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
CREATE TRIGGER update_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Pages
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Blocks
DROP TRIGGER IF EXISTS update_blocks_updated_at ON blocks;
CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Change Requests
DROP TRIGGER IF EXISTS update_change_requests_updated_at ON change_requests;
CREATE TRIGGER update_change_requests_updated_at
  BEFORE UPDATE ON change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Git Sync Configs
DROP TRIGGER IF EXISTS update_git_sync_configs_updated_at ON git_sync_configs;
CREATE TRIGGER update_git_sync_configs_updated_at
  BEFORE UPDATE ON git_sync_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Embeddings
DROP TRIGGER IF EXISTS update_embeddings_updated_at ON embeddings;
CREATE TRIGGER update_embeddings_updated_at
  BEFORE UPDATE ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on application requirements
-- Example policy for organization_members:
-- CREATE POLICY org_member_access ON organization_members
--   USING (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with multi-provider auth support (Better-Auth compatible)';
COMMENT ON TABLE organizations IS 'Root administrative container for billing, identity, and user membership';
COMMENT ON TABLE collections IS 'Aggregation layer for Spaces with permission inheritance';
COMMENT ON TABLE spaces IS 'Fundamental unit of work with Git sync configuration';
COMMENT ON TABLE pages IS 'Granular content units with nested structure';
COMMENT ON TABLE blocks IS 'Individual content units within pages (paragraph, heading, code, etc.)';
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic search using pgvector';
COMMENT ON TABLE search_index IS 'Full-text search index with tsvector columns';
COMMENT ON TABLE change_requests IS 'Draft workflow for collaborative editing (similar to Git PRs)';
COMMENT ON TABLE git_sync_configs IS 'Git repository synchronization configuration per space';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance and debugging';
