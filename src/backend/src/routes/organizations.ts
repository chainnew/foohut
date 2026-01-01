/**
 * Organization routes for foohut.com backend API
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { validateBody, validateParams, validateQuery, stringSchemas, paginationSchema } from '../middleware/validate.js';
import { requireAuth, requireOrgAdmin, requireOrgMember } from '../middleware/auth.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, parsePagination } from '../utils/response.js';
import { organizationService } from '../services/organization.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createOrgSchema = z.object({
  name: stringSchemas.name,
  slug: stringSchemas.slug.optional(),
  description: stringSchemas.description,
  settings: z
    .object({
      defaultVisibility: z.enum(['public', 'private', 'internal']).default('private'),
      allowPublicPages: z.boolean().default(false),
      aiEnabled: z.boolean().default(true),
    })
    .optional(),
});

const updateOrgSchema = createOrgSchema.partial();

const orgIdParams = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
});

const inviteMemberSchema = z.object({
  email: stringSchemas.email,
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
});

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

const memberIdParams = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  memberId: z.string().uuid('Invalid member ID'),
});

// ============================================================================
// Organization Routes
// ============================================================================

/**
 * GET /organizations
 * List organizations for current user
 */
router.get(
  '/',
  requireAuth,
  validateQuery(paginationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, offset } = parsePagination(req.query);

    if (!req.user) {
      return sendSuccess(res, [], 200);
    }

    const { organizations, total } = await organizationService.listForUser(
      req.user.id,
      { limit, offset }
    );

    return sendPaginated(res, organizations, page, limit, total);
  })
);

/**
 * POST /organizations
 * Create a new organization
 */
router.post(
  '/',
  requireAuth,
  validateBody(createOrgSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const org = await organizationService.create({
      ...req.body,
      ownerId: req.user.id,
    });

    return sendCreated(res, org, 'Organization created successfully');
  })
);

/**
 * GET /organizations/:orgId
 * Get organization by ID
 */
router.get(
  '/:orgId',
  requireAuth,
  validateParams(orgIdParams),
  requireOrgMember,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;

    const org = await organizationService.getById(orgId);

    return sendSuccess(res, org);
  })
);

/**
 * PATCH /organizations/:orgId
 * Update organization
 */
router.patch(
  '/:orgId',
  requireAuth,
  validateParams(orgIdParams),
  validateBody(updateOrgSchema),
  requireOrgAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;

    const org = await organizationService.update(orgId, req.body);

    return sendSuccess(res, org, 200, 'Organization updated');
  })
);

/**
 * DELETE /organizations/:orgId
 * Delete organization
 */
router.delete(
  '/:orgId',
  requireAuth,
  validateParams(orgIdParams),
  requireOrgAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;

    await organizationService.delete(orgId);

    return sendNoContent(res);
  })
);

// ============================================================================
// Member Routes
// ============================================================================

/**
 * GET /organizations/:orgId/members
 * List organization members
 */
router.get(
  '/:orgId/members',
  requireAuth,
  validateParams(orgIdParams),
  validateQuery(paginationSchema),
  requireOrgMember,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);

    const { members, total } = await organizationService.listMembers(orgId, { limit, offset });

    return sendPaginated(res, members, page, limit, total);
  })
);

/**
 * POST /organizations/:orgId/members
 * Invite member to organization
 */
router.post(
  '/:orgId/members',
  requireAuth,
  validateParams(orgIdParams),
  validateBody(inviteMemberSchema),
  requireOrgAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;
    const { email, role } = req.body;

    const invitation = await organizationService.inviteMember(orgId, email, role);

    return sendCreated(res, invitation, 'Invitation sent');
  })
);

/**
 * PATCH /organizations/:orgId/members/:memberId
 * Update member role
 */
router.patch(
  '/:orgId/members/:memberId',
  requireAuth,
  validateParams(memberIdParams),
  validateBody(updateMemberSchema),
  requireOrgAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId, memberId } = req.params;
    const { role } = req.body;

    const member = await organizationService.updateMemberRole(orgId, memberId, role);

    return sendSuccess(res, member, 200, 'Member role updated');
  })
);

/**
 * DELETE /organizations/:orgId/members/:memberId
 * Remove member from organization
 */
router.delete(
  '/:orgId/members/:memberId',
  requireAuth,
  validateParams(memberIdParams),
  requireOrgAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId, memberId } = req.params;

    await organizationService.removeMember(orgId, memberId);

    return sendNoContent(res);
  })
);

/**
 * POST /organizations/:orgId/leave
 * Leave organization (for current user)
 */
router.post(
  '/:orgId/leave',
  requireAuth,
  validateParams(orgIdParams),
  requireOrgMember,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    await organizationService.leaveOrganization(orgId, req.user.id);

    return sendNoContent(res);
  })
);

// ============================================================================
// Collections (nested under organization)
// ============================================================================

/**
 * GET /organizations/:orgId/collections
 * List collections in organization
 */
router.get(
  '/:orgId/collections',
  requireAuth,
  validateParams(orgIdParams),
  validateQuery(paginationSchema),
  requireOrgMember,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);

    const { collections, total } = await organizationService.listCollections(orgId, { limit, offset });

    return sendPaginated(res, collections, page, limit, total);
  })
);

/**
 * POST /organizations/:orgId/collections
 * Create collection in organization
 */
router.post(
  '/:orgId/collections',
  requireAuth,
  validateParams(orgIdParams),
  validateBody(
    z.object({
      name: stringSchemas.name,
      slug: stringSchemas.slug.optional(),
      description: stringSchemas.description,
      icon: stringSchemas.icon,
      color: stringSchemas.color,
      visibility: z.enum(['public', 'private', 'internal']).default('private'),
      parentId: z.string().uuid().optional(),
    })
  ),
  requireOrgAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orgId } = req.params;

    const collection = await organizationService.createCollection(orgId, req.body);

    return sendCreated(res, collection, 'Collection created');
  })
);

export default router;
