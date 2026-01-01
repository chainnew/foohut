/**
 * Authentication middleware for foohut.com backend API
 * Uses Better-Auth for session-based authentication
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest, User, Session } from '../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../index.js';

// Placeholder for Better-Auth integration
// This will be connected to the actual auth service once configured

/**
 * Extract session token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const sessionCookie = req.cookies?.session;
  if (sessionCookie) {
    return sessionCookie;
  }

  return null;
}

/**
 * Validate session token and get user
 * TODO: Connect to Better-Auth session validation
 */
async function validateSession(token: string): Promise<{ user: User; session: Session } | null> {
  // Placeholder implementation
  // In production, this will call Better-Auth's session validation
  logger.debug({ token: token.slice(0, 10) + '...' }, 'Validating session');

  // Return null for now - will be implemented with Better-Auth
  return null;
}

/**
 * Require authentication middleware
 * Validates session and attaches user to request
 */
export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  validateSession(token)
    .then((result) => {
      if (!result) {
        throw new UnauthorizedError('Invalid or expired session');
      }

      req.user = result.user;
      req.session = result.session;
      next();
    })
    .catch(next);
}

/**
 * Optional authentication middleware
 * Attaches user if valid session exists, but doesn't require it
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  validateSession(token)
    .then((result) => {
      if (result) {
        req.user = result.user;
        req.session = result.session;
      }
      next();
    })
    .catch(() => {
      // Ignore validation errors for optional auth
      next();
    });
}

/**
 * Require specific organization role
 */
export function requireOrgRole(
  allowedRoles: Array<'owner' | 'admin' | 'editor' | 'viewer'>
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const orgId = req.params.orgId || req.params.organizationId;
      if (!orgId) {
        throw new ForbiddenError('Organization ID required');
      }

      // TODO: Check user's role in organization
      // This will query the organization_members table
      const userRole = await getOrganizationRole(req.user.id, orgId);

      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Get user's role in an organization
 * TODO: Implement with database query
 */
async function getOrganizationRole(
  _userId: string,
  _orgId: string
): Promise<'owner' | 'admin' | 'editor' | 'viewer' | null> {
  // Placeholder - will query organization_members table
  return null;
}

/**
 * Require organization owner or admin
 */
export const requireOrgAdmin = requireOrgRole(['owner', 'admin']);

/**
 * Require organization editor or higher
 */
export const requireOrgEditor = requireOrgRole(['owner', 'admin', 'editor']);

/**
 * Require any organization member
 */
export const requireOrgMember = requireOrgRole(['owner', 'admin', 'editor', 'viewer']);

/**
 * Check if user owns a resource
 */
export function requireOwnership(getOwnerId: (req: Request) => Promise<string | null>) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const ownerId = await getOwnerId(req);

      if (!ownerId || ownerId !== req.user.id) {
        throw new ForbiddenError('You do not own this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Rate limit by user
 */
export function userRateLimit(
  maxRequests: number,
  windowMs: number = 60000
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    let record = requests.get(userId);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      requests.set(userId, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      throw new ForbiddenError('Rate limit exceeded');
    }

    next();
  };
}
