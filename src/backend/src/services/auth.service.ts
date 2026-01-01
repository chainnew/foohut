/**
 * Authentication service for foohut.com backend API
 * Uses Better-Auth for session management
 */

import { nanoid } from 'nanoid';
import type { User, Session } from '../types/index.js';
import { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { logger } from '../index.js';

// ============================================================================
// Types
// ============================================================================

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResult {
  user: User;
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

class AuthService {
  /**
   * Register a new user account
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, name } = input;

    logger.info({ email }, 'Registering new user');

    // TODO: Check if email already exists in database
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // TODO: Hash password with Better-Auth
    const passwordHash = await this.hashPassword(password);

    // TODO: Create user in database
    const user: User = {
      id: nanoid(),
      email,
      name: name || null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create session
    const session = await this.createSession(user.id);

    logger.info({ userId: user.id }, 'User registered successfully');

    return {
      user,
      session,
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password } = input;

    logger.debug({ email }, 'Login attempt');

    // TODO: Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // TODO: Verify password with Better-Auth
    const isValid = await this.verifyPassword(password, user.id);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Create session
    const session = await this.createSession(user.id);

    logger.info({ userId: user.id }, 'User logged in');

    return {
      user,
      session,
    };
  }

  /**
   * End user session
   */
  async logout(sessionId: string): Promise<void> {
    logger.debug({ sessionId }, 'Logging out session');

    // TODO: Delete session from database
    await this.deleteSession(sessionId);

    logger.info({ sessionId }, 'Session ended');
  }

  /**
   * Refresh session token
   */
  async refreshSession(sessionId: string): Promise<AuthResult> {
    // TODO: Get existing session
    const existingSession = await this.getSession(sessionId);
    if (!existingSession) {
      throw new UnauthorizedError('Invalid session');
    }

    // TODO: Get user
    const user = await this.findUserById(existingSession.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Delete old session and create new one
    await this.deleteSession(sessionId);
    const session = await this.createSession(user.id);

    return {
      user,
      session,
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    logger.info({ email }, 'Password reset requested');

    const user = await this.findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // TODO: Generate reset token and send email
    const resetToken = nanoid(32);

    // TODO: Store reset token with expiry
    // TODO: Send reset email

    logger.info({ userId: user.id }, 'Password reset email sent');
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    logger.debug('Confirming password reset');

    // TODO: Validate reset token
    const userId = await this.validateResetToken(token);
    if (!userId) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // TODO: Update password
    const passwordHash = await this.hashPassword(newPassword);
    await this.updatePassword(userId, passwordHash);

    // Invalidate all existing sessions
    await this.deleteAllUserSessions(userId);

    logger.info({ userId }, 'Password reset completed');
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    logger.debug({ userId }, 'Changing password');

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, userId);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Update password
    const passwordHash = await this.hashPassword(newPassword);
    await this.updatePassword(userId, passwordHash);

    logger.info({ userId }, 'Password changed');
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    logger.info({ userId }, 'Deleting user account');

    // TODO: Delete user and all associated data
    // - Delete sessions
    // - Delete organization memberships
    // - Transfer owned organizations or delete
    // - Delete user record

    await this.deleteAllUserSessions(userId);
    // TODO: await this.deleteUser(userId);

    logger.info({ userId }, 'User account deleted');
  }

  // ============================================================================
  // Private Helper Methods (to be implemented with database)
  // ============================================================================

  private async findUserByEmail(_email: string): Promise<User | null> {
    // TODO: Query database
    return null;
  }

  private async findUserById(_userId: string): Promise<User | null> {
    // TODO: Query database
    return null;
  }

  private async hashPassword(_password: string): Promise<string> {
    // TODO: Use Better-Auth password hashing
    return 'hashed_password';
  }

  private async verifyPassword(_password: string, _userId: string): Promise<boolean> {
    // TODO: Use Better-Auth password verification
    return false;
  }

  private async createSession(userId: string): Promise<{ id: string; token: string; expiresAt: Date }> {
    const sessionId = nanoid();
    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // TODO: Store session in database

    return { id: sessionId, token, expiresAt };
  }

  private async getSession(_sessionId: string): Promise<Session | null> {
    // TODO: Query database
    return null;
  }

  private async deleteSession(_sessionId: string): Promise<void> {
    // TODO: Delete from database
  }

  private async deleteAllUserSessions(_userId: string): Promise<void> {
    // TODO: Delete all sessions for user
  }

  private async validateResetToken(_token: string): Promise<string | null> {
    // TODO: Validate token and return userId
    return null;
  }

  private async updatePassword(_userId: string, _passwordHash: string): Promise<void> {
    // TODO: Update user password in database
  }
}

// Export singleton instance
export const authService = new AuthService();
