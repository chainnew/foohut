import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types/index';
import { signToken, requireAuth } from '../middleware/auth';
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  hashToken,
  createSession
} from '../services/auth.service';

const auth = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

/**
 * POST /auth/register
 * Create a new user account
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
      username?: string;
      name?: string;
      display_name?: string;
      displayName?: string;
    }>();

    // Validate input
    if (!body.email || !body.password) {
      return c.json<ApiResponse>(
        { success: false, error: 'Email and password are required' },
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json<ApiResponse>(
        { success: false, error: 'Invalid email format' },
        400
      );
    }

    // Validate password strength
    if (body.password.length < 8) {
      return c.json<ApiResponse>(
        { success: false, error: 'Password must be at least 8 characters' },
        400
      );
    }

    // Validate username if provided
    const username = body.username?.toLowerCase().trim();
    if (username) {
      if (!/^[a-z0-9_]+$/.test(username)) {
        return c.json<ApiResponse>(
          { success: false, error: 'Username can only contain lowercase letters, numbers, and underscores' },
          400
        );
      }
      if (username.length < 3) {
        return c.json<ApiResponse>(
          { success: false, error: 'Username must be at least 3 characters' },
          400
        );
      }
      if (username.length > 30) {
        return c.json<ApiResponse>(
          { success: false, error: 'Username must be 30 characters or less' },
          400
        );
      }
      // Check if username is taken
      const existingUsername = await c.env.DB.prepare(
        'SELECT id FROM users WHERE username = ? AND deleted_at IS NULL'
      ).bind(username).first();
      if (existingUsername) {
        return c.json<ApiResponse>(
          { success: false, error: 'This username is already taken' },
          409
        );
      }
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(c.env.DB, body.email);
    if (existingUser) {
      return c.json<ApiResponse>(
        { success: false, error: 'An account with this email already exists' },
        409
      );
    }

    // Accept both 'name', 'display_name', and 'displayName' for flexibility
    const displayName = body.display_name || body.displayName || body.name;

    // Create user
    const user = await createUser(c.env.DB, {
      email: body.email.toLowerCase().trim(),
      password: body.password,
      username: username,
      displayName: displayName?.trim()
    });

    // Generate JWT token
    const token = await signToken(
      { sub: user.id, email: user.email },
      c.env.JWT_SECRET
    );

    // Store session
    const tokenHash = await hashToken(token);
    await createSession(c.env.DB, user.id, tokenHash);

    return c.json<ApiResponse<{ user: AuthUser; token: string }>>(
      {
        success: true,
        data: { user, token },
        message: 'Account created successfully'
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to create account' },
      500
    );
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      password: string;
    }>();

    // Validate input
    if (!body.email || !body.password) {
      return c.json<ApiResponse>(
        { success: false, error: 'Email and password are required' },
        400
      );
    }

    // Find user
    const userRecord = await findUserByEmail(c.env.DB, body.email.toLowerCase().trim());
    if (!userRecord) {
      return c.json<ApiResponse>(
        { success: false, error: 'Invalid email or password' },
        401
      );
    }

    // Verify password
    const isValid = await verifyPassword(body.password, userRecord.password_hash);
    if (!isValid) {
      return c.json<ApiResponse>(
        { success: false, error: 'Invalid email or password' },
        401
      );
    }

    // Generate JWT token
    const token = await signToken(
      { sub: userRecord.id, email: userRecord.email },
      c.env.JWT_SECRET
    );

    // Store session
    const tokenHash = await hashToken(token);
    await createSession(c.env.DB, userRecord.id, tokenHash);

    const user: AuthUser = {
      id: userRecord.id,
      email: userRecord.email,
      username: userRecord.username,
      displayName: userRecord.display_name
    };

    return c.json<ApiResponse<{ user: AuthUser; token: string }>>(
      {
        success: true,
        data: { user, token },
        message: 'Login successful'
      },
      200
    );
  } catch (error) {
    console.error('Login error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Authentication failed' },
      500
    );
  }
});

/**
 * POST /auth/logout
 * Client-side token removal (stateless logout)
 */
auth.post('/logout', async (c) => {
  // JWT is stateless, client should remove token
  // Optionally, we could invalidate sessions here
  return c.json<ApiResponse>(
    {
      success: true,
      message: 'Logged out successfully'
    },
    200
  );
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');

  return c.json<ApiResponse<{ user: AuthUser }>>(
    {
      success: true,
      data: { user }
    },
    200
  );
});

/**
 * PATCH /auth/me
 * Update current user's profile
 */
auth.patch('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{
      displayName?: string;
      avatarUrl?: string;
    }>();

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (body.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(body.displayName?.trim() || null);
    }

    if (body.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(body.avatarUrl || null);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>(
        { success: false, error: 'No updates provided' },
        400
      );
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(user.id);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    // Fetch updated user
    const result = await c.env.DB.prepare(
      'SELECT id, email, username, display_name FROM users WHERE id = ?'
    )
      .bind(user.id)
      .first<{ id: string; email: string; username: string | null; display_name: string | null }>();

    if (!result) {
      return c.json<ApiResponse>(
        { success: false, error: 'User not found' },
        404
      );
    }

    const updatedUser: AuthUser = {
      id: result.id,
      email: result.email,
      username: result.username,
      displayName: result.display_name
    };

    return c.json<ApiResponse<{ user: AuthUser }>>(
      {
        success: true,
        data: { user: updatedUser },
        message: 'Profile updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update profile' },
      500
    );
  }
});

export default auth;
