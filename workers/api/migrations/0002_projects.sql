-- ============================================================================
-- foohut.com D1 Projects Migration
-- Developer Portal tables for projects, files, collaborators, and social features
-- ============================================================================

-- ============================================================================
-- USER FOLLOWS (Social Feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'private' CHECK(visibility IN ('public', 'semi_public', 'private')),
  showcase_description TEXT,
  tech_stack TEXT,
  looking_for TEXT,
  readme_content TEXT,
  default_branch TEXT DEFAULT 'main',
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  forked_from_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(owner_id, slug)
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_stars ON projects(stars_count DESC);
CREATE INDEX idx_projects_created ON projects(created_at DESC);
CREATE INDEX idx_projects_forked_from ON projects(forked_from_id);

-- ============================================================================
-- PROJECT FILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content_hash TEXT,
  content TEXT,
  is_directory INTEGER DEFAULT 0,
  size INTEGER DEFAULT 0,
  language TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(project_id, path)
);

CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_path ON project_files(project_id, path);
CREATE INDEX idx_project_files_directory ON project_files(project_id, is_directory);

-- ============================================================================
-- PROJECT COLLABORATORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_collaborators (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK(role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_collaborators_user ON project_collaborators(user_id);
CREATE INDEX idx_project_collaborators_role ON project_collaborators(project_id, role);

-- ============================================================================
-- PROJECT STARS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_stars (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_stars_user ON project_stars(user_id);
CREATE INDEX idx_project_stars_project ON project_stars(project_id);

-- ============================================================================
-- ACCESS REQUESTS (for semi-public projects)
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'declined')),
  responded_by TEXT REFERENCES users(id),
  response_message TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  responded_at INTEGER
);

CREATE INDEX idx_access_requests_project ON access_requests(project_id);
CREATE INDEX idx_access_requests_user ON access_requests(user_id);
CREATE INDEX idx_access_requests_status ON access_requests(project_id, status);

-- ============================================================================
-- PROJECT COMMITS (Version History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_commits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  parent_commit_id TEXT REFERENCES project_commits(id),
  files_changed INTEGER DEFAULT 0,
  insertions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_project_commits_project ON project_commits(project_id);
CREATE INDEX idx_project_commits_author ON project_commits(author_id);
CREATE INDEX idx_project_commits_created ON project_commits(project_id, created_at DESC);

-- ============================================================================
-- PROJECT BRANCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_commit_id TEXT REFERENCES project_commits(id),
  is_default INTEGER DEFAULT 0,
  is_protected INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_project_branches_project ON project_branches(project_id);
CREATE INDEX idx_project_branches_default ON project_branches(project_id, is_default);
