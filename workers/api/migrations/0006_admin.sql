-- ============================================================================
-- foohut.com D1 Admin Migration
-- Admin dashboard data + controls
-- ============================================================================

-- ============================================================================
-- USERS (admin fields)
-- ============================================================================

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN admin_role TEXT;

CREATE INDEX IF NOT EXISTS users_plan_idx ON users(plan);
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);
CREATE INDEX IF NOT EXISTS users_admin_idx ON users(is_admin);

-- ============================================================================
-- ADMIN METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_metrics (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  delta TEXT,
  tone TEXT,
  detail TEXT,
  meta TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_metrics_category_idx ON admin_metrics(category);

-- ============================================================================
-- ADMIN ITEMS (generic list records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT,
  severity TEXT,
  detail TEXT,
  meta TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_items_category_idx ON admin_items(category);
CREATE INDEX IF NOT EXISTS admin_items_status_idx ON admin_items(status);

-- ============================================================================
-- FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_feature_flags_key_idx ON admin_feature_flags(key);

-- ============================================================================
-- MAINTENANCE WINDOWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_maintenance_windows (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_maintenance_windows_status_idx ON admin_maintenance_windows(status);

-- ============================================================================
-- OPERATIONAL LOCKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_operational_locks (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_operational_locks_key_idx ON admin_operational_locks(key);

-- ============================================================================
-- ANNOUNCEMENTS / CAMPAIGNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  audience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  scheduled_at TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_announcements_status_idx ON admin_announcements(status);

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_support_tickets (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  requester_handle TEXT,
  requester_id TEXT REFERENCES users(id),
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_support_tickets_status_idx ON admin_support_tickets(status);
CREATE INDEX IF NOT EXISTS admin_support_tickets_priority_idx ON admin_support_tickets(priority);

-- ============================================================================
-- API KEYS (Admin registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_api_keys (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  owner TEXT NOT NULL,
  scope TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS admin_api_keys_owner_idx ON admin_api_keys(owner);

-- ============================================================================
-- STAFF MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_staff_members (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  role_title TEXT,
  group_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_staff_members_group_idx ON admin_staff_members(group_label);

-- ============================================================================
-- ROLE PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  id TEXT PRIMARY KEY,
  permission TEXT NOT NULL,
  super TEXT NOT NULL,
  platform TEXT NOT NULL,
  ops TEXT NOT NULL,
  security TEXT NOT NULL,
  moderator TEXT NOT NULL,
  support TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_role_permissions_permission_idx ON admin_role_permissions(permission);

-- ============================================================================
-- STAFF PRESENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_staff_presence (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  type TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_staff_presence_type_idx ON admin_staff_presence(type);

-- ============================================================================
-- SHIFT SCHEDULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_shift_schedule (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  time_range TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_shift_schedule_label_idx ON admin_shift_schedule(label);
