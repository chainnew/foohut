/**
 * Code AI Routes
 * API endpoints for AI-powered code assistance
 */

import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse, ChatMessage } from '../types';
import { requireAuth } from '../middleware/auth';
import * as codeAI from '../services/code-ai.service';
import * as projectService from '../services/project.service';
import * as fileService from '../services/file.service';

const codeAIRoutes = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
codeAIRoutes.use('*', requireAuth);

/**
 * Build code context from request
 */
async function buildContext(
  db: D1Database,
  body: {
    projectId?: string;
    filePath?: string;
    language?: string;
  }
): Promise<codeAI.CodeContext | undefined> {
  if (!body.projectId) {
    return body.language ? { language: body.language } : undefined;
  }

  const project = await projectService.getProject(db, body.projectId);
  if (!project) {
    return body.language ? { language: body.language } : undefined;
  }

  const context: codeAI.CodeContext = {
    projectName: project.name,
    techStack: project.tech_stack || undefined,
    readme: project.readme_content || undefined,
    language: body.language,
  };

  if (body.filePath) {
    context.fileName = body.filePath.split('/').pop();
    context.filePath = body.filePath;

    // Auto-detect language from file if not specified
    if (!context.language) {
      const file = await fileService.getFile(db, body.projectId, body.filePath);
      if (file?.language) {
        context.language = file.language;
      }
    }
  }

  return context;
}

/**
 * POST /code-ai/chat
 * Chat about code with context
 */
codeAIRoutes.post('/chat', async (c) => {
  try {
    const body = await c.req.json<{
      messages: ChatMessage[];
      projectId?: string;
      filePath?: string;
      language?: string;
      relatedFiles?: Array<{ path: string; content: string }>;
    }>();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json<ApiResponse>({ success: false, error: 'messages array is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    if (context && body.relatedFiles) {
      context.relatedFiles = body.relatedFiles;
    }

    const response = await codeAI.chat(c.env.AI, body.messages, context);

    return c.json<ApiResponse<{ content: string }>>({
      success: true,
      data: { content: response.content },
    });
  } catch (error) {
    console.error('Code AI chat error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to process chat request' }, 500);
  }
});

/**
 * POST /code-ai/generate
 * Generate code from a prompt
 */
codeAIRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json<{
      prompt: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.prompt?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'prompt is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.generateCode(c.env.AI, body.prompt, context);

    return c.json<ApiResponse<{ code: string }>>({
      success: true,
      data: { code: response.content },
    });
  } catch (error) {
    console.error('Code AI generate error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to generate code' }, 500);
  }
});

/**
 * POST /code-ai/explain
 * Explain code
 */
codeAIRoutes.post('/explain', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.explainCode(c.env.AI, body.code, context);

    return c.json<ApiResponse<{ explanation: string }>>({
      success: true,
      data: { explanation: response.content },
    });
  } catch (error) {
    console.error('Code AI explain error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to explain code' }, 500);
  }
});

/**
 * POST /code-ai/fix
 * Fix a bug in code
 */
codeAIRoutes.post('/fix', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      error: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    if (!body.error?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'error description is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.fixBug(c.env.AI, body.code, body.error, context);

    return c.json<ApiResponse<{ fix: string }>>({
      success: true,
      data: { fix: response.content },
    });
  } catch (error) {
    console.error('Code AI fix error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to fix code' }, 500);
  }
});

/**
 * POST /code-ai/refactor
 * Refactor code based on instructions
 */
codeAIRoutes.post('/refactor', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      instruction: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    if (!body.instruction?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'instruction is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.refactor(c.env.AI, body.code, body.instruction, context);

    return c.json<ApiResponse<{ refactored: string }>>({
      success: true,
      data: { refactored: response.content },
    });
  } catch (error) {
    console.error('Code AI refactor error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to refactor code' }, 500);
  }
});

/**
 * POST /code-ai/tests
 * Write tests for code
 */
codeAIRoutes.post('/tests', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.writeTests(c.env.AI, body.code, context);

    return c.json<ApiResponse<{ tests: string }>>({
      success: true,
      data: { tests: response.content },
    });
  } catch (error) {
    console.error('Code AI tests error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to generate tests' }, 500);
  }
});

/**
 * POST /code-ai/review
 * Review code and provide feedback
 */
codeAIRoutes.post('/review', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const review = await codeAI.reviewCode(c.env.AI, body.code, context);

    return c.json<ApiResponse<codeAI.CodeReviewResult>>({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Code AI review error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to review code' }, 500);
  }
});

/**
 * POST /code-ai/complete
 * Code completion (autocomplete)
 */
codeAIRoutes.post('/complete', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      position: { line: number; column: number };
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    if (!body.position?.line || !body.position?.column) {
      return c.json<ApiResponse>({ success: false, error: 'position (line and column) is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.complete(c.env.AI, body.code, body.position, context);

    return c.json<ApiResponse<{ completion: string }>>({
      success: true,
      data: { completion: response.content },
    });
  } catch (error) {
    console.error('Code AI complete error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to complete code' }, 500);
  }
});

/**
 * POST /code-ai/docs
 * Generate documentation for code
 */
codeAIRoutes.post('/docs', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.generateDocs(c.env.AI, body.code, context);

    return c.json<ApiResponse<{ documentation: string }>>({
      success: true,
      data: { documentation: response.content },
    });
  } catch (error) {
    console.error('Code AI docs error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to generate documentation' }, 500);
  }
});

/**
 * POST /code-ai/optimize
 * Optimize code for performance
 */
codeAIRoutes.post('/optimize', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.optimizeCode(c.env.AI, body.code, context);

    return c.json<ApiResponse<{ optimized: string }>>({
      success: true,
      data: { optimized: response.content },
    });
  } catch (error) {
    console.error('Code AI optimize error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to optimize code' }, 500);
  }
});

/**
 * POST /code-ai/translate
 * Translate code to another language
 */
codeAIRoutes.post('/translate', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      targetLanguage: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    if (!body.targetLanguage?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'targetLanguage is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.translateCode(c.env.AI, body.code, body.targetLanguage, context);

    return c.json<ApiResponse<{ translated: string }>>({
      success: true,
      data: { translated: response.content },
    });
  } catch (error) {
    console.error('Code AI translate error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to translate code' }, 500);
  }
});

/**
 * POST /code-ai/security
 * Perform security audit on code
 */
codeAIRoutes.post('/security', async (c) => {
  try {
    const body = await c.req.json<{
      code: string;
      projectId?: string;
      filePath?: string;
      language?: string;
    }>();

    if (!body.code?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'code is required' }, 400);
    }

    // Check project access if projectId provided
    if (body.projectId) {
      const userId = c.get('userId');
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, body.projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const context = await buildContext(c.env.DB, body);
    const response = await codeAI.securityAudit(c.env.AI, body.code, context);

    return c.json<ApiResponse<{ audit: string }>>({
      success: true,
      data: { audit: response.content },
    });
  } catch (error) {
    console.error('Code AI security error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to audit code' }, 500);
  }
});

export default codeAIRoutes;
