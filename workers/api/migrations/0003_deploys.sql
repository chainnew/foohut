-- ============================================================================
-- foohut.com D1 Deploys Migration
-- Deploy history and status tracking for projects
-- ============================================================================

-- ============================================================================
-- PROJECT DEPLOYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_deploys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_id TEXT REFERENCES project_commits(id),
  deployed_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'building', 'uploading', 'success', 'failed', 'cancelled')),
  url TEXT,
  preview_url TEXT,
  is_production INTEGER DEFAULT 0,
  build_logs TEXT,
  error_message TEXT,
  build_duration_ms INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE INDEX idx_project_deploys_project ON project_deploys(project_id);
CREATE INDEX idx_project_deploys_status ON project_deploys(project_id, status);
CREATE INDEX idx_project_deploys_created ON project_deploys(project_id, created_at DESC);
CREATE INDEX idx_project_deploys_production ON project_deploys(project_id, is_production);

-- ============================================================================
-- COMMIT FILE SNAPSHOTS (for restoring versions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS commit_file_snapshots (
  id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL REFERENCES project_commits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content_hash TEXT,
  content TEXT,
  action TEXT CHECK(action IN ('add', 'modify', 'delete')),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_commit_snapshots_commit ON commit_file_snapshots(commit_id);
CREATE INDEX idx_commit_snapshots_path ON commit_file_snapshots(commit_id, file_path);
