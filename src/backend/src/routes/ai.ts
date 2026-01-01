/**
 * AI routes for foohut.com backend API
 * Semantic search and AI generation endpoints
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { validateBody, validateQuery, stringSchemas } from '../middleware/validate.js';
import { requireAuth, optionalAuth, userRateLimit } from '../middleware/auth.js';
import { sendSuccess } from '../utils/response.js';
import { aiService } from '../services/ai.service.js';
import type { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const searchSchema = z.object({
  query: z.string().min(1).max(500, 'Query too long'),
  organizationId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  spaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  threshold: z.coerce.number().min(0).max(1).default(0.7),
  includeContent: z.coerce.boolean().default(false),
});

const generateSchema = z.object({
  prompt: z.string().min(1).max(4000, 'Prompt too long'),
  context: z.string().max(10000).optional(),
  pageId: z.string().uuid().optional(),
  type: z.enum(['complete', 'rewrite', 'summarize', 'explain', 'translate', 'improve']),
  options: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(4000).optional(),
      language: z.string().max(50).optional(),
      tone: z.enum(['professional', 'casual', 'formal', 'friendly']).optional(),
    })
    .optional(),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(10000),
    })
  ),
  context: z
    .object({
      pageId: z.string().uuid().optional(),
      spaceId: z.string().uuid().optional(),
      includeRelated: z.boolean().default(true),
    })
    .optional(),
  options: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(4000).optional(),
      stream: z.boolean().default(false),
    })
    .optional(),
});

const embedSchema = z.object({
  text: z.string().min(1).max(10000),
  model: z.string().optional(),
});

const suggestSchema = z.object({
  pageId: z.string().uuid(),
  type: z.enum(['title', 'tags', 'summary', 'related', 'outline']),
  context: z.string().max(5000).optional(),
});

// ============================================================================
// Search Routes
// ============================================================================

/**
 * POST /ai/search
 * Semantic search across pages
 */
router.post(
  '/search',
  optionalAuth,
  userRateLimit(100, 60000), // 100 requests per minute
  validateBody(searchSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { query, organizationId, collectionId, spaceId, limit, threshold, includeContent } = req.body;

    const results = await aiService.search({
      query,
      organizationId,
      collectionId,
      spaceId,
      limit,
      threshold,
      includeContent,
      userId: req.user?.id,
    });

    return sendSuccess(res, results);
  })
);

/**
 * GET /ai/search
 * Semantic search (GET variant for simple queries)
 */
router.get(
  '/search',
  optionalAuth,
  userRateLimit(100, 60000),
  validateQuery(searchSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as z.infer<typeof searchSchema>;

    const results = await aiService.search({
      ...query,
      userId: req.user?.id,
    });

    return sendSuccess(res, results);
  })
);

// ============================================================================
// Generation Routes
// ============================================================================

/**
 * POST /ai/generate
 * Generate or transform text using AI
 */
router.post(
  '/generate',
  requireAuth,
  userRateLimit(30, 60000), // 30 requests per minute
  validateBody(generateSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prompt, context, pageId, type, options } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const result = await aiService.generate({
      prompt,
      context,
      pageId,
      type,
      options,
      userId: req.user.id,
    });

    return sendSuccess(res, result);
  })
);

/**
 * POST /ai/chat
 * Chat with AI about documentation
 */
router.post(
  '/chat',
  requireAuth,
  userRateLimit(50, 60000), // 50 requests per minute
  validateBody(chatSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { messages, context, options } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    // Handle streaming if requested
    if (options?.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await aiService.chatStream({
        messages,
        context,
        options,
        userId: req.user.id,
        onChunk: (chunk: string) => {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        },
        onComplete: (fullResponse: string) => {
          res.write(`data: ${JSON.stringify({ done: true, content: fullResponse })}\n\n`);
          res.end();
        },
        onError: (error: Error) => {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        },
      });

      return;
    }

    const result = await aiService.chat({
      messages,
      context,
      options,
      userId: req.user.id,
    });

    return sendSuccess(res, result);
  })
);

// ============================================================================
// Embedding Routes
// ============================================================================

/**
 * POST /ai/embed
 * Generate embeddings for text
 */
router.post(
  '/embed',
  requireAuth,
  userRateLimit(100, 60000),
  validateBody(embedSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { text, model } = req.body;

    const embedding = await aiService.embed({ text, model });

    return sendSuccess(res, { embedding, dimensions: embedding.length });
  })
);

// ============================================================================
// Suggestion Routes
// ============================================================================

/**
 * POST /ai/suggest
 * Get AI suggestions for a page
 */
router.post(
  '/suggest',
  requireAuth,
  userRateLimit(30, 60000),
  validateBody(suggestSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId, type, context } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const suggestions = await aiService.suggest({
      pageId,
      type,
      context,
      userId: req.user.id,
    });

    return sendSuccess(res, suggestions);
  })
);

/**
 * POST /ai/analyze
 * Analyze page content
 */
router.post(
  '/analyze',
  requireAuth,
  userRateLimit(20, 60000),
  validateBody(
    z.object({
      pageId: z.string().uuid(),
      analyses: z.array(
        z.enum(['readability', 'sentiment', 'keywords', 'topics', 'quality'])
      ),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pageId, analyses } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    const results = await aiService.analyze({
      pageId,
      analyses,
      userId: req.user.id,
    });

    return sendSuccess(res, results);
  })
);

// ============================================================================
// Admin Routes
// ============================================================================

/**
 * POST /ai/reindex
 * Reindex pages for semantic search (admin only)
 */
router.post(
  '/reindex',
  requireAuth,
  validateBody(
    z.object({
      scope: z.enum(['page', 'space', 'collection', 'organization', 'all']),
      id: z.string().uuid().optional(),
      force: z.boolean().default(false),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { scope, id, force } = req.body;

    if (!req.user) {
      return sendSuccess(res, null, 401);
    }

    // TODO: Add admin check
    const result = await aiService.reindex({
      scope,
      id,
      force,
      userId: req.user.id,
    });

    return sendSuccess(res, result, 200, 'Reindex job started');
  })
);

/**
 * GET /ai/status
 * Get AI service status and usage
 */
router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = await aiService.getStatus(req.user?.id);

    return sendSuccess(res, status);
  })
);

export default router;
