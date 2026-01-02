-- ============================================================================
-- foohut.com D1 API Logs Migration
-- Server-side request/response logging for admin visibility
-- ============================================================================

-- ============================================================================
-- API LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER,
  duration_ms INTEGER,
  user_id TEXT,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  error TEXT,
  error_stack TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS api_logs_timestamp_idx ON api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS api_logs_level_idx ON api_logs(level);
CREATE INDEX IF NOT EXISTS api_logs_path_idx ON api_logs(path);
CREATE INDEX IF NOT EXISTS api_logs_status_idx ON api_logs(status);
CREATE INDEX IF NOT EXISTS api_logs_user_id_idx ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS api_logs_created_at_idx ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS api_logs_level_timestamp_idx ON api_logs(level, timestamp DESC);
