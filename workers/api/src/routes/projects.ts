/**
 * Projects Routes
 * API endpoints for developer projects management
 */

import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types';
import { requireAuth, optionalAuth } from '../middleware/auth';
import * as projectService from '../services/project.service';
import * as fileService from '../services/file.service';
import * as deployService from '../services/deploy.service';

const projects = new Hono<{
  Bindings: Env;
  Variables: { user?: AuthUser; userId?: string };
}>();

/**
 * GET /projects
 * List authenticated user's projects
 */
projects.get('/', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')!;
    const query = c.req.query();

    const filters: projectService.ProjectFilters = {
      visibility: query.visibility as projectService.ProjectVisibility | undefined,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
      sortBy: (query.sortBy as 'created_at' | 'updated_at' | 'stars_count' | 'name') || 'updated_at',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await projectService.listUserProjects(c.env.DB, userId, filters);

    return c.json<ApiResponse<{
      projects: projectService.ProjectRecord[];
      total: number;
      limit: number;
      offset: number;
    }>>({
      success: true,
      data: {
        projects: result.projects,
        total: result.total,
        limit: filters.limit!,
        offset: filters.offset!,
      },
    });
  } catch (error) {
    console.error('List projects error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list projects' }, 500);
  }
});

/**
 * POST /projects
 * Create a new project
 */
projects.post('/', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')!;
    const body = await c.req.json<projectService.CreateProjectInput>();

    if (!body.name?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Project name is required' }, 400);
    }

    const project = await projectService.createProject(c.env.DB, userId, body);

    return c.json<ApiResponse<{ project: projectService.ProjectRecord }>>({
      success: true,
      data: { project },
      message: 'Project created successfully',
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    console.error('Create project error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * GET /projects/search
 * Search public projects
 */
projects.get('/search', optionalAuth, async (c) => {
  try {
    const query = c.req.query();

    const result = await projectService.searchProjects(c.env.DB, query.q || '', {
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
      sortBy: (query.sortBy as 'created_at' | 'updated_at' | 'stars_count' | 'name') || 'stars_count',
      sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
    });

    return c.json<ApiResponse<{
      projects: projectService.ProjectWithOwner[];
      total: number;
    }>>({
      success: true,
      data: {
        projects: result.projects,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('Search projects error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to search projects' }, 500);
  }
});

/**
 * GET /projects/starred
 * Get user's starred projects
 */
projects.get('/starred', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')!;
    const query = c.req.query();

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const result = await projectService.getUserStarredProjects(c.env.DB, userId, limit, offset);

    return c.json<ApiResponse<{
      projects: projectService.ProjectWithOwner[];
      total: number;
    }>>({
      success: true,
      data: {
        projects: result.projects,
        total: result.total,
      },
    });
  } catch (error) {
    console.error('Get starred projects error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get starred projects' }, 500);
  }
});

/**
 * GET /projects/:id
 * Get a specific project
 */
projects.get('/:id', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId');

    const project = await projectService.getProject(c.env.DB, projectId);

    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    // Check access for private/semi-public projects
    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }

      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    // Check if user has starred this project
    let isStarred = false;
    if (userId) {
      isStarred = await projectService.hasStarred(c.env.DB, projectId, userId);
    }

    return c.json<ApiResponse<{
      project: projectService.ProjectWithOwner;
      isStarred: boolean;
    }>>({
      success: true,
      data: { project, isStarred },
    });
  } catch (error) {
    console.error('Get project error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get project' }, 500);
  }
});

/**
 * PATCH /projects/:id
 * Update a project
 */
projects.patch('/:id', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<projectService.UpdateProjectInput>();

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    const project = await projectService.updateProject(c.env.DB, projectId, body);

    return c.json<ApiResponse<{ project: projectService.ProjectRecord }>>({
      success: true,
      data: { project: project! },
      message: 'Project updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
    console.error('Update project error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * DELETE /projects/:id
 * Delete a project
 */
projects.delete('/:id', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;

    // Check owner access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'owner');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Only the owner can delete the project' }, 403);
    }

    await projectService.deleteProject(c.env.DB, projectId);

    return c.json<ApiResponse>({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to delete project' }, 500);
  }
});

/**
 * POST /projects/:id/star
 * Star a project
 */
projects.post('/:id/star', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;

    // Check if project exists and is accessible
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const starred = await projectService.starProject(c.env.DB, projectId, userId);

    return c.json<ApiResponse<{ starred: boolean }>>({
      success: true,
      data: { starred },
      message: starred ? 'Project starred' : 'Project already starred',
    });
  } catch (error) {
    console.error('Star project error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to star project' }, 500);
  }
});

/**
 * DELETE /projects/:id/star
 * Unstar a project
 */
projects.delete('/:id/star', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;

    const unstarred = await projectService.unstarProject(c.env.DB, projectId, userId);

    return c.json<ApiResponse<{ unstarred: boolean }>>({
      success: true,
      data: { unstarred },
      message: unstarred ? 'Project unstarred' : 'Project was not starred',
    });
  } catch (error) {
    console.error('Unstar project error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to unstar project' }, 500);
  }
});

/**
 * POST /projects/:id/fork
 * Fork a project
 */
projects.post('/:id/fork', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<{ name?: string }>().catch(() => ({ name: undefined }));

    const forkedProject = await projectService.forkProject(c.env.DB, projectId, userId, body.name);

    return c.json<ApiResponse<{ project: projectService.ProjectRecord }>>({
      success: true,
      data: { project: forkedProject },
      message: 'Project forked successfully',
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fork project';
    console.error('Fork project error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * GET /projects/:id/collaborators
 * Get project collaborators
 */
projects.get('/:id/collaborators', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;

    // Check access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    const collaborators = await projectService.getProjectCollaborators(c.env.DB, projectId);

    return c.json<ApiResponse<{ collaborators: typeof collaborators }>>({
      success: true,
      data: { collaborators },
    });
  } catch (error) {
    console.error('Get collaborators error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get collaborators' }, 500);
  }
});

/**
 * POST /projects/:id/collaborators
 * Add a collaborator to the project
 */
projects.post('/:id/collaborators', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<{
      userId: string;
      role: projectService.CollaboratorRole;
    }>();

    // Check admin access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'admin');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    if (!body.userId || !body.role) {
      return c.json<ApiResponse>({ success: false, error: 'userId and role are required' }, 400);
    }

    // Cannot add owner role (only one owner per project)
    if (body.role === 'owner') {
      return c.json<ApiResponse>({ success: false, error: 'Cannot add owner role' }, 400);
    }

    await projectService.addCollaborator(c.env.DB, projectId, body.userId, body.role);

    return c.json<ApiResponse>({
      success: true,
      message: 'Collaborator added successfully',
    }, 201);
  } catch (error) {
    console.error('Add collaborator error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to add collaborator' }, 500);
  }
});

/**
 * DELETE /projects/:id/collaborators/:userId
 * Remove a collaborator from the project
 */
projects.delete('/:id/collaborators/:userId', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const targetUserId = c.req.param('userId');
    const userId = c.get('userId')!;

    // Check admin access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'admin');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    // Cannot remove the owner
    const project = await projectService.getProject(c.env.DB, projectId);
    if (project?.owner_id === targetUserId) {
      return c.json<ApiResponse>({ success: false, error: 'Cannot remove project owner' }, 400);
    }

    await projectService.removeCollaborator(c.env.DB, projectId, targetUserId);

    return c.json<ApiResponse>({
      success: true,
      message: 'Collaborator removed successfully',
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to remove collaborator' }, 500);
  }
});

// ============================================================================
// FILE ROUTES
// ============================================================================

/**
 * GET /projects/:id/files
 * List files in project root or specific directory
 */
projects.get('/:id/files', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const path = c.req.query('path') || undefined;
    const tree = c.req.query('tree') === 'true';

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    if (tree) {
      const fileTree = await fileService.getFileTree(c.env.DB, projectId);
      return c.json<ApiResponse<{ files: fileService.FileTreeNode[] }>>({
        success: true,
        data: { files: fileTree },
      });
    }

    const files = await fileService.listFiles(c.env.DB, projectId, path);

    return c.json<ApiResponse<{ files: fileService.FileRecord[] }>>({
      success: true,
      data: { files },
    });
  } catch (error) {
    console.error('List files error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list files' }, 500);
  }
});

/**
 * GET /projects/:id/files/*
 * Get file content by path
 */
projects.get('/:id/files/*', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const filePath = c.req.path.replace(`/projects/${projectId}/files/`, '');
    const userId = c.get('userId');

    if (!filePath) {
      return c.json<ApiResponse>({ success: false, error: 'File path is required' }, 400);
    }

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const file = await fileService.getFile(c.env.DB, projectId, filePath);

    if (!file) {
      return c.json<ApiResponse>({ success: false, error: 'File not found' }, 404);
    }

    return c.json<ApiResponse<{ file: fileService.FileRecord }>>({
      success: true,
      data: { file },
    });
  } catch (error) {
    console.error('Get file error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get file' }, 500);
  }
});

/**
 * PUT /projects/:id/files/*
 * Create or update a file
 */
projects.put('/:id/files/*', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const filePath = c.req.path.replace(`/projects/${projectId}/files/`, '');
    const userId = c.get('userId')!;

    if (!filePath) {
      return c.json<ApiResponse>({ success: false, error: 'File path is required' }, 400);
    }

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    const body = await c.req.json<{
      content?: string;
      isDirectory?: boolean;
    }>();

    // Check if file exists
    const existing = await fileService.getFile(c.env.DB, projectId, filePath);

    let file: fileService.FileRecord;

    if (existing) {
      if (existing.is_directory === 1) {
        return c.json<ApiResponse>({ success: false, error: 'Cannot update directory content' }, 400);
      }
      file = (await fileService.updateFile(c.env.DB, projectId, filePath, body.content || ''))!;
    } else {
      file = await fileService.createFile(
        c.env.DB,
        projectId,
        filePath,
        body.isDirectory ? null : (body.content || ''),
        body.isDirectory || false
      );
    }

    return c.json<ApiResponse<{ file: fileService.FileRecord }>>({
      success: true,
      data: { file },
      message: existing ? 'File updated' : 'File created',
    }, existing ? 200 : 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save file';
    console.error('Save file error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * DELETE /projects/:id/files/*
 * Delete a file or directory
 */
projects.delete('/:id/files/*', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const filePath = c.req.path.replace(`/projects/${projectId}/files/`, '');
    const userId = c.get('userId')!;

    if (!filePath) {
      return c.json<ApiResponse>({ success: false, error: 'File path is required' }, 400);
    }

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    await fileService.deleteFile(c.env.DB, projectId, filePath);

    return c.json<ApiResponse>({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete file';
    console.error('Delete file error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * POST /projects/:id/files/move
 * Move/rename a file or directory
 */
projects.post('/:id/files/move', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<{
      oldPath: string;
      newPath: string;
    }>();

    if (!body.oldPath || !body.newPath) {
      return c.json<ApiResponse>({ success: false, error: 'oldPath and newPath are required' }, 400);
    }

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    const file = await fileService.moveFile(c.env.DB, projectId, body.oldPath, body.newPath);

    return c.json<ApiResponse<{ file: fileService.FileRecord }>>({
      success: true,
      data: { file },
      message: 'File moved successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to move file';
    console.error('Move file error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

/**
 * POST /projects/:id/files/search
 * Search files in a project
 */
projects.post('/:id/files/search', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json<{
      query: string;
      limit?: number;
      includeContent?: boolean;
      fileTypes?: string[];
    }>();

    if (!body.query) {
      return c.json<ApiResponse>({ success: false, error: 'Search query is required' }, 400);
    }

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const files = await fileService.searchFiles(c.env.DB, projectId, body.query, {
      limit: body.limit,
      includeContent: body.includeContent,
      fileTypes: body.fileTypes,
    });

    return c.json<ApiResponse<{ files: fileService.FileRecord[] }>>({
      success: true,
      data: { files },
    });
  } catch (error) {
    console.error('Search files error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to search files' }, 500);
  }
});

/**
 * POST /projects/:id/files/batch
 * Batch create files (for project initialization)
 */
projects.post('/:id/files/batch', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<{
      files: Array<{
        path: string;
        content: string | null;
        isDirectory: boolean;
      }>;
    }>();

    if (!body.files || !Array.isArray(body.files)) {
      return c.json<ApiResponse>({ success: false, error: 'files array is required' }, 400);
    }

    if (body.files.length > 100) {
      return c.json<ApiResponse>({ success: false, error: 'Maximum 100 files per batch' }, 400);
    }

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    const files = await fileService.batchCreateFiles(c.env.DB, projectId, body.files);

    return c.json<ApiResponse<{ files: fileService.FileRecord[]; count: number }>>({
      success: true,
      data: { files, count: files.length },
      message: `${files.length} files created successfully`,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create files';
    console.error('Batch create files error:', error);
    return c.json<ApiResponse>({ success: false, error: message }, 400);
  }
});

// ============================================================================
// COMMIT ROUTES
// ============================================================================

/**
 * GET /projects/:id/commits
 * List commits for a project
 */
projects.get('/:id/commits', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const query = c.req.query();

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const result = await deployService.listCommits(c.env.DB, projectId, limit, offset);

    return c.json<ApiResponse<{
      commits: deployService.CommitRecord[];
      total: number;
    }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('List commits error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list commits' }, 500);
  }
});

/**
 * POST /projects/:id/commits
 * Create a new commit
 */
projects.post('/:id/commits', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<deployService.CreateCommitInput>();

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    if (!body.message?.trim()) {
      return c.json<ApiResponse>({ success: false, error: 'Commit message is required' }, 400);
    }

    const commit = await deployService.createCommit(c.env.DB, projectId, userId, body);

    return c.json<ApiResponse<{ commit: deployService.CommitRecord }>>({
      success: true,
      data: { commit },
      message: 'Commit created successfully',
    }, 201);
  } catch (error) {
    console.error('Create commit error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to create commit' }, 500);
  }
});

/**
 * GET /projects/:id/commits/:commitId
 * Get a specific commit
 */
projects.get('/:id/commits/:commitId', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const commitId = c.req.param('commitId');
    const userId = c.get('userId');

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const commit = await deployService.getCommit(c.env.DB, commitId);

    if (!commit || commit.project_id !== projectId) {
      return c.json<ApiResponse>({ success: false, error: 'Commit not found' }, 404);
    }

    return c.json<ApiResponse<{ commit: deployService.CommitRecord }>>({
      success: true,
      data: { commit },
    });
  } catch (error) {
    console.error('Get commit error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get commit' }, 500);
  }
});

// ============================================================================
// DEPLOY ROUTES
// ============================================================================

/**
 * GET /projects/:id/deploys
 * List deploys for a project
 */
projects.get('/:id/deploys', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId');
    const query = c.req.query();

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    const result = await deployService.listDeploys(c.env.DB, projectId, limit, offset);

    return c.json<ApiResponse<{
      deploys: deployService.DeployRecord[];
      total: number;
    }>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('List deploys error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to list deploys' }, 500);
  }
});

/**
 * POST /projects/:id/deploys
 * Deploy a project
 */
projects.post('/:id/deploys', requireAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const userId = c.get('userId')!;
    const body = await c.req.json<deployService.CreateDeployInput>().catch(() => ({} as deployService.CreateDeployInput));

    // Check edit access
    const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId, 'editor');
    if (!hasAccess) {
      return c.json<ApiResponse>({ success: false, error: 'Permission denied' }, 403);
    }

    // Get project for slug
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    // Create deploy record
    const deploy = await deployService.createDeploy(c.env.DB, projectId, userId, {
      commitId: body.commitId,
      isProduction: body.isProduction ?? true,
    });

    // Get project files for deployment
    const files = await fileService.listFiles(c.env.DB, projectId);
    const fileContents = files
      .filter(f => f.is_directory === 0)
      .map(f => ({ path: f.path, content: f.content }));

    // Build and deploy (async - returns immediately with pending status)
    // In production, this would be handled by a queue/worker
    deployService.buildAndDeploy(
      c.env.DB,
      deploy.id,
      `${project.slug}-${project.owner_id.slice(0, 8)}`,
      fileContents
    ).catch(err => console.error('Deploy error:', err));

    return c.json<ApiResponse<{ deploy: deployService.DeployRecord }>>({
      success: true,
      data: { deploy },
      message: 'Deployment started',
    }, 202);
  } catch (error) {
    console.error('Create deploy error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to start deployment' }, 500);
  }
});

/**
 * GET /projects/:id/deploys/:deployId
 * Get deploy status
 */
projects.get('/:id/deploys/:deployId', optionalAuth, async (c) => {
  try {
    const projectId = c.req.param('id');
    const deployId = c.req.param('deployId');
    const userId = c.get('userId');

    // Check access
    const project = await projectService.getProject(c.env.DB, projectId);
    if (!project) {
      return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
    }

    if (project.visibility !== 'public') {
      if (!userId) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
      const hasAccess = await projectService.checkProjectAccess(c.env.DB, projectId, userId);
      if (!hasAccess) {
        return c.json<ApiResponse>({ success: false, error: 'Project not found' }, 404);
      }
    }

    const deploy = await deployService.getDeploy(c.env.DB, deployId);

    if (!deploy || deploy.project_id !== projectId) {
      return c.json<ApiResponse>({ success: false, error: 'Deploy not found' }, 404);
    }

    return c.json<ApiResponse<{ deploy: deployService.DeployRecord }>>({
      success: true,
      data: { deploy },
    });
  } catch (error) {
    console.error('Get deploy error:', error);
    return c.json<ApiResponse>({ success: false, error: 'Failed to get deploy' }, 500);
  }
});

export default projects;
