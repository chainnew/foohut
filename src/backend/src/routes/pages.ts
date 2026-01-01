/**
 * Page routes for foohut.com backend API
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { validateBody, validateParams, validateQuery, stringSchemas, paginationSchema } from '../middleware/validate.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated, parsePagination } from '../utils/response.js';
import { pageService } from '../services/page.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const pageIdParams = z.object({
  pageId: z.string().uuid('Invalid page ID'),
});

const updatePageSchema = z.object({
  title: stringSchemas.name.optional(),
  slug: stringSchemas.slug.optional(),
  content: z
    .object({
      type: z.literal('doc'),
      content: z.array(z.any()),
    })
    .optional(),
  icon: stringSchemas.icon,
  coverImage: z.string().url().nullable().optional(),
  visibility: z.enum(['public', 'private', 'internal']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
});

// ============================================================================
// Page Routes
// ============================================================================

/**
 * GET /pages/:pageId
 * Get page by ID
 */
router.get(
  '/:pageId',
  optionalAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    const page = await pageService.getById(pageId, req.user?.id);

    return sendSuccess(res, page);
  })
);

/**
 * PATCH /pages/:pageId
 * Update page
 */
router.patch(
  '/:pageId',
  requireAuth,
  validateParams(pageIdParams),
  validateBody(updatePageSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const page = await pageService.update(pageId, req.body, req.user.id);

    return sendSuccess(res, page, 200, 'Page updated');
  })
);

/**
 * DELETE /pages/:pageId
 * Delete page (soft delete by archiving)
 */
router.delete(
  '/:pageId',
  requireAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;
    const permanent = req.query.permanent === 'true';

    await pageService.delete(pageId, permanent, req.user?.id);

    return sendNoContent(res);
  })
);

/**
 * POST /pages/:pageId/publish
 * Publish a draft page
 */
router.post(
  '/:pageId/publish',
  requireAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const page = await pageService.publish(pageId, req.user.id);

    return sendSuccess(res, page, 200, 'Page published');
  })
);

/**
 * POST /pages/:pageId/unpublish
 * Unpublish a page (convert to draft)
 */
router.post(
  '/:pageId/unpublish',
  requireAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const page = await pageService.unpublish(pageId, req.user.id);

    return sendSuccess(res, page, 200, 'Page unpublished');
  })
);

/**
 * POST /pages/:pageId/move
 * Move page to different parent or space
 */
router.post(
  '/:pageId/move',
  requireAuth,
  validateParams(pageIdParams),
  validateBody(
    z.object({
      parentId: z.string().uuid().nullable(),
      spaceId: z.string().uuid().optional(),
      position: z.number().int().nonnegative().optional(),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;
    const { parentId, spaceId, position } = req.body;

    const page = await pageService.move(pageId, { parentId, spaceId, position }, req.user?.id);

    return sendSuccess(res, page, 200, 'Page moved');
  })
);

/**
 * POST /pages/:pageId/duplicate
 * Duplicate page
 */
router.post(
  '/:pageId/duplicate',
  requireAuth,
  validateParams(pageIdParams),
  validateBody(
    z.object({
      title: stringSchemas.name.optional(),
      includeChildren: z.boolean().default(false),
      targetSpaceId: z.string().uuid().optional(),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const page = await pageService.duplicate(pageId, req.body, req.user.id);

    return sendCreated(res, page, 'Page duplicated');
  })
);

// ============================================================================
// Version History
// ============================================================================

/**
 * GET /pages/:pageId/versions
 * Get page version history
 */
router.get(
  '/:pageId/versions',
  requireAuth,
  validateParams(pageIdParams),
  validateQuery(paginationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);

    const { versions, total } = await pageService.listVersions(pageId, { limit, offset }, req.user?.id);

    return sendPaginated(res, versions, page, limit, total);
  })
);

/**
 * GET /pages/:pageId/versions/:versionId
 * Get specific page version
 */
router.get(
  '/:pageId/versions/:versionId',
  requireAuth,
  validateParams(
    pageIdParams.extend({
      versionId: z.string().uuid('Invalid version ID'),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId, versionId } = req.params;

    const version = await pageService.getVersion(pageId, versionId, req.user?.id);

    return sendSuccess(res, version);
  })
);

/**
 * POST /pages/:pageId/versions/:versionId/restore
 * Restore page to specific version
 */
router.post(
  '/:pageId/versions/:versionId/restore',
  requireAuth,
  validateParams(
    pageIdParams.extend({
      versionId: z.string().uuid('Invalid version ID'),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId, versionId } = req.params;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const page = await pageService.restoreVersion(pageId, versionId, req.user.id);

    return sendSuccess(res, page, 200, 'Page restored to version');
  })
);

// ============================================================================
// Breadcrumb & Navigation
// ============================================================================

/**
 * GET /pages/:pageId/breadcrumb
 * Get breadcrumb path to page
 */
router.get(
  '/:pageId/breadcrumb',
  optionalAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    const breadcrumb = await pageService.getBreadcrumb(pageId, req.user?.id);

    return sendSuccess(res, breadcrumb);
  })
);

/**
 * GET /pages/:pageId/children
 * Get child pages
 */
router.get(
  '/:pageId/children',
  optionalAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    const children = await pageService.getChildren(pageId, req.user?.id);

    return sendSuccess(res, children);
  })
);

/**
 * GET /pages/:pageId/siblings
 * Get sibling pages
 */
router.get(
  '/:pageId/siblings',
  optionalAuth,
  validateParams(pageIdParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;

    const siblings = await pageService.getSiblings(pageId, req.user?.id);

    return sendSuccess(res, siblings);
  })
);

// ============================================================================
// Export
// ============================================================================

/**
 * GET /pages/:pageId/export
 * Export page in various formats
 */
router.get(
  '/:pageId/export',
  requireAuth,
  validateParams(pageIdParams),
  validateQuery(
    z.object({
      format: z.enum(['markdown', 'html', 'pdf', 'json']).default('markdown'),
      includeChildren: z
        .string()
        .transform((v) => v === 'true')
        .default('false'),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId } = req.params;
    const { format, includeChildren } = req.query;

    const result = await pageService.export(
      pageId,
      format as 'markdown' | 'html' | 'pdf' | 'json',
      includeChildren as boolean,
      req.user?.id
    );

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      markdown: 'text/markdown',
      html: 'text/html',
      pdf: 'application/pdf',
      json: 'application/json',
    };

    res.setHeader('Content-Type', contentTypes[format as string] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    return res.send(result.content);
  })
);

export default router;
