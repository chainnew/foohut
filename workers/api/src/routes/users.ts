import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types/index';
import { requireAuth } from '../middleware/auth';

interface UserRecord {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  onboarded_at: string | null;
  bio: string | null;
  kinde_id: string | null;
}

const users = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(username: string): string {
  const trimmed = username.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

async function isReserved(db: D1Database, username: string) {
  const result = await db.prepare(
    'SELECT 1 FROM reserved_usernames WHERE username = ?'
  )
    .bind(username)
    .first();
  return !!result;
}

async function isTaken(db: D1Database, username: string) {
  const result = await db.prepare(
    'SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL'
  )
    .bind(username)
    .first();
  return !!result;
}

async function fetchUser(db: D1Database, userId: string): Promise<UserRecord | null> {
  const result = await db.prepare(
    `SELECT id, email, username, display_name, avatar_url, role, onboarded_at, bio, kinde_id
     FROM users WHERE id = ? AND deleted_at IS NULL`
  )
    .bind(userId)
    .first<UserRecord>();

  return result || null;
}

function mapUser(record: UserRecord) {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    displayName: record.display_name,
    avatarUrl: record.avatar_url,
    role: record.role,
    onboardedAt: record.onboarded_at,
    bio: record.bio,
    kindeId: record.kinde_id,
  };
}

users.get('/check-username', async (c) => {
  try {
    const raw = c.req.query('username');
    if (!raw) {
      return c.json<ApiResponse>({ success: false, error: 'Username is required' }, 400);
    }

    const username = normalizeUsername(raw);
    if (!USERNAME_REGEX.test(username)) {
      return c.json<ApiResponse>({ success: false, error: 'Invalid username format' }, 400);
    }

    if (await isReserved(c.env.DB, username)) {
      return c.json<ApiResponse>({ success: false, error: 'Username is reserved' }, 409);
    }

    if (await isTaken(c.env.DB, username)) {
      return c.json<ApiResponse>({ success: false, error: 'Username is taken' }, 409);
    }

    return c.json<ApiResponse<{ available: boolean }>>({
      success: true,
      data: { available: true },
    });
  } catch (error) {
    console.error('Check username error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to check username' }, 500);
  }
});

users.post('/claim-username', requireAuth, async (c) => {
  try {
    const body = await c.req.json<{ username?: string }>();
    if (!body.username) {
      return c.json<ApiResponse>({ success: false, error: 'Username is required' }, 400);
    }

    const username = normalizeUsername(body.username);
    if (!USERNAME_REGEX.test(username)) {
      return c.json<ApiResponse>({ success: false, error: 'Invalid username format' }, 400);
    }

    const userId = c.get('userId');
    const existing = await c.env.DB.prepare(
      'SELECT username FROM users WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(userId)
      .first<{ username: string | null }>();

    if (!existing) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    if (existing.username) {
      return c.json<ApiResponse>({ success: false, error: 'Username already claimed' }, 409);
    }

    if (await isReserved(c.env.DB, username)) {
      return c.json<ApiResponse>({ success: false, error: 'Username is reserved' }, 409);
    }

    if (await isTaken(c.env.DB, username)) {
      return c.json<ApiResponse>({ success: false, error: 'Username is taken' }, 409);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE users SET username = ?, onboarded_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind(username, now, now, userId)
      .run();

    const updated = await fetchUser(c.env.DB, userId);
    if (!updated) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    return c.json<ApiResponse<{ user: ReturnType<typeof mapUser> }>>({
      success: true,
      data: { user: mapUser(updated) },
    });
  } catch (error) {
    console.error('Claim username error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to claim username' }, 500);
  }
});

users.get('/me', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await fetchUser(c.env.DB, userId);
    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    return c.json<ApiResponse<ReturnType<typeof mapUser>>>({
      success: true,
      data: mapUser(user),
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load user' }, 500);
  }
});

users.patch('/me', requireAuth, async (c) => {
  try {
    const body = await c.req.json<{ display_name?: string | null; avatar_url?: string | null; bio?: string | null }>();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(body.display_name?.trim() || null);
    }
    if (body.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(body.avatar_url?.trim() || null);
    }
    if (body.bio !== undefined) {
      updates.push('bio = ?');
      values.push(body.bio?.trim() || null);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>({ success: false, error: 'No updates provided' }, 400);
    }

    const userId = c.get('userId');
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
    )
      .bind(...values)
      .run();

    const user = await fetchUser(c.env.DB, userId);
    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    return c.json<ApiResponse<ReturnType<typeof mapUser>>>({
      success: true,
      data: mapUser(user),
    });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to update user' }, 500);
  }
});

users.get('/@:username', async (c) => {
  try {
    const raw = c.req.param('username');
    const username = normalizeUsername(raw);

    const user = await c.env.DB.prepare(
      `SELECT id, username, display_name, avatar_url, bio
       FROM users
       WHERE username = ? AND deleted_at IS NULL`
    )
      .bind(username)
      .first<{
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        bio: string | null;
      }>();

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    const projects = await c.env.DB.prepare(
      `SELECT id, name, slug, description, stars_count, forks_count, updated_at
       FROM projects
       WHERE owner_id = ? AND visibility = 'public'
       ORDER BY updated_at DESC
       LIMIT 6`
    )
      .bind(user.id)
      .all<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        stars_count: number;
        forks_count: number;
        updated_at: number;
      }>();

    return c.json<ApiResponse>({
      success: true,
      data: {
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        publicProjects: projects.results || [],
      },
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to load profile' }, 500);
  }
});

export default users;
