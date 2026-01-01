-- ============================================================================
-- foohut.com D1 Initial Migration
-- SQLite schema for Cloudflare D1
-- ============================================================================

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  auth_provider_id TEXT,
  preferences TEXT NOT NULL DEFAULT '{}',
  notification_settings TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_auth_provider_idx ON users(auth_provider, auth_provider_id);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(is_active);

-- ============================================================================
-- SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT NOT NULL DEFAULT '{}',
  expires_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revoked_reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- ============================================================================
-- ACCOUNTS (OAuth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  provider_data TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_idx ON accounts(provider, provider_account_id);

-- ============================================================================
-- VERIFICATION TOKENS
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS verification_tokens_identifier_idx ON verification_tokens(identifier);
CREATE UNIQUE INDEX IF NOT EXISTS verification_tokens_token_idx ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS verification_tokens_expires_at_idx ON verification_tokens(expires_at);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  billing_info TEXT NOT NULL DEFAULT '{}',
  features TEXT NOT NULL DEFAULT '{}',
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_idx ON organizations(slug);
CREATE INDEX IF NOT EXISTS organizations_created_at_idx ON organizations(created_at);

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  invited_by TEXT REFERENCES users(id),
  invited_at INTEGER,
  accepted_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_idx ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_role_idx ON organization_members(role);

-- ============================================================================
-- ORGANIZATION INVITATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_token_idx ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS organization_invitations_org_email_idx ON organization_invitations(organization_id, email);
CREATE INDEX IF NOT EXISTS organization_invitations_expires_at_idx ON organization_invitations(expires_at);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS permissions_user_resource_idx ON permissions(user_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS permissions_resource_idx ON permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS permissions_user_id_idx ON permissions(user_id);

-- ============================================================================
-- COLLECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  settings TEXT NOT NULL DEFAULT '{}',
  inherit_permissions INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS collections_org_slug_idx ON collections(organization_id, slug);
CREATE INDEX IF NOT EXISTS collections_org_id_idx ON collections(organization_id);
CREATE INDEX IF NOT EXISTS collections_position_idx ON collections(position);

-- ============================================================================
-- SPACES
-- ============================================================================

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  publish_mode TEXT NOT NULL DEFAULT 'private',
  custom_domain TEXT UNIQUE,
  custom_domain_verified INTEGER NOT NULL DEFAULT 0,
  shareable_link_token TEXT NOT NULL,
  theme_config TEXT NOT NULL DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS spaces_collection_slug_idx ON spaces(collection_id, slug);
CREATE INDEX IF NOT EXISTS spaces_collection_id_idx ON spaces(collection_id);
CREATE INDEX IF NOT EXISTS spaces_custom_domain_idx ON spaces(custom_domain);
CREATE INDEX IF NOT EXISTS spaces_publish_mode_idx ON spaces(publish_mode);
CREATE INDEX IF NOT EXISTS spaces_position_idx ON spaces(position);

-- ============================================================================
-- PAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_id TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  path TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  page_type TEXT NOT NULL DEFAULT 'document',
  template_id TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER,
  seo_title TEXT,
  seo_description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_space_path_idx ON pages(space_id, path);
CREATE INDEX IF NOT EXISTS pages_space_id_idx ON pages(space_id);
CREATE INDEX IF NOT EXISTS pages_parent_id_idx ON pages(parent_id);
CREATE INDEX IF NOT EXISTS pages_published_idx ON pages(is_published);
CREATE INDEX IF NOT EXISTS pages_position_idx ON pages(position);
CREATE INDEX IF NOT EXISTS pages_path_idx ON pages(path);

-- ============================================================================
-- BLOCKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  parent_block_id TEXT,
  block_type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '{}',
  language TEXT,
  is_reusable INTEGER NOT NULL DEFAULT 0,
  reusable_block_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS blocks_page_id_idx ON blocks(page_id);
CREATE INDEX IF NOT EXISTS blocks_parent_block_id_idx ON blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS blocks_position_idx ON blocks(position);
CREATE INDEX IF NOT EXISTS blocks_block_type_idx ON blocks(block_type);
CREATE INDEX IF NOT EXISTS blocks_reusable_idx ON blocks(is_reusable);

-- ============================================================================
-- PAGE VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS page_versions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_snapshot TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  change_summary TEXT,
  git_commit_sha TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS page_versions_page_version_idx ON page_versions(page_id, version_number);
CREATE INDEX IF NOT EXISTS page_versions_page_id_idx ON page_versions(page_id);
CREATE INDEX IF NOT EXISTS page_versions_git_commit_idx ON page_versions(git_commit_sha);

-- ============================================================================
-- AI CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
  page_id TEXT REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT,
  context TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS ai_conversations_space_id_idx ON ai_conversations(space_id);
CREATE INDEX IF NOT EXISTS ai_conversations_page_id_idx ON ai_conversations(page_id);
CREATE INDEX IF NOT EXISTS ai_conversations_active_idx ON ai_conversations(is_active);

-- ============================================================================
-- AI MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_id_idx ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS ai_messages_role_idx ON ai_messages(role);
CREATE INDEX IF NOT EXISTS ai_messages_created_at_idx ON ai_messages(created_at);
