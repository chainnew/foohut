-- ============================================================================
-- foohut.com D1 Profiles + Roles Migration
-- Kinde profile linkage, roles, onboarding, and reserved usernames
-- ============================================================================

-- ============================================================================
-- USERS (profile linkage + roles)
-- ============================================================================

ALTER TABLE users ADD COLUMN kinde_id TEXT;
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN onboarded_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_kinde_id_idx ON users(kinde_id) WHERE kinde_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_onboarded_idx ON users(onboarded_at);

-- ============================================================================
-- RESERVED USERNAMES
-- ============================================================================

CREATE TABLE IF NOT EXISTS reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT
);

INSERT OR IGNORE INTO reserved_usernames (username, reason) VALUES
  ('admin', 'system'),
  ('api', 'system'),
  ('www', 'system'),
  ('foohut', 'brand');
