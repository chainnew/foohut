/**
 * Collection routes for foohut.com backend API
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { validateBody, validateParams, validateQuery, stringSchemas, paginationSchema } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, parsePagination } from '../utils/response.js';
import { collectionService } from '../services/collection.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const collectionIdParams = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
});

const updateCollectionSchema = z.object({
  name: stringSchemas.name.optional(),
  slug: stringSchemas.slug.optional(),
  description: stringSchemas.description,
  icon: stringSchemas.icon,
  color: stringSchemas.color,
  visibility: z.enum(['public', 'private', 'internal']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

const createSpaceSchema = z.object({
  name: stringSchemas.name,
  slug: stringSchemas.slug.optional(),
  description: stringSchemas.description,
  icon: stringSchemas.icon,
  color: stringSchemas.color,
  visibility: z.enum(['public', 'private', 'internal']).default('private'),
  settings: z
    .object({
      allowComments: z.boolean().default(true),
      allowReactions: z.boolean().default(true),
      defaultPageTemplate: z.string().nullable().default(null),
    })
    .optional(),
});

// ============================================================================
// Collection Routes
// ============================================================================

/**
 * GET /collections/:collectionId
 * Get collection by ID
 */
router.get(
  '/:collectionId',
  requireAuth,
  validateParams(collectionIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;

    const collection = await collectionService.getById(collectionId, req.user?.id);

    return sendSuccess(res, collection);
  })
);

/**
 * PATCH /collections/:collectionId
 * Update collection
 */
router.patch(
  '/:collectionId',
  requireAuth,
  validateParams(collectionIdParams),
  validateBody(updateCollectionSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;

    const collection = await collectionService.update(collectionId, req.body, req.user?.id);

    return sendSuccess(res, collection, 200, 'Collection updated');
  })
);

/**
 * DELETE /collections/:collectionId
 * Delete collection
 */
router.delete(
  '/:collectionId',
  requireAuth,
  validateParams(collectionIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;

    await collectionService.delete(collectionId, req.user?.id);

    return sendNoContent(res);
  })
);

/**
 * POST /collections/:collectionId/move
 * Move collection to different parent
 */
router.post(
  '/:collectionId/move',
  requireAuth,
  validateParams(collectionIdParams),
  validateBody(
    z.object({
      parentId: z.string().uuid().nullable(),
      position: z.number().int().nonnegative().optional(),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;
    const { parentId, position } = req.body;

    const collection = await collectionService.move(collectionId, parentId, position, req.user?.id);

    return sendSuccess(res, collection, 200, 'Collection moved');
  })
);

// ============================================================================
// Space Routes (nested under collection)
// ============================================================================

/**
 * GET /collections/:collectionId/spaces
 * List spaces in collection
 */
router.get(
  '/:collectionId/spaces',
  requireAuth,
  validateParams(collectionIdParams),
  validateQuery(paginationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);

    const { spaces, total } = await collectionService.listSpaces(
      collectionId,
      { limit, offset },
      req.user?.id
    );

    return sendPaginated(res, spaces, page, limit, total);
  })
);

/**
 * POST /collections/:collectionId/spaces
 * Create space in collection
 */
router.post(
  '/:collectionId/spaces',
  requireAuth,
  validateParams(collectionIdParams),
  validateBody(createSpaceSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;

    const space = await collectionService.createSpace(collectionId, req.body, req.user?.id);

    return sendCreated(res, space, 'Space created');
  })
);

/**
 * GET /collections/:collectionId/tree
 * Get collection with nested subcollections and spaces
 */
router.get(
  '/:collectionId/tree',
  requireAuth,
  validateParams(collectionIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;
    const depth = parseInt(req.query.depth as string) || 3;

    const tree = await collectionService.getTree(collectionId, depth, req.user?.id);

    return sendSuccess(res, tree);
  })
);

/**
 * GET /collections/:collectionId/breadcrumb
 * Get breadcrumb path to collection
 */
router.get(
  '/:collectionId/breadcrumb',
  requireAuth,
  validateParams(collectionIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;

    const breadcrumb = await collectionService.getBreadcrumb(collectionId, req.user?.id);

    return sendSuccess(res, breadcrumb);
  })
);

/**
 * POST /collections/:collectionId/duplicate
 * Duplicate collection with all contents
 */
router.post(
  '/:collectionId/duplicate',
  requireAuth,
  validateParams(collectionIdParams),
  validateBody(
    z.object({
      name: stringSchemas.name.optional(),
      includeSpaces: z.boolean().default(true),
      includePages: z.boolean().default(true),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { collectionId } = req.params;

    const collection = await collectionService.duplicate(
      collectionId,
      req.body,
      req.user?.id
    );

    return sendCreated(res, collection, 'Collection duplicated');
  })
);

export default router;
