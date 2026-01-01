-- ============================================================================
-- foohut.com D1 Community Migration
-- IRC-style chat, friends, notifications, badges, activities
-- Based on: foohut-community-scope.md
-- ============================================================================

-- ============================================================================
-- CHANNELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT DEFAULT 'public' CHECK(type IN ('public', 'private', 'org', 'dm')),
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  is_default INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  last_message_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_channels_type ON channels(type);
CREATE INDEX idx_channels_org ON channels(org_id);
CREATE INDEX idx_channels_default ON channels(is_default);

-- ============================================================================
-- CHANNEL MEMBERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  joined_at INTEGER DEFAULT (unixepoch()),
  last_read_at INTEGER,
  notifications TEXT DEFAULT 'all' CHECK(notifications IN ('all', 'mentions', 'none')),
  PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX idx_channel_members_user ON channel_members(user_id);

-- ============================================================================
-- MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK(type IN ('text', 'action', 'system', 'file')),
  reply_to TEXT REFERENCES messages(id),
  edited_at INTEGER,
  deleted_at INTEGER,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_reply ON messages(reply_to);

-- ============================================================================
-- DM CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dm_conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'dm' CHECK(type IN ('dm', 'group')),
  last_message_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS dm_participants (
  conversation_id TEXT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_dm_participants_user ON dm_participants(user_id);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK(type IN ('text', 'action', 'file')),
  edited_at INTEGER,
  deleted_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_dm_messages_conversation ON dm_messages(conversation_id, created_at DESC);

-- ============================================================================
-- MESSAGE REACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

-- ============================================================================
-- FRIENDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  responded_at INTEGER,
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX idx_friend_requests_to ON friend_requests(to_user_id, status);
CREATE INDEX idx_friend_requests_from ON friend_requests(from_user_id);

CREATE TABLE IF NOT EXISTS friendships (
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX idx_friendships_a ON friendships(user_a);
CREATE INDEX idx_friendships_b ON friendships(user_b);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  link TEXT,
  actor_id TEXT REFERENCES users(id),
  read_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ============================================================================
-- DEFAULT CHANNELS (Insert on first run)
-- ============================================================================

INSERT OR IGNORE INTO channels (id, name, slug, description, type, is_default, created_at) VALUES
  ('ch_foohut', 'foohut', 'foohut', 'General chat and announcements', 'public', 1, unixepoch()),
  ('ch_help', 'help', 'help', 'Get help with FooHut or code', 'public', 1, unixepoch()),
  ('ch_lookingfor', 'lookingfor', 'lookingfor', 'Find collaborators (LFG)', 'public', 0, unixepoch()),
  ('ch_showcase', 'showcase', 'showcase', 'Share your projects', 'public', 0, unixepoch()),
  ('ch_cybersec', 'cybersec', 'cybersec', 'Security discussions', 'public', 0, unixepoch()),
  ('ch_frontend', 'frontend', 'frontend', 'Frontend dev chat', 'public', 0, unixepoch()),
  ('ch_backend', 'backend', 'backend', 'Backend/infra chat', 'public', 0, unixepoch()),
  ('ch_rust', 'rust', 'rust', 'Rust programming', 'public', 0, unixepoch()),
  ('ch_python', 'python', 'python', 'Python programming', 'public', 0, unixepoch()),
  ('ch_ai_ml', 'ai-ml', 'ai-ml', 'AI/ML discussions', 'public', 0, unixepoch()),
  ('ch_offtopic', 'off-topic', 'off-topic', 'Random, memes, vibes', 'public', 0, unixepoch());

-- ============================================================================
-- USER STATS (denormalized for performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  projects_count INTEGER DEFAULT 0,
  stars_received INTEGER DEFAULT 0,
  stars_given INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  docs_count INTEGER DEFAULT 0,
  commits_count INTEGER DEFAULT 0
);

-- ============================================================================
-- BADGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria TEXT
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  awarded_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, badge_id)
);

-- ============================================================================
-- ACTIVITY FEED
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);

-- ============================================================================
-- ORG INVITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT,
  invited_by TEXT REFERENCES users(id),
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER,
  accepted_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_org_invites_org ON org_invites(org_id);
CREATE INDEX idx_org_invites_token ON org_invites(token);

-- ============================================================================
-- TEAMS (for organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ============================================================================
-- DEFAULT BADGES
-- ============================================================================

INSERT OR IGNORE INTO badges (id, name, description, icon) VALUES
  ('badge_early_adopter', 'Early Adopter', 'Joined FooHut in the early days', '🌟'),
  ('badge_100_commits', '100 Commits', 'Made 100 commits across all projects', '💯'),
  ('badge_helpful', 'Helpful', 'Answered questions in #help', '🤝'),
  ('badge_bug_hunter', 'Bug Hunter', 'Reported bugs that got fixed', '🐛'),
  ('badge_contributor', 'Contributor', 'Contributed to FooHut itself', '🛠️'),
  ('badge_popular', 'Popular', 'Project got 100 stars', '🔥'),
  ('badge_verified', 'Verified', 'Verified email and profile', '✓');
