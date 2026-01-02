-- Allowed emails whitelist for authentication
-- Only emails in this table can log in when registration is disabled

CREATE TABLE IF NOT EXISTS allowed_emails (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  added_by TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (added_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_allowed_emails_email ON allowed_emails(email);

-- Seed with admin email
INSERT OR IGNORE INTO allowed_emails (id, email, note, created_at)
VALUES (
  'ae_' || lower(hex(randomblob(8))),
  'matt@foohut.com',
  'Primary admin',
  datetime('now')
);
