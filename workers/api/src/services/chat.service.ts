/**
 * Chat Service
 * IRC-style chat with channels, DMs, and presence
 */

export interface ChannelRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: 'public' | 'private' | 'org' | 'dm';
  org_id: string | null;
  created_by: string | null;
  is_default: number;
  member_count: number;
  last_message_at: number | null;
  created_at: number;
}

export interface ChannelMemberRecord {
  channel_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: number;
  last_read_at: number | null;
  notifications: 'all' | 'mentions' | 'none';
}

export interface MessageRecord {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'action' | 'system' | 'file';
  reply_to: string | null;
  edited_at: number | null;
  deleted_at: number | null;
  metadata: string | null;
  created_at: number;
}

export interface MessageWithUser extends MessageRecord {
  user_display_name: string | null;
  user_email: string;
  user_avatar_url: string | null;
}

export interface DMConversationRecord {
  id: string;
  type: 'dm' | 'group';
  last_message_at: number | null;
  created_at: number;
}

export interface DMMessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'action' | 'file';
  edited_at: number | null;
  deleted_at: number | null;
  created_at: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// CHANNELS
// ============================================================================

export async function listChannels(
  db: D1Database,
  type?: 'public' | 'private' | 'org',
  orgId?: string
): Promise<ChannelRecord[]> {
  let query = 'SELECT * FROM channels WHERE 1=1';
  const params: (string | number)[] = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (orgId) {
    query += ' AND org_id = ?';
    params.push(orgId);
  }

  query += ' ORDER BY is_default DESC, member_count DESC, name ASC';

  const result = await db.prepare(query).bind(...params).all<ChannelRecord>();
  return result.results || [];
}

export async function getChannel(
  db: D1Database,
  channelId: string
): Promise<ChannelRecord | null> {
  return db.prepare('SELECT * FROM channels WHERE id = ?')
    .bind(channelId)
    .first<ChannelRecord>();
}

export async function getChannelBySlug(
  db: D1Database,
  slug: string
): Promise<ChannelRecord | null> {
  return db.prepare('SELECT * FROM channels WHERE slug = ?')
    .bind(slug)
    .first<ChannelRecord>();
}

export async function createChannel(
  db: D1Database,
  createdBy: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    type?: 'public' | 'private' | 'org';
    orgId?: string;
  }
): Promise<ChannelRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO channels (id, name, slug, description, type, org_id, created_by, member_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
  )
    .bind(id, data.name, data.slug, data.description || null, data.type || 'public', data.orgId || null, createdBy, now)
    .run();

  // Auto-join creator
  await db.prepare(
    `INSERT INTO channel_members (channel_id, user_id, role, joined_at)
     VALUES (?, ?, 'owner', ?)`
  )
    .bind(id, createdBy, now)
    .run();

  return {
    id,
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    type: data.type || 'public',
    org_id: data.orgId || null,
    created_by: createdBy,
    is_default: 0,
    member_count: 1,
    last_message_at: null,
    created_at: now,
  };
}

export async function getUserChannels(
  db: D1Database,
  userId: string
): Promise<ChannelRecord[]> {
  const result = await db.prepare(
    `SELECT c.* FROM channels c
     INNER JOIN channel_members cm ON c.id = cm.channel_id
     WHERE cm.user_id = ?
     ORDER BY c.last_message_at DESC NULLS LAST, c.name ASC`
  )
    .bind(userId)
    .all<ChannelRecord>();

  return result.results || [];
}

export async function joinChannel(
  db: D1Database,
  channelId: string,
  userId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  // Check if already a member
  const existing = await db.prepare(
    'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
  )
    .bind(channelId, userId)
    .first();

  if (existing) return false;

  await db.prepare(
    `INSERT INTO channel_members (channel_id, user_id, role, joined_at)
     VALUES (?, ?, 'member', ?)`
  )
    .bind(channelId, userId, now)
    .run();

  // Update member count
  await db.prepare(
    'UPDATE channels SET member_count = member_count + 1 WHERE id = ?'
  )
    .bind(channelId)
    .run();

  return true;
}

export async function leaveChannel(
  db: D1Database,
  channelId: string,
  userId: string
): Promise<boolean> {
  const result = await db.prepare(
    'DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?'
  )
    .bind(channelId, userId)
    .run();

  if (result.meta.changes > 0) {
    await db.prepare(
      'UPDATE channels SET member_count = member_count - 1 WHERE id = ?'
    )
      .bind(channelId)
      .run();
    return true;
  }

  return false;
}

export async function isChannelMember(
  db: D1Database,
  channelId: string,
  userId: string
): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?'
  )
    .bind(channelId, userId)
    .first();

  return !!result;
}

export async function getChannelMembers(
  db: D1Database,
  channelId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<{ user_id: string; display_name: string | null; email: string; role: string; joined_at: number }>> {
  const result = await db.prepare(
    `SELECT cm.user_id, u.display_name, u.email, cm.role, cm.joined_at
     FROM channel_members cm
     INNER JOIN users u ON cm.user_id = u.id
     WHERE cm.channel_id = ?
     ORDER BY cm.role DESC, cm.joined_at ASC
     LIMIT ? OFFSET ?`
  )
    .bind(channelId, limit, offset)
    .all<{ user_id: string; display_name: string | null; email: string; role: string; joined_at: number }>();

  return result.results || [];
}

// ============================================================================
// MESSAGES
// ============================================================================

export async function getMessages(
  db: D1Database,
  channelId: string,
  limit: number = 50,
  before?: number
): Promise<MessageWithUser[]> {
  let query = `
    SELECT m.*, u.display_name as user_display_name, u.email as user_email, u.avatar_url as user_avatar_url
    FROM messages m
    INNER JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ? AND m.deleted_at IS NULL
  `;
  const params: (string | number)[] = [channelId];

  if (before) {
    query += ' AND m.created_at < ?';
    params.push(before);
  }

  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(limit);

  const result = await db.prepare(query).bind(...params).all<MessageWithUser>();
  return (result.results || []).reverse();
}

export async function sendMessage(
  db: D1Database,
  channelId: string,
  userId: string,
  content: string,
  type: 'text' | 'action' | 'system' = 'text',
  replyTo?: string,
  metadata?: Record<string, unknown>
): Promise<MessageRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO messages (id, channel_id, user_id, content, type, reply_to, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, channelId, userId, content, type, replyTo || null, metadata ? JSON.stringify(metadata) : null, now)
    .run();

  // Update channel last_message_at
  await db.prepare(
    'UPDATE channels SET last_message_at = ? WHERE id = ?'
  )
    .bind(now, channelId)
    .run();

  return {
    id,
    channel_id: channelId,
    user_id: userId,
    content,
    type,
    reply_to: replyTo || null,
    edited_at: null,
    deleted_at: null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    created_at: now,
  };
}

export async function editMessage(
  db: D1Database,
  messageId: string,
  userId: string,
  newContent: string
): Promise<MessageRecord | null> {
  const now = Math.floor(Date.now() / 1000);

  // Only allow editing own messages
  const result = await db.prepare(
    'UPDATE messages SET content = ?, edited_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  )
    .bind(newContent, now, messageId, userId)
    .run();

  if (result.meta.changes === 0) return null;

  return db.prepare('SELECT * FROM messages WHERE id = ?')
    .bind(messageId)
    .first<MessageRecord>();
}

export async function deleteMessage(
  db: D1Database,
  messageId: string,
  userId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'UPDATE messages SET deleted_at = ? WHERE id = ? AND user_id = ?'
  )
    .bind(now, messageId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function addReaction(
  db: D1Database,
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  try {
    await db.prepare(
      `INSERT INTO message_reactions (id, message_id, user_id, emoji, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(id, messageId, userId, emoji, now)
      .run();
    return true;
  } catch {
    return false; // Already reacted
  }
}

export async function removeReaction(
  db: D1Database,
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  const result = await db.prepare(
    'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
  )
    .bind(messageId, userId, emoji)
    .run();

  return result.meta.changes > 0;
}

export async function getMessageReactions(
  db: D1Database,
  messageId: string
): Promise<Array<{ emoji: string; count: number; users: string[] }>> {
  const result = await db.prepare(
    `SELECT emoji, GROUP_CONCAT(user_id) as users, COUNT(*) as count
     FROM message_reactions
     WHERE message_id = ?
     GROUP BY emoji`
  )
    .bind(messageId)
    .all<{ emoji: string; users: string; count: number }>();

  return (result.results || []).map(r => ({
    emoji: r.emoji,
    count: r.count,
    users: r.users.split(','),
  }));
}

// ============================================================================
// DIRECT MESSAGES
// ============================================================================

export async function getOrCreateDMConversation(
  db: D1Database,
  userId1: string,
  userId2: string
): Promise<DMConversationRecord> {
  // Check if conversation exists
  const existing = await db.prepare(
    `SELECT dc.* FROM dm_conversations dc
     INNER JOIN dm_participants dp1 ON dc.id = dp1.conversation_id AND dp1.user_id = ?
     INNER JOIN dm_participants dp2 ON dc.id = dp2.conversation_id AND dp2.user_id = ?
     WHERE dc.type = 'dm'`
  )
    .bind(userId1, userId2)
    .first<DMConversationRecord>();

  if (existing) return existing;

  // Create new conversation
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO dm_conversations (id, type, created_at)
     VALUES (?, 'dm', ?)`
  )
    .bind(id, now)
    .run();

  await db.prepare(
    `INSERT INTO dm_participants (conversation_id, user_id, created_at)
     VALUES (?, ?, ?), (?, ?, ?)`
  )
    .bind(id, userId1, now, id, userId2, now)
    .run();

  return {
    id,
    type: 'dm',
    last_message_at: null,
    created_at: now,
  };
}

export async function getUserDMConversations(
  db: D1Database,
  userId: string
): Promise<Array<DMConversationRecord & { other_user_id: string; other_user_name: string | null; other_user_email: string }>> {
  const result = await db.prepare(
    `SELECT dc.*, dp2.user_id as other_user_id, u.display_name as other_user_name, u.email as other_user_email
     FROM dm_conversations dc
     INNER JOIN dm_participants dp1 ON dc.id = dp1.conversation_id AND dp1.user_id = ?
     INNER JOIN dm_participants dp2 ON dc.id = dp2.conversation_id AND dp2.user_id != ?
     INNER JOIN users u ON dp2.user_id = u.id
     ORDER BY dc.last_message_at DESC NULLS LAST`
  )
    .bind(userId, userId)
    .all<DMConversationRecord & { other_user_id: string; other_user_name: string | null; other_user_email: string }>();

  return result.results || [];
}

export async function getDMMessages(
  db: D1Database,
  conversationId: string,
  limit: number = 50,
  before?: number
): Promise<DMMessageRecord[]> {
  let query = `
    SELECT * FROM dm_messages
    WHERE conversation_id = ? AND deleted_at IS NULL
  `;
  const params: (string | number)[] = [conversationId];

  if (before) {
    query += ' AND created_at < ?';
    params.push(before);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const result = await db.prepare(query).bind(...params).all<DMMessageRecord>();
  return (result.results || []).reverse();
}

export async function sendDMMessage(
  db: D1Database,
  conversationId: string,
  userId: string,
  content: string
): Promise<DMMessageRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO dm_messages (id, conversation_id, user_id, content, type, created_at)
     VALUES (?, ?, ?, ?, 'text', ?)`
  )
    .bind(id, conversationId, userId, content, now)
    .run();

  // Update conversation last_message_at
  await db.prepare(
    'UPDATE dm_conversations SET last_message_at = ? WHERE id = ?'
  )
    .bind(now, conversationId)
    .run();

  return {
    id,
    conversation_id: conversationId,
    user_id: userId,
    content,
    type: 'text',
    edited_at: null,
    deleted_at: null,
    created_at: now,
  };
}

// ============================================================================
// AUTO-JOIN DEFAULT CHANNELS
// ============================================================================

export async function joinDefaultChannels(
  db: D1Database,
  userId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // Get default channels
  const defaultChannels = await db.prepare(
    'SELECT id FROM channels WHERE is_default = 1'
  )
    .all<{ id: string }>();

  for (const channel of defaultChannels.results || []) {
    try {
      await db.prepare(
        `INSERT OR IGNORE INTO channel_members (channel_id, user_id, role, joined_at)
         VALUES (?, ?, 'member', ?)`
      )
        .bind(channel.id, userId, now)
        .run();
    } catch {
      // Ignore if already a member
    }
  }
}
