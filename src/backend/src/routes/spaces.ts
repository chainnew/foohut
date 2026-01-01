/**
 * Space routes for foohut.com backend API
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { validateBody, validateParams, validateQuery, stringSchemas, paginationSchema } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, parsePagination } from '../utils/response.js';
import { spaceService } from '../services/space.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const spaceIdParams = z.object({
  spaceId: z.string().uuid('Invalid space ID'),
});

const updateSpaceSchema = z.object({
  name: stringSchemas.name.optional(),
  slug: stringSchemas.slug.optional(),
  description: stringSchemas.description,
  icon: stringSchemas.icon,
  color: stringSchemas.color,
  visibility: z.enum(['public', 'private', 'internal']).optional(),
  position: z.number().int().nonnegative().optional(),
  settings: z
    .object({
      allowComments: z.boolean().optional(),
      allowReactions: z.boolean().optional(),
      defaultPageTemplate: z.string().nullable().optional(),
    })
    .optional(),
});

const createPageSchema = z.object({
  title: stringSchemas.name,
  slug: stringSchemas.slug.optional(),
  content: z
    .object({
      type: z.literal('doc'),
      content: z.array(z.any()).default([]),
    })
    .optional(),
  parentId: z.string().uuid().optional(),
  icon: stringSchemas.icon,
  coverImage: z.string().url().optional(),
  visibility: z.enum(['public', 'private', 'internal']).default('private'),
  status: z.enum(['draft', 'published']).default('draft'),
});

// ============================================================================
// Space Routes
// ============================================================================

/**
 * GET /spaces/:spaceId
 * Get space by ID
 */
router.get(
  '/:spaceId',
  requireAuth,
  validateParams(spaceIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;

    const space = await spaceService.getById(spaceId, req.user?.id);

    return sendSuccess(res, space);
  })
);

/**
 * PATCH /spaces/:spaceId
 * Update space
 */
router.patch(
  '/:spaceId',
  requireAuth,
  validateParams(spaceIdParams),
  validateBody(updateSpaceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;

    const space = await spaceService.update(spaceId, req.body, req.user?.id);

    return sendSuccess(res, space, 200, 'Space updated');
  })
);

/**
 * DELETE /spaces/:spaceId
 * Delete space
 */
router.delete(
  '/:spaceId',
  requireAuth,
  validateParams(spaceIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;

    await spaceService.delete(spaceId, req.user?.id);

    return sendNoContent(res);
  })
);

/**
 * POST /spaces/:spaceId/move
 * Move space to different collection
 */
router.post(
  '/:spaceId/move',
  requireAuth,
  validateParams(spaceIdParams),
  validateBody(
    z.object({
      collectionId: z.string().uuid(),
      position: z.number().int().nonnegative().optional(),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;
    const { collectionId, position } = req.body;

    const space = await spaceService.move(spaceId, collectionId, position, req.user?.id);

    return sendSuccess(res, space, 200, 'Space moved');
  })
);

// ============================================================================
// Page Routes (nested under space)
// ============================================================================

/**
 * GET /spaces/:spaceId/pages
 * List pages in space
 */
router.get(
  '/:spaceId/pages',
  requireAuth,
  validateParams(spaceIdParams),
  validateQuery(
    paginationSchema.extend({
      parentId: z.string().uuid().optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      flat: z
        .string()
        .transform((v) => v === 'true')
        .optional(),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);
    const { parentId, status, flat } = req.query;

    const { pages, total } = await spaceService.listPages(
      spaceId,
      {
        limit,
        offset,
        parentId: parentId as string | undefined,
        status: status as 'draft' | 'published' | 'archived' | undefined,
        flat: flat as boolean | undefined,
      },
      req.user?.id
    );

    return sendPaginated(res, pages, page, limit, total);
  })
);

/**
 * POST /spaces/:spaceId/pages
 * Create page in space
 */
router.post(
  '/:spaceId/pages',
  requireAuth,
  validateParams(spaceIdParams),
  validateBody(createPageSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const page = await spaceService.createPage(spaceId, req.body, req.user.id);

    return sendCreated(res, page, 'Page created');
  })
);

/**
 * GET /spaces/:spaceId/tree
 * Get page tree for space
 */
router.get(
  '/:spaceId/tree',
  requireAuth,
  validateParams(spaceIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;
    const depth = parseInt(req.query.depth as string) || 10;

    const tree = await spaceService.getPageTree(spaceId, depth, req.user?.id);

    return sendSuccess(res, tree);
  })
);

/**
 * GET /spaces/:spaceId/recent
 * Get recently modified pages in space
 */
router.get(
  '/:spaceId/recent',
  requireAuth,
  validateParams(spaceIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const pages = await spaceService.getRecentPages(spaceId, limit, req.user?.id);

    return sendSuccess(res, pages);
  })
);

/**
 * POST /spaces/:spaceId/duplicate
 * Duplicate space with all pages
 */
router.post(
  '/:spaceId/duplicate',
  requireAuth,
  validateParams(spaceIdParams),
  validateBody(
    z.object({
      name: stringSchemas.name.optional(),
      collectionId: z.string().uuid().optional(),
      includePages: z.boolean().default(true),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const space = await spaceService.duplicate(spaceId, req.body, req.user.id);

    return sendCreated(res, space, 'Space duplicated');
  })
);

/**
 * POST /spaces/:spaceId/import
 * Import pages from external source
 */
router.post(
  '/:spaceId/import',
  requireAuth,
  validateParams(spaceIdParams),
  validateBody(
    z.object({
      source: z.enum(['markdown', 'notion', 'confluence', 'github']),
      data: z.any(),
      options: z
        .object({
          preserveStructure: z.boolean().default(true),
          createSubspace: z.boolean().default(false),
        })
        .optional(),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { spaceId } = req.params;
    const { source, data, options } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const result = await spaceService.importPages(spaceId, source, data, options, req.user.id);

    return sendSuccess(res, result, 200, 'Import completed');
  })
);

export default router;
