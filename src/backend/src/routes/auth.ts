/**
 * Authentication routes for foohut.com backend API
 * Uses Better-Auth for session-based authentication
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendNoContent } from '../utils/response.js';
import { authService } from '../services/auth.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const confirmResetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /auth/register
 * Register a new user account
 */
router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    const result = await authService.register({ email, password, name });

    return sendSuccess(res, result, 201, 'Account created successfully');
  })
);

/**
 * POST /auth/login
 * Authenticate user and create session
 */
router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Set session cookie
    res.cookie('session', result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return sendSuccess(res, result, 200, 'Login successful');
  })
);

/**
 * POST /auth/logout
 * End current session
 */
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.session) {
      await authService.logout(req.session.id);
    }

    // Clear session cookie
    res.clearCookie('session');

    return sendNoContent(res);
  })
);

/**
 * GET /auth/me
 * Get current user information
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    return sendSuccess(res, { user: req.user });
  })
);

/**
 * GET /auth/session
 * Get current session information
 */
router.get(
  '/session',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    return sendSuccess(res, {
      session: req.session,
      user: req.user,
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh session token
 */
router.post(
  '/refresh',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.session) {
      return sendSuccess(res, null, 401);
    }

    const result = await authService.refreshSession(req.session.id);

    // Update session cookie
    res.cookie('session', result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, result);
  })
);

/**
 * POST /auth/password/reset
 * Request password reset
 */
router.post(
  '/password/reset',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    return sendSuccess(res, null, 200, 'If the email exists, a reset link has been sent');
  })
);

/**
 * POST /auth/password/confirm
 * Confirm password reset with token
 */
router.post(
  '/password/confirm',
  validateBody(confirmResetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    await authService.confirmPasswordReset(token, password);

    return sendSuccess(res, null, 200, 'Password has been reset');
  })
);

/**
 * POST /auth/password/change
 * Change password for authenticated user
 */
router.post(
  '/password/change',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword);

    return sendSuccess(res, null, 200, 'Password changed successfully');
  })
);

/**
 * DELETE /auth/account
 * Delete user account
 */
router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    await authService.deleteAccount(req.user.id);

    res.clearCookie('session');

    return sendNoContent(res);
  })
);

export default router;
