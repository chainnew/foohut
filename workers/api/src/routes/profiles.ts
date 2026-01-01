/**
 * Profiles Routes
 * API endpoints for public user profiles
 */

import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import * as projectService from '../services/project.service';

/**
 * User profile data
 */
interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: number;
  projectsCount: number;
  starsCount: number;
  followersCount: number;
  followingCount: number;
}

const profiles = new Hono<{
  Bindings: Env;
  Variables: { user?: AuthUser; userId?: string };
}>();

/**
 * Extract username from email
 */
function getUsernameFromEmail(email: string): string {
  return email.split('@')[0];
}

/**
 * Get user by username (username column, display_name, or email prefix)
 */
async function getUserByUsername(
  db: D1Database,
  username: string
): Promise<{
  id: string;
  username: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: number;
} | null> {
  // Try by username first
  let user = await db
    .prepare(
      `SELECT id, username, email, display_name, avatar_url, bio, created_at
       FROM users
       WHERE username = ? AND deleted_at IS NULL`
    )
    .bind(username)
    .first<{
      id: string;
      username: string | null;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      created_at: number;
    }>();

  if (user) {
    return user;
  }

  // Try by display_name
  user = await db
    .prepare(
      `SELECT id, username, email, display_name, avatar_url, bio, created_at
       FROM users
       WHERE display_name = ? AND deleted_at IS NULL`
    )
    .bind(username)
    .first<{
      id: string;
      username: string | null;
      email: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      created_at: number;
    }>();

  if (user) {
    return user;
  }

  // Try by email prefix
  user = await db
    .prepare(
      `SELECT id, username, email, display_name, avatar_url, bio, created_at
       FROM users
       WHERE LOWER(SUBSTR(email, 1, INSTR(email, '@') - 1)) = LOWER(?) AND deleted_at IS NULL`
    )
    .bind(username)
    .first();

  return user || null;
}

/**
 * Get profile stats
 */
async function getProfileStats(
  db: D1Database,
  userId: string
): Promise<{
  projectsCount: number;
  starsCount: number;
  followersCount: number;
  followingCount: number;
}> {
  // Get public projects count
  const projectsResult = await db
    .prepare("SELECT COUNT(*) as count FROM projects WHERE owner_id = ? AND visibility = 'public'")
    .bind(userId)
    .first<{ count: number }>();

  // Get total stars received
  const starsResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM project_stars ps
       INNER JOIN projects p ON ps.project_id = p.id
       WHERE p.owner_id = ?`
    )
    .bind(userId)
    .first<{ count: number }>();

  // Get followers count
  const followersResult = await db
    .prepare('SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?')
    .bind(userId)
    .first<{ count: number }>();

  // Get following count
  const followingResult = await db
    .prepare('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?')
    .bind(userId)
    .first<{ count: number }>();

  return {
    projectsCount: projectsResult?.count || 0,
    starsCount: starsResult?.count || 0,
    followersCount: followersResult?.count || 0,
    followingCount: followingResult?.count || 0,
  };
}

/**
 * GET /profiles/:username
 * Get a public user profile
 */
profiles.get('/:username', optionalAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const currentUserId = c.get('userId');

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    const stats = await getProfileStats(c.env.DB, user.id);

    // Check if current user is following this profile
    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const followResult = await c.env.DB
        .prepare('SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?')
        .bind(currentUserId, user.id)
        .first();
      isFollowing = !!followResult;
    }

    const profile: UserProfile = {
      id: user.id,
      username: user.username || user.display_name || getUsernameFromEmail(user.email),
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      createdAt: user.created_at,
      ...stats,
    };

    return c.json<ApiResponse<{ profile: UserProfile; isFollowing: boolean }>>({
      success: true,
      data: { profile, isFollowing },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get profile' }, 500);
  }
});

/**
 * GET /profiles/:username/projects
 * Get a user's public projects
 */
profiles.get('/:username/projects', optionalAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const query = c.req.query();

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;
    const sortBy = (query.sortBy as 'created_at' | 'updated_at' | 'stars_count' | 'name') || 'updated_at';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';

    // Only show public projects
    const result = await projectService.listUserProjects(c.env.DB, user.id, {
      visibility: 'public',
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return c.json<ApiResponse<{
      projects: projectService.ProjectRecord[];
      total: number;
    }>>({
      success: true,
      data: {
        projects: result.projects,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get projects' }, 500);
  }
});

/**
 * GET /profiles/:username/starred
 * Get projects a user has starred
 */
profiles.get('/:username/starred', optionalAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const query = c.req.query();

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // Get public starred projects only
    const result = await c.env.DB
      .prepare(
        `SELECT p.*, u.email as owner_email, u.display_name as owner_display_name, u.avatar_url as owner_avatar_url
         FROM projects p
         INNER JOIN users u ON p.owner_id = u.id
         INNER JOIN project_stars ps ON p.id = ps.project_id
         WHERE ps.user_id = ? AND p.visibility = 'public'
         ORDER BY ps.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(user.id, limit, offset)
      .all<projectService.ProjectWithOwner>();

    const countResult = await c.env.DB
      .prepare(
        `SELECT COUNT(*) as count FROM project_stars ps
         INNER JOIN projects p ON ps.project_id = p.id
         WHERE ps.user_id = ? AND p.visibility = 'public'`
      )
      .bind(user.id)
      .first<{ count: number }>();

    return c.json<ApiResponse<{
      projects: projectService.ProjectWithOwner[];
      total: number;
    }>>({
      success: true,
      data: {
        projects: result.results || [],
        total: countResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get user starred projects error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get starred projects' }, 500);
  }
});

/**
 * GET /profiles/:username/followers
 * Get a user's followers
 */
profiles.get('/:username/followers', optionalAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const query = c.req.query();

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const result = await c.env.DB
      .prepare(
        `SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, uf.created_at as followed_at
         FROM user_follows uf
         INNER JOIN users u ON uf.follower_id = u.id
         WHERE uf.following_id = ? AND u.deleted_at IS NULL
         ORDER BY uf.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(user.id, limit, offset)
      .all<{
        id: string;
        username: string | null;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        followed_at: number;
      }>();

    const countResult = await c.env.DB
      .prepare('SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?')
      .bind(user.id)
      .first<{ count: number }>();

    // Map to public profile format
    const followers = (result.results || []).map((u) => ({
      id: u.id,
      username: u.username || u.display_name || getUsernameFromEmail(u.email),
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      followedAt: u.followed_at,
    }));

    return c.json<ApiResponse<{
      followers: typeof followers;
      total: number;
    }>>({
      success: true,
      data: {
        followers,
        total: countResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get followers' }, 500);
  }
});

/**
 * GET /profiles/:username/following
 * Get users that a user is following
 */
profiles.get('/:username/following', optionalAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const query = c.req.query();

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const result = await c.env.DB
      .prepare(
        `SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, uf.created_at as followed_at
         FROM user_follows uf
         INNER JOIN users u ON uf.following_id = u.id
         WHERE uf.follower_id = ? AND u.deleted_at IS NULL
         ORDER BY uf.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(user.id, limit, offset)
      .all<{
        id: string;
        username: string | null;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        followed_at: number;
      }>();

    const countResult = await c.env.DB
      .prepare('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?')
      .bind(user.id)
      .first<{ count: number }>();

    // Map to public profile format
    const following = (result.results || []).map((u) => ({
      id: u.id,
      username: u.username || u.display_name || getUsernameFromEmail(u.email),
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      followedAt: u.followed_at,
    }));

    return c.json<ApiResponse<{
      following: typeof following;
      total: number;
    }>>({
      success: true,
      data: {
        following,
        total: countResult?.count || 0,
      },
    });
  } catch (error) {
    console.error('Get following error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get following' }, 500);
  }
});

/**
 * POST /profiles/:username/follow
 * Follow a user
 */
profiles.post('/:username/follow', requireAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const currentUserId = c.get('userId')!;

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    // Cannot follow yourself
    if (user.id === currentUserId) {
      return c.json<ApiResponse>({ success: false, error: 'Cannot follow yourself' }, 400);
    }

    // Check if already following
    const existing = await c.env.DB
      .prepare('SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?')
      .bind(currentUserId, user.id)
      .first();

    if (existing) {
      return c.json<ApiResponse<{ followed: boolean }>>({
        success: true,
        data: { followed: false },
        message: 'Already following this user',
      });
    }

    // Create follow relationship
    const timestamp = Math.floor(Date.now() / 1000);
    await c.env.DB
      .prepare('INSERT INTO user_follows (follower_id, following_id, created_at) VALUES (?, ?, ?)')
      .bind(currentUserId, user.id, timestamp)
      .run();

    return c.json<ApiResponse<{ followed: boolean }>>({
      success: true,
      data: { followed: true },
      message: 'User followed successfully',
    }, 201);
  } catch (error) {
    console.error('Follow user error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to follow user' }, 500);
  }
});

/**
 * DELETE /profiles/:username/follow
 * Unfollow a user
 */
profiles.delete('/:username/follow', requireAuth, async (c) => {
  try {
    const username = c.req.param('username');
    const currentUserId = c.get('userId')!;

    const user = await getUserByUsername(c.env.DB, username);

    if (!user) {
      return c.json<ApiResponse>({ success: false, error: 'User not found' }, 404);
    }

    // Check if following
    const existing = await c.env.DB
      .prepare('SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?')
      .bind(currentUserId, user.id)
      .first();

    if (!existing) {
      return c.json<ApiResponse<{ unfollowed: boolean }>>({
        success: true,
        data: { unfollowed: false },
        message: 'Not following this user',
      });
    }

    // Remove follow relationship
    await c.env.DB
      .prepare('DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?')
      .bind(currentUserId, user.id)
      .run();

    return c.json<ApiResponse<{ unfollowed: boolean }>>({
      success: true,
      data: { unfollowed: true },
      message: 'User unfollowed successfully',
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to unfollow user' }, 500);
  }
});

export default profiles;
