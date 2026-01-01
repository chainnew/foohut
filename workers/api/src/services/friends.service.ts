/**
 * Friends Service
 * Mutual friend system with requests, notifications, and activity
 */

export interface FriendRequestRecord {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string | null;
  created_at: number;
  responded_at: number | null;
}

export interface FriendRequestWithUser extends FriendRequestRecord {
  from_user_display_name: string | null;
  from_user_email: string;
  from_user_avatar_url: string | null;
  to_user_display_name: string | null;
  to_user_email: string;
  to_user_avatar_url: string | null;
}

export interface FriendRecord {
  user_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: number;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  read_at: number | null;
  created_at: number;
}

export interface ActivityRecord {
  id: string;
  user_id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string | null;
  created_at: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// FRIEND REQUESTS
// ============================================================================

export async function sendFriendRequest(
  db: D1Database,
  fromUserId: string,
  toUserId: string,
  message?: string
): Promise<FriendRequestRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  // Check if already friends
  const existingFriendship = await areFriends(db, fromUserId, toUserId);
  if (existingFriendship) {
    throw new Error('Already friends');
  }

  // Check if request already exists
  const existingRequest = await db.prepare(
    `SELECT * FROM friend_requests 
     WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
     AND status = 'pending'`
  )
    .bind(fromUserId, toUserId, toUserId, fromUserId)
    .first();

  if (existingRequest) {
    throw new Error('Friend request already pending');
  }

  await db.prepare(
    `INSERT INTO friend_requests (id, from_user_id, to_user_id, status, message, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`
  )
    .bind(id, fromUserId, toUserId, message || null, now)
    .run();

  // Create notification for recipient
  await createNotification(db, toUserId, 'friend_request', {
    title: 'New friend request',
    body: 'Someone wants to be your friend',
    link: '/friends/requests',
    actorId: fromUserId,
  });

  return {
    id,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: 'pending',
    message: message || null,
    created_at: now,
    responded_at: null,
  };
}

export async function getPendingRequests(
  db: D1Database,
  userId: string
): Promise<FriendRequestWithUser[]> {
  const result = await db.prepare(
    `SELECT fr.*,
            fu.display_name as from_user_display_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar_url,
            tu.display_name as to_user_display_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar_url
     FROM friend_requests fr
     INNER JOIN users fu ON fr.from_user_id = fu.id
     INNER JOIN users tu ON fr.to_user_id = tu.id
     WHERE fr.to_user_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`
  )
    .bind(userId)
    .all<FriendRequestWithUser>();

  return result.results || [];
}

export async function getSentRequests(
  db: D1Database,
  userId: string
): Promise<FriendRequestWithUser[]> {
  const result = await db.prepare(
    `SELECT fr.*,
            fu.display_name as from_user_display_name, fu.email as from_user_email, fu.avatar_url as from_user_avatar_url,
            tu.display_name as to_user_display_name, tu.email as to_user_email, tu.avatar_url as to_user_avatar_url
     FROM friend_requests fr
     INNER JOIN users fu ON fr.from_user_id = fu.id
     INNER JOIN users tu ON fr.to_user_id = tu.id
     WHERE fr.from_user_id = ? AND fr.status = 'pending'
     ORDER BY fr.created_at DESC`
  )
    .bind(userId)
    .all<FriendRequestWithUser>();

  return result.results || [];
}

export async function acceptFriendRequest(
  db: D1Database,
  requestId: string,
  userId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  // Get the request
  const request = await db.prepare(
    'SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = ?'
  )
    .bind(requestId, userId, 'pending')
    .first<FriendRequestRecord>();

  if (!request) {
    return false;
  }

  // Update request status
  await db.prepare(
    'UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?'
  )
    .bind('accepted', now, requestId)
    .run();

  // Create friendship (ensure consistent ordering)
  const [userA, userB] = [request.from_user_id, request.to_user_id].sort();
  await db.prepare(
    'INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) VALUES (?, ?, ?)'
  )
    .bind(userA, userB, now)
    .run();

  // Update friend counts
  await updateFriendCount(db, request.from_user_id);
  await updateFriendCount(db, request.to_user_id);

  // Notify the sender
  await createNotification(db, request.from_user_id, 'friend_accepted', {
    title: 'Friend request accepted',
    body: 'Your friend request was accepted',
    link: `/u/${userId}`,
    actorId: userId,
  });

  // Create activity
  await createActivity(db, userId, 'friend_added', 'user', request.from_user_id);
  await createActivity(db, request.from_user_id, 'friend_added', 'user', userId);

  return true;
}

export async function declineFriendRequest(
  db: D1Database,
  requestId: string,
  userId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ? AND to_user_id = ? AND status = ?'
  )
    .bind('declined', now, requestId, userId, 'pending')
    .run();

  return result.meta.changes > 0;
}

// ============================================================================
// FRIENDSHIPS
// ============================================================================

export async function areFriends(
  db: D1Database,
  userId1: string,
  userId2: string
): Promise<boolean> {
  const [userA, userB] = [userId1, userId2].sort();
  const result = await db.prepare(
    'SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?'
  )
    .bind(userA, userB)
    .first();

  return !!result;
}

export async function getFriends(
  db: D1Database,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ friends: FriendRecord[]; total: number }> {
  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM friendships 
     WHERE user_a = ? OR user_b = ?`
  )
    .bind(userId, userId)
    .first<{ count: number }>();

  const result = await db.prepare(
    `SELECT u.id as user_id, u.display_name, u.email, u.avatar_url, u.bio, f.created_at
     FROM friendships f
     INNER JOIN users u ON (
       (f.user_a = ? AND u.id = f.user_b) OR
       (f.user_b = ? AND u.id = f.user_a)
     )
     WHERE f.user_a = ? OR f.user_b = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(userId, userId, userId, userId, limit, offset)
    .all<FriendRecord>();

  return {
    friends: result.results || [],
    total: countResult?.count || 0,
  };
}

export async function removeFriend(
  db: D1Database,
  userId: string,
  friendId: string
): Promise<boolean> {
  const [userA, userB] = [userId, friendId].sort();

  const result = await db.prepare(
    'DELETE FROM friendships WHERE user_a = ? AND user_b = ?'
  )
    .bind(userA, userB)
    .run();

  if (result.meta.changes > 0) {
    await updateFriendCount(db, userId);
    await updateFriendCount(db, friendId);
    return true;
  }

  return false;
}

async function updateFriendCount(db: D1Database, userId: string): Promise<void> {
  const count = await db.prepare(
    'SELECT COUNT(*) as count FROM friendships WHERE user_a = ? OR user_b = ?'
  )
    .bind(userId, userId)
    .first<{ count: number }>();

  await db.prepare(
    `INSERT INTO user_stats (user_id, friends_count) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET friends_count = ?`
  )
    .bind(userId, count?.count || 0, count?.count || 0)
    .run();
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function createNotification(
  db: D1Database,
  userId: string,
  type: string,
  data: {
    title?: string;
    body?: string;
    link?: string;
    actorId?: string;
  }
): Promise<NotificationRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, link, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, type, data.title || null, data.body || null, data.link || null, data.actorId || null, now)
    .run();

  return {
    id,
    user_id: userId,
    type,
    title: data.title || null,
    body: data.body || null,
    link: data.link || null,
    actor_id: data.actorId || null,
    read_at: null,
    created_at: now,
  };
}

export async function getNotifications(
  db: D1Database,
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<NotificationRecord[]> {
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  if (unreadOnly) {
    query += ' AND read_at IS NULL';
  }
  query += ' ORDER BY created_at DESC LIMIT ?';

  const result = await db.prepare(query)
    .bind(userId, limit)
    .all<NotificationRecord>();

  return result.results || [];
}

export async function getUnreadCount(
  db: D1Database,
  userId: string
): Promise<number> {
  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL'
  )
    .bind(userId)
    .first<{ count: number }>();

  return result?.count || 0;
}

export async function markNotificationRead(
  db: D1Database,
  notificationId: string,
  userId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?'
  )
    .bind(now, notificationId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function markAllNotificationsRead(
  db: D1Database,
  userId: string
): Promise<number> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL'
  )
    .bind(now, userId)
    .run();

  return result.meta.changes;
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export async function createActivity(
  db: D1Database,
  userId: string,
  type: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<ActivityRecord> {
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO activities (id, user_id, type, entity_type, entity_id, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, type, entityType || null, entityId || null, metadata ? JSON.stringify(metadata) : null, now)
    .run();

  return {
    id,
    user_id: userId,
    type,
    entity_type: entityType || null,
    entity_id: entityId || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    created_at: now,
  };
}

export async function getUserActivity(
  db: D1Database,
  userId: string,
  limit: number = 20
): Promise<ActivityRecord[]> {
  const result = await db.prepare(
    `SELECT * FROM activities 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`
  )
    .bind(userId, limit)
    .all<ActivityRecord>();

  return result.results || [];
}

export async function getFriendsActivity(
  db: D1Database,
  userId: string,
  limit: number = 50
): Promise<Array<ActivityRecord & { user_display_name: string | null; user_email: string }>> {
  const result = await db.prepare(
    `SELECT a.*, u.display_name as user_display_name, u.email as user_email
     FROM activities a
     INNER JOIN users u ON a.user_id = u.id
     WHERE a.user_id IN (
       SELECT CASE WHEN user_a = ? THEN user_b ELSE user_a END
       FROM friendships
       WHERE user_a = ? OR user_b = ?
     )
     ORDER BY a.created_at DESC
     LIMIT ?`
  )
    .bind(userId, userId, userId, limit)
    .all<ActivityRecord & { user_display_name: string | null; user_email: string }>();

  return result.results || [];
}
