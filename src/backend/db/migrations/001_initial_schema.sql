-- ============================================================================
-- foohut.com Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Complete schema for AI-native documentation platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Trigram for fuzzy text search

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles in the system (hierarchical)
CREATE TYPE user_role AS ENUM (
    'admin',      -- Full control including billing and integrations
    'creator',    -- Space configuration, sync settings, publishing
    'editor',     -- Content creation, modification, Change Request initiation
    'commenter',  -- Read access with feedback capabilities
    'visitor'     -- Published content consumption only
);

-- Publishing visibility modes
CREATE TYPE publish_mode AS ENUM (
    'public',        -- Search engine indexed, open access
    'shareable',     -- Secret URL for draft sharing
    'private',       -- Organization member authentication required
    'authenticated'  -- External user verification via SSO/JWT
);

-- Change request status
CREATE TYPE change_request_status AS ENUM (
    'draft',
    'pending_review',
    'in_review',
    'approved',
    'rejected',
    'merged',
    'closed'
);

-- Git sync status
CREATE TYPE sync_status AS ENUM (
    'idle',
    'syncing',
    'success',
    'conflict',
    'error'
);

-- Block types for content editor
CREATE TYPE block_type AS ENUM (
    'paragraph',
    'heading_1',
    'heading_2',
    'heading_3',
    'heading_4',
    'heading_5',
    'heading_6',
    'blockquote',
    'code_block',
    'table',
    'hint_info',
    'hint_warning',
    'hint_danger',
    'hint_success',
    'reusable_block',
    'image',
    'video',
    'embed',
    'math',
    'divider',
    'toggle',
    'tabs',
    'api_block',
    'file_attachment',
    'action_button'
);

-- Audit action types
CREATE TYPE audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'restore',
    'publish',
    'unpublish',
    'merge',
    'sync',
    'permission_change',
    'login',
    'logout'
);

-- ============================================================================
-- CORE TABLES: Organizations, Collections, Spaces, Pages (Four-Tier Taxonomy)
-- ============================================================================

-- Organizations: Root administrative container
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    billing_info JSONB DEFAULT '{}',

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

-- Collections: Aggregation layer for Spaces
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    position INTEGER NOT NULL DEFAULT 0,
    settings JSONB DEFAULT '{}',

    -- Inheritance settings
    inherit_permissions BOOLEAN DEFAULT TRUE,

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT collections_org_slug_unique UNIQUE (organization_id, slug),
    CONSTRAINT collections_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

-- Spaces: Fundamental unit of work with git sync
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    position INTEGER NOT NULL DEFAULT 0,

    -- Publishing settings
    publish_mode publish_mode NOT NULL DEFAULT 'private',
    custom_domain VARCHAR(255),
    custom_domain_verified BOOLEAN DEFAULT FALSE,
    shareable_link_token UUID DEFAULT uuid_generate_v4(),

    -- Theme and customization
    theme_config JSONB DEFAULT '{}',

    -- SEO settings
    seo_title VARCHAR(255),
    seo_description TEXT,
    canonical_url TEXT,

    -- Full-text search vector
    search_vector TSVECTOR,

    -- Settings
    settings JSONB DEFAULT '{}',

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT spaces_collection_slug_unique UNIQUE (collection_id, slug),
    CONSTRAINT spaces_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
    CONSTRAINT spaces_custom_domain_unique UNIQUE (custom_domain)
);

-- Pages: Granular content units with nested structure
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    icon VARCHAR(50),

    -- Content path for nested pages (materialized path pattern)
    path TEXT NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,

    -- Page type and template
    page_type VARCHAR(50) DEFAULT 'document',
    template_id UUID,

    -- Publishing state
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,

    -- SEO
    seo_title VARCHAR(255),
    seo_description TEXT,

    -- Full-text search vector
    search_vector TSVECTOR,

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT pages_space_path_unique UNIQUE (space_id, path),
    CONSTRAINT pages_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]$')
);

-- ============================================================================
-- USER MANAGEMENT & RBAC
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash TEXT,

    -- Profile
    display_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,

    -- Authentication
    auth_provider VARCHAR(50) DEFAULT 'email',
    auth_provider_id VARCHAR(255),

    -- Settings
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Organization membership (users belong to organizations)
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'editor',

    -- Invitation tracking
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT org_members_unique UNIQUE (organization_id, user_id)
);

-- Granular permissions (override organization-level roles)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Polymorphic resource reference
    resource_type VARCHAR(50) NOT NULL, -- 'collection', 'space', 'page'
    resource_id UUID NOT NULL,

    -- Permission level
    role user_role NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT permissions_unique UNIQUE (user_id, resource_type, resource_id),
    CONSTRAINT permissions_resource_type CHECK (resource_type IN ('collection', 'space', 'page'))
);

-- User sessions for auth tracking
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,

    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',

    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    -- Revocation
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONTENT: Blocks and Versioning
-- ============================================================================

-- Blocks: Individual content units within pages
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,

    -- Block identification
    block_type block_type NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,

    -- Content stored as JSONB for flexibility
    content JSONB NOT NULL DEFAULT '{}',

    -- For code blocks
    language VARCHAR(50),

    -- For reusable blocks
    is_reusable BOOLEAN DEFAULT FALSE,
    reusable_block_id UUID REFERENCES blocks(id),

    -- Full-text search vector for content
    search_vector TSVECTOR,

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Page versions for history tracking
CREATE TABLE page_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Snapshot of page at this version
    title VARCHAR(500) NOT NULL,
    content_snapshot JSONB NOT NULL, -- Full blocks snapshot

    -- Version metadata
    created_by UUID REFERENCES users(id),
    change_summary TEXT,

    -- Git association
    git_commit_sha VARCHAR(40),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT page_versions_unique UNIQUE (page_id, version_number)
);

-- ============================================================================
-- CHANGE REQUESTS (Draft Workflow)
-- ============================================================================

CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Request details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status change_request_status NOT NULL DEFAULT 'draft',

    -- Branch management
    source_branch VARCHAR(255),
    target_branch VARCHAR(255) DEFAULT 'main',

    -- Authorship
    created_by UUID NOT NULL REFERENCES users(id),

    -- Review tracking
    reviewers JSONB DEFAULT '[]',
    approved_by UUID[] DEFAULT '{}',

    -- Merge info
    merged_by UUID REFERENCES users(id),
    merged_at TIMESTAMPTZ,

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Changes within a change request
CREATE TABLE change_request_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,

    -- Change type
    change_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'move'

    -- Before/after snapshots
    before_snapshot JSONB,
    after_snapshot JSONB,

    -- Block-level changes for granular tracking
    block_changes JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT change_request_changes_type CHECK (change_type IN ('create', 'update', 'delete', 'move'))
);

-- Comments on change requests (block-level)
CREATE TABLE change_request_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,

    -- Comment location
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
    line_number INTEGER,

    -- Comment content
    content TEXT NOT NULL,

    -- Threading
    parent_comment_id UUID REFERENCES change_request_comments(id) ON DELETE CASCADE,

    -- Authorship
    created_by UUID NOT NULL REFERENCES users(id),

    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,

    -- Timestamps and soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- GIT SYNCHRONIZATION
-- ============================================================================

-- Git sync configuration per space
CREATE TABLE git_sync_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID UNIQUE NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Repository info
    provider VARCHAR(20) NOT NULL DEFAULT 'github', -- 'github', 'gitlab'
    repository_url TEXT NOT NULL,
    repository_owner VARCHAR(255) NOT NULL,
    repository_name VARCHAR(255) NOT NULL,

    -- Authentication
    access_token_encrypted TEXT,
    webhook_secret_encrypted TEXT,

    -- Sync settings
    default_branch VARCHAR(255) DEFAULT 'main',
    root_path VARCHAR(500) DEFAULT './docs',
    config_file_path VARCHAR(255) DEFAULT '.foohut.yaml',

    -- Sync state
    sync_status sync_status DEFAULT 'idle',
    last_sync_at TIMESTAMPTZ,
    last_sync_commit VARCHAR(40),
    last_error TEXT,

    -- Webhook
    webhook_id VARCHAR(255),
    webhook_active BOOLEAN DEFAULT FALSE,

    -- Settings
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    commit_message_template TEXT DEFAULT 'docs: {summary} [foohut]',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT git_sync_provider CHECK (provider IN ('github', 'gitlab'))
);

-- Git commits tracking
CREATE TABLE git_commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    git_sync_config_id UUID NOT NULL REFERENCES git_sync_configs(id) ON DELETE CASCADE,

    -- Commit info
    commit_sha VARCHAR(40) NOT NULL,
    commit_message TEXT,
    commit_author VARCHAR(255),
    commit_author_email VARCHAR(255),
    committed_at TIMESTAMPTZ,

    -- Sync direction
    direction VARCHAR(20) NOT NULL, -- 'push', 'pull'

    -- Associated changes
    change_request_id UUID REFERENCES change_requests(id),
    files_changed JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT git_commits_sha_unique UNIQUE (git_sync_config_id, commit_sha),
    CONSTRAINT git_commits_direction CHECK (direction IN ('push', 'pull'))
);

-- Git branches for multi-variant versioning
CREATE TABLE git_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    git_sync_config_id UUID NOT NULL REFERENCES git_sync_configs(id) ON DELETE CASCADE,

    -- Branch info
    branch_name VARCHAR(255) NOT NULL,
    display_label VARCHAR(255),

    -- Branch state
    head_commit VARCHAR(40),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Variant settings
    variant_config JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT git_branches_unique UNIQUE (git_sync_config_id, branch_name)
);

-- ============================================================================
-- AI & EMBEDDINGS (pgvector)
-- ============================================================================

-- Embeddings for semantic search
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source reference (polymorphic)
    source_type VARCHAR(50) NOT NULL, -- 'page', 'block', 'comment'
    source_id UUID NOT NULL,

    -- Embedding vector (1536 dimensions for OpenAI ada-002)
    embedding vector(1536) NOT NULL,

    -- Metadata
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of source content
    model_version VARCHAR(100) DEFAULT 'text-embedding-ada-002',

    -- Chunk info for long content
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT embeddings_source_chunk_unique UNIQUE (source_type, source_id, chunk_index),
    CONSTRAINT embeddings_source_type CHECK (source_type IN ('page', 'block', 'comment'))
);

-- Search index for faster queries
CREATE TABLE search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source reference
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Searchable content
    title TEXT,
    content TEXT,

    -- Full-text search vectors
    title_vector TSVECTOR,
    content_vector TSVECTOR,

    -- Metadata for filtering
    metadata JSONB DEFAULT '{}',

    -- Boost factors
    boost_score FLOAT DEFAULT 1.0,

    -- Timestamps
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT search_index_source_unique UNIQUE (source_type, source_id)
);

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255), -- Preserved even if user deleted

    -- Organization context
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Action details
    action audit_action NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    resource_name VARCHAR(500),

    -- Change details
    old_values JSONB,
    new_values JSONB,

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id UUID,

    -- Timestamp (no updated_at, audit logs are immutable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- API DOCUMENTATION
-- ============================================================================

-- OpenAPI specifications
CREATE TABLE api_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Spec info
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),

    -- Spec content
    spec_format VARCHAR(20) NOT NULL DEFAULT 'openapi', -- 'openapi', 'swagger'
    spec_version VARCHAR(10), -- '3.0', '3.1', '2.0'
    spec_content JSONB NOT NULL,

    -- Source
    source_type VARCHAR(20) NOT NULL, -- 'upload', 'url'
    source_url TEXT,

    -- Sync settings
    auto_sync BOOLEAN DEFAULT FALSE,
    sync_interval_hours INTEGER DEFAULT 6,
    last_synced_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT api_specs_format CHECK (spec_format IN ('openapi', 'swagger')),
    CONSTRAINT api_specs_source CHECK (source_type IN ('upload', 'url'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Collections
CREATE INDEX idx_collections_org ON collections(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_collections_slug ON collections(organization_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_collections_position ON collections(organization_id, position);

-- Spaces
CREATE INDEX idx_spaces_collection ON spaces(collection_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_slug ON spaces(collection_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_custom_domain ON spaces(custom_domain) WHERE custom_domain IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_spaces_publish_mode ON spaces(publish_mode) WHERE deleted_at IS NULL;
CREATE INDEX idx_spaces_search ON spaces USING GIN(search_vector);

-- Pages
CREATE INDEX idx_pages_space ON pages(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_parent ON pages(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_path ON pages(space_id, path) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_depth ON pages(space_id, depth, position);
CREATE INDEX idx_pages_published ON pages(space_id, is_published) WHERE deleted_at IS NULL;
CREATE INDEX idx_pages_search ON pages USING GIN(search_vector);

-- Users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id) WHERE deleted_at IS NULL;

-- Organization Members
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);

-- Permissions
CREATE INDEX idx_permissions_user ON permissions(user_id);
CREATE INDEX idx_permissions_resource ON permissions(resource_type, resource_id);

-- Sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE revoked_at IS NULL;

-- Blocks
CREATE INDEX idx_blocks_page ON blocks(page_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_blocks_parent ON blocks(parent_block_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_blocks_type ON blocks(page_id, block_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_blocks_position ON blocks(page_id, position);
CREATE INDEX idx_blocks_reusable ON blocks(is_reusable) WHERE is_reusable = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_blocks_search ON blocks USING GIN(search_vector);

-- Page Versions
CREATE INDEX idx_page_versions_page ON page_versions(page_id);
CREATE INDEX idx_page_versions_number ON page_versions(page_id, version_number DESC);
CREATE INDEX idx_page_versions_commit ON page_versions(git_commit_sha) WHERE git_commit_sha IS NOT NULL;

-- Change Requests
CREATE INDEX idx_change_requests_space ON change_requests(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_change_requests_status ON change_requests(space_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_change_requests_author ON change_requests(created_by) WHERE deleted_at IS NULL;

-- Change Request Changes
CREATE INDEX idx_cr_changes_request ON change_request_changes(change_request_id);
CREATE INDEX idx_cr_changes_page ON change_request_changes(page_id);

-- Change Request Comments
CREATE INDEX idx_cr_comments_request ON change_request_comments(change_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cr_comments_page ON change_request_comments(page_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cr_comments_parent ON change_request_comments(parent_comment_id) WHERE deleted_at IS NULL;

-- Git Sync
CREATE INDEX idx_git_sync_space ON git_sync_configs(space_id);
CREATE INDEX idx_git_sync_repo ON git_sync_configs(repository_owner, repository_name);

-- Git Commits
CREATE INDEX idx_git_commits_config ON git_commits(git_sync_config_id);
CREATE INDEX idx_git_commits_sha ON git_commits(commit_sha);
CREATE INDEX idx_git_commits_date ON git_commits(git_sync_config_id, committed_at DESC);

-- Git Branches
CREATE INDEX idx_git_branches_config ON git_branches(git_sync_config_id);
CREATE INDEX idx_git_branches_default ON git_branches(git_sync_config_id) WHERE is_default = TRUE;

-- Embeddings (pgvector indexes)
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Search Index
CREATE INDEX idx_search_space ON search_index(space_id);
CREATE INDEX idx_search_source ON search_index(source_type, source_id);
CREATE INDEX idx_search_title ON search_index USING GIN(title_vector);
CREATE INDEX idx_search_content ON search_index USING GIN(content_vector);

-- Audit Logs
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at DESC);

-- API Specifications
CREATE INDEX idx_api_specs_space ON api_specifications(space_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cr_comments_updated_at BEFORE UPDATE ON change_request_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_git_sync_updated_at BEFORE UPDATE ON git_sync_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_git_branches_updated_at BEFORE UPDATE ON git_branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_embeddings_updated_at BEFORE UPDATE ON embeddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_specs_updated_at BEFORE UPDATE ON api_specifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_page_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector =
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pages_search_vector BEFORE INSERT OR UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_page_search_vector();

-- Function to update space search vector
CREATE OR REPLACE FUNCTION update_space_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector =
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_spaces_search_vector BEFORE INSERT OR UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_space_search_vector();

-- Function to update block search vector
CREATE OR REPLACE FUNCTION update_block_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract text content from JSONB for search
    NEW.search_vector = to_tsvector('english',
        COALESCE(NEW.content->>'text', '') || ' ' ||
        COALESCE(NEW.content->>'title', '') || ' ' ||
        COALESCE(NEW.content->>'code', '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_blocks_search_vector BEFORE INSERT OR UPDATE ON blocks
    FOR EACH ROW EXECUTE FUNCTION update_block_search_vector();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be created based on application authentication context
-- These are placeholder policies - implement based on your auth strategy

-- Example policy for users (can see own record)
CREATE POLICY users_self_policy ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id', true)::uuid);

-- Example policy for organization members
CREATE POLICY org_members_policy ON organization_members
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get effective role for a user in an organization
CREATE OR REPLACE FUNCTION get_user_role(
    p_user_id UUID,
    p_organization_id UUID
) RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role
    FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_organization_id;

    RETURN COALESCE(v_role, 'visitor');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has permission on resource
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_required_role user_role
) RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_user_role user_role;
    v_resource_role user_role;
    v_role_hierarchy INTEGER;
    v_required_hierarchy INTEGER;
BEGIN
    -- Get role hierarchy values
    v_role_hierarchy := CASE
        WHEN p_required_role = 'admin' THEN 5
        WHEN p_required_role = 'creator' THEN 4
        WHEN p_required_role = 'editor' THEN 3
        WHEN p_required_role = 'commenter' THEN 2
        WHEN p_required_role = 'visitor' THEN 1
    END;

    -- Check direct permission on resource
    SELECT role INTO v_resource_role
    FROM permissions
    WHERE user_id = p_user_id
      AND resource_type = p_resource_type
      AND resource_id = p_resource_id;

    IF v_resource_role IS NOT NULL THEN
        v_required_hierarchy := CASE
            WHEN v_resource_role = 'admin' THEN 5
            WHEN v_resource_role = 'creator' THEN 4
            WHEN v_resource_role = 'editor' THEN 3
            WHEN v_resource_role = 'commenter' THEN 2
            WHEN v_resource_role = 'visitor' THEN 1
        END;
        RETURN v_required_hierarchy >= v_role_hierarchy;
    END IF;

    -- Fall back to organization role
    -- Get organization ID based on resource type
    CASE p_resource_type
        WHEN 'collection' THEN
            SELECT organization_id INTO v_org_id FROM collections WHERE id = p_resource_id;
        WHEN 'space' THEN
            SELECT c.organization_id INTO v_org_id
            FROM spaces s JOIN collections c ON s.collection_id = c.id
            WHERE s.id = p_resource_id;
        WHEN 'page' THEN
            SELECT c.organization_id INTO v_org_id
            FROM pages p
            JOIN spaces s ON p.space_id = s.id
            JOIN collections c ON s.collection_id = c.id
            WHERE p.id = p_resource_id;
    END CASE;

    IF v_org_id IS NULL THEN
        RETURN FALSE;
    END IF;

    v_user_role := get_user_role(p_user_id, v_org_id);

    v_required_hierarchy := CASE
        WHEN v_user_role = 'admin' THEN 5
        WHEN v_user_role = 'creator' THEN 4
        WHEN v_user_role = 'editor' THEN 3
        WHEN v_user_role = 'commenter' THEN 2
        WHEN v_user_role = 'visitor' THEN 1
    END;

    RETURN v_required_hierarchy >= v_role_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to perform semantic search using pgvector
CREATE OR REPLACE FUNCTION semantic_search(
    p_space_id UUID,
    p_query_embedding vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
    source_type VARCHAR(50),
    source_id UUID,
    chunk_text TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.source_type,
        e.source_id,
        e.chunk_text,
        1 - (e.embedding <=> p_query_embedding) as similarity
    FROM embeddings e
    JOIN search_index si ON e.source_type = si.source_type AND e.source_id = si.source_id
    WHERE si.space_id = p_space_id
      AND 1 - (e.embedding <=> p_query_embedding) >= p_similarity_threshold
    ORDER BY e.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'Root administrative container for billing, identity management, and user membership';
COMMENT ON TABLE collections IS 'Aggregation layer for Spaces with permission inheritance and cascading access rules';
COMMENT ON TABLE spaces IS 'Fundamental unit of work containing Git sync configuration and documentation sets';
COMMENT ON TABLE pages IS 'Granular content units with nested structure and Markdown serialization support';
COMMENT ON TABLE blocks IS 'Individual content units within pages using JSONB for flexible content storage';
COMMENT ON TABLE users IS 'User accounts with support for multiple auth providers';
COMMENT ON TABLE organization_members IS 'Junction table for user-organization membership with role assignment';
COMMENT ON TABLE permissions IS 'Granular permissions that override organization-level roles';
COMMENT ON TABLE sessions IS 'Active user sessions for authentication tracking';
COMMENT ON TABLE page_versions IS 'Version history for pages with content snapshots';
COMMENT ON TABLE change_requests IS 'Draft workflow for collaborative content editing';
COMMENT ON TABLE git_sync_configs IS 'Git repository synchronization configuration per space';
COMMENT ON TABLE git_commits IS 'Tracking of Git commits for bi-directional sync';
COMMENT ON TABLE git_branches IS 'Multi-variant versioning through Git branch mapping';
COMMENT ON TABLE embeddings IS 'AI embeddings for semantic search using pgvector';
COMMENT ON TABLE search_index IS 'Full-text search index for fast queries';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all system changes';
COMMENT ON TABLE api_specifications IS 'OpenAPI specifications for interactive API documentation';
