import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse, BlockContent } from '../types/index';
import { requireAuth, checkOrgMembership } from '../middleware/auth';

interface Page {
  id: string;
  space_id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  icon: string | null;
  cover_url: string | null;
  position: number;
  is_template: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Block {
  id: string;
  page_id: string;
  parent_id: string | null;
  type: string;
  content: string; // JSON string
  position: number;
  created_at: string;
  updated_at: string;
}

interface Space {
  id: string;
  collection_id: string;
}

interface Collection {
  id: string;
  organization_id: string;
}

const pages = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
pages.use('*', requireAuth);

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

/**
 * Verify user has access to space
 */
async function verifySpaceAccess(
  db: D1Database,
  userId: string,
  spaceId: string,
  minRole?: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<{ hasAccess: boolean; space: Space | null; role: string | null }> {
  const space = await db.prepare(
    'SELECT s.id, s.collection_id FROM spaces s WHERE s.id = ? AND s.deleted_at IS NULL'
  )
    .bind(spaceId)
    .first<Space>();

  if (!space) {
    return { hasAccess: false, space: null, role: null };
  }

  const collection = await db.prepare(
    'SELECT id, organization_id FROM collections WHERE id = ? AND deleted_at IS NULL'
  )
    .bind(space.collection_id)
    .first<Collection>();

  if (!collection) {
    return { hasAccess: false, space: null, role: null };
  }

  const membership = await checkOrgMembership(db, userId, collection.organization_id, minRole);
  return { hasAccess: membership.isMember, space, role: membership.role };
}

/**
 * Verify user has access to page
 */
async function verifyPageAccess(
  db: D1Database,
  userId: string,
  pageId: string,
  minRole?: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<{ hasAccess: boolean; page: Page | null; role: string | null }> {
  const page = await db.prepare(
    'SELECT * FROM pages WHERE id = ? AND deleted_at IS NULL'
  )
    .bind(pageId)
    .first<Page>();

  if (!page) {
    return { hasAccess: false, page: null, role: null };
  }

  const spaceAccess = await verifySpaceAccess(db, userId, page.space_id, minRole);
  return { hasAccess: spaceAccess.hasAccess, page, role: spaceAccess.role };
}

/**
 * GET /spaces/:spaceId/pages
 * List all pages in a space
 */
pages.get('/spaces/:spaceId/pages', async (c) => {
  try {
    const userId = c.get('userId');
    const spaceId = c.req.param('spaceId');
    const parentId = c.req.query('parentId');

    const access = await verifySpaceAccess(c.env.DB, userId, spaceId);
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Space not found' },
        404
      );
    }

    let query = `SELECT * FROM pages WHERE space_id = ? AND deleted_at IS NULL`;
    const params: (string | null)[] = [spaceId];

    if (parentId === 'null' || parentId === '') {
      query += ' AND parent_id IS NULL';
    } else if (parentId) {
      query += ' AND parent_id = ?';
      params.push(parentId);
    }

    query += ' ORDER BY position ASC, title ASC';

    const results = await c.env.DB.prepare(query)
      .bind(...params)
      .all<Page>();

    return c.json<ApiResponse<{ pages: Page[] }>>(
      {
        success: true,
        data: { pages: results.results || [] }
      },
      200
    );
  } catch (error) {
    console.error('List pages error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to list pages' },
      500
    );
  }
});

/**
 * POST /spaces/:spaceId/pages
 * Create a new page
 */
pages.post('/spaces/:spaceId/pages', async (c) => {
  try {
    const userId = c.get('userId');
    const spaceId = c.req.param('spaceId');

    const access = await verifySpaceAccess(c.env.DB, userId, spaceId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      title?: string;
      parentId?: string;
      icon?: string;
      coverUrl?: string;
      position?: number;
      isTemplate?: boolean;
    }>();

    const id = crypto.randomUUID();
    const title = body.title?.trim() || 'Untitled';
    const slug = generateSlug(title);
    const now = new Date().toISOString();

    // Get max position if not provided
    let position = body.position;
    if (position === undefined) {
      const whereClause = body.parentId
        ? 'space_id = ? AND parent_id = ? AND deleted_at IS NULL'
        : 'space_id = ? AND parent_id IS NULL AND deleted_at IS NULL';

      const params = body.parentId ? [spaceId, body.parentId] : [spaceId];

      const maxPos = await c.env.DB.prepare(
        `SELECT MAX(position) as max_pos FROM pages WHERE ${whereClause}`
      )
        .bind(...params)
        .first<{ max_pos: number | null }>();
      position = (maxPos?.max_pos ?? -1) + 1;
    }

    await c.env.DB.prepare(
      `INSERT INTO pages (id, space_id, parent_id, title, slug, icon, cover_url, position, is_template, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        spaceId,
        body.parentId || null,
        title,
        slug,
        body.icon || null,
        body.coverUrl || null,
        position,
        body.isTemplate ? 1 : 0,
        userId,
        now,
        now
      )
      .run();

    const page: Page = {
      id,
      space_id: spaceId,
      parent_id: body.parentId || null,
      title,
      slug,
      icon: body.icon || null,
      cover_url: body.coverUrl || null,
      position,
      is_template: body.isTemplate || false,
      created_by: userId,
      created_at: now,
      updated_at: now
    };

    return c.json<ApiResponse<{ page: Page }>>(
      {
        success: true,
        data: { page },
        message: 'Page created successfully'
      },
      201
    );
  } catch (error) {
    console.error('Create page error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to create page' },
      500
    );
  }
});

/**
 * GET /pages/:pageId
 * Get a specific page
 */
pages.get('/pages/:pageId', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId);
    if (!access.hasAccess || !access.page) {
      return c.json<ApiResponse>(
        { success: false, error: 'Page not found' },
        404
      );
    }

    return c.json<ApiResponse<{ page: Page }>>(
      {
        success: true,
        data: { page: access.page }
      },
      200
    );
  } catch (error) {
    console.error('Get page error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to get page' },
      500
    );
  }
});

/**
 * PATCH /pages/:pageId
 * Update a page
 */
pages.patch('/pages/:pageId', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      title?: string;
      parentId?: string | null;
      icon?: string | null;
      coverUrl?: string | null;
      position?: number;
      isTemplate?: boolean;
    }>();

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title.trim() || 'Untitled');
      updates.push('slug = ?');
      values.push(generateSlug(body.title || 'Untitled'));
    }

    if (body.parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(body.parentId);
    }

    if (body.icon !== undefined) {
      updates.push('icon = ?');
      values.push(body.icon);
    }

    if (body.coverUrl !== undefined) {
      updates.push('cover_url = ?');
      values.push(body.coverUrl);
    }

    if (body.position !== undefined) {
      updates.push('position = ?');
      values.push(body.position);
    }

    if (body.isTemplate !== undefined) {
      updates.push('is_template = ?');
      values.push(body.isTemplate ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>(
        { success: false, error: 'No updates provided' },
        400
      );
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(pageId);

    await c.env.DB.prepare(
      `UPDATE pages SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    const updatedPage = await c.env.DB.prepare(
      'SELECT * FROM pages WHERE id = ?'
    )
      .bind(pageId)
      .first<Page>();

    return c.json<ApiResponse<{ page: Page }>>(
      {
        success: true,
        data: { page: updatedPage! },
        message: 'Page updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update page error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update page' },
      500
    );
  }
});

/**
 * DELETE /pages/:pageId
 * Soft delete a page and its children
 */
pages.delete('/pages/:pageId', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const now = new Date().toISOString();

    // Soft delete the page and all child pages recursively
    // Using a CTE for recursive deletion
    await c.env.DB.prepare(
      `WITH RECURSIVE descendants AS (
        SELECT id FROM pages WHERE id = ?
        UNION ALL
        SELECT p.id FROM pages p
        INNER JOIN descendants d ON p.parent_id = d.id
        WHERE p.deleted_at IS NULL
      )
      UPDATE pages SET deleted_at = ?, updated_at = ?
      WHERE id IN (SELECT id FROM descendants)`
    )
      .bind(pageId, now, now)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Page deleted successfully'
      },
      200
    );
  } catch (error) {
    console.error('Delete page error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to delete page' },
      500
    );
  }
});

/**
 * GET /pages/:pageId/blocks
 * Get all blocks for a page
 */
pages.get('/pages/:pageId/blocks', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId);
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Page not found' },
        404
      );
    }

    const results = await c.env.DB.prepare(
      `SELECT * FROM blocks
       WHERE page_id = ? AND deleted_at IS NULL
       ORDER BY position ASC`
    )
      .bind(pageId)
      .all<Block>();

    // Parse content JSON for each block
    const blocks = (results.results || []).map(block => ({
      ...block,
      content: JSON.parse(block.content || '{}')
    }));

    return c.json<ApiResponse<{ blocks: (Omit<Block, 'content'> & { content: BlockContent })[] }>>(
      {
        success: true,
        data: { blocks }
      },
      200
    );
  } catch (error) {
    console.error('Get blocks error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to get blocks' },
      500
    );
  }
});

/**
 * PUT /pages/:pageId/blocks
 * Save all blocks for a page (replace)
 */
pages.put('/pages/:pageId/blocks', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      blocks: Array<{
        id?: string;
        parentId?: string | null;
        type: string;
        content: BlockContent;
        position: number;
      }>;
    }>();

    if (!Array.isArray(body.blocks)) {
      return c.json<ApiResponse>(
        { success: false, error: 'Blocks array is required' },
        400
      );
    }

    const now = new Date().toISOString();

    // Soft delete existing blocks
    await c.env.DB.prepare(
      'UPDATE blocks SET deleted_at = ?, updated_at = ? WHERE page_id = ? AND deleted_at IS NULL'
    )
      .bind(now, now, pageId)
      .run();

    // Insert new blocks
    const insertStmt = c.env.DB.prepare(
      `INSERT INTO blocks (id, page_id, parent_id, type, content, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertPromises = body.blocks.map((block, index) => {
      const id = block.id || crypto.randomUUID();
      return insertStmt
        .bind(
          id,
          pageId,
          block.parentId || null,
          block.type,
          JSON.stringify(block.content),
          block.position ?? index,
          now,
          now
        )
        .run();
    });

    await Promise.all(insertPromises);

    // Update page updated_at
    await c.env.DB.prepare(
      'UPDATE pages SET updated_at = ? WHERE id = ?'
    )
      .bind(now, pageId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Blocks saved successfully'
      },
      200
    );
  } catch (error) {
    console.error('Save blocks error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to save blocks' },
      500
    );
  }
});

/**
 * POST /pages/:pageId/blocks
 * Add a single block to a page
 */
pages.post('/pages/:pageId/blocks', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      parentId?: string;
      type: string;
      content: BlockContent;
      position?: number;
    }>();

    if (!body.type) {
      return c.json<ApiResponse>(
        { success: false, error: 'Block type is required' },
        400
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Get max position if not provided
    let position = body.position;
    if (position === undefined) {
      const whereClause = body.parentId
        ? 'page_id = ? AND parent_id = ? AND deleted_at IS NULL'
        : 'page_id = ? AND parent_id IS NULL AND deleted_at IS NULL';

      const params = body.parentId ? [pageId, body.parentId] : [pageId];

      const maxPos = await c.env.DB.prepare(
        `SELECT MAX(position) as max_pos FROM blocks WHERE ${whereClause}`
      )
        .bind(...params)
        .first<{ max_pos: number | null }>();
      position = (maxPos?.max_pos ?? -1) + 1;
    }

    await c.env.DB.prepare(
      `INSERT INTO blocks (id, page_id, parent_id, type, content, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        pageId,
        body.parentId || null,
        body.type,
        JSON.stringify(body.content || {}),
        position,
        now,
        now
      )
      .run();

    const block = {
      id,
      page_id: pageId,
      parent_id: body.parentId || null,
      type: body.type,
      content: body.content || {},
      position,
      created_at: now,
      updated_at: now
    };

    return c.json<ApiResponse<{ block: typeof block }>>(
      {
        success: true,
        data: { block },
        message: 'Block created successfully'
      },
      201
    );
  } catch (error) {
    console.error('Create block error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to create block' },
      500
    );
  }
});

/**
 * PATCH /pages/:pageId/blocks/:blockId
 * Update a single block
 */
pages.patch('/pages/:pageId/blocks/:blockId', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');
    const blockId = c.req.param('blockId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      parentId?: string | null;
      type?: string;
      content?: BlockContent;
      position?: number;
    }>();

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.parentId !== undefined) {
      updates.push('parent_id = ?');
      values.push(body.parentId);
    }

    if (body.type !== undefined) {
      updates.push('type = ?');
      values.push(body.type);
    }

    if (body.content !== undefined) {
      updates.push('content = ?');
      values.push(JSON.stringify(body.content));
    }

    if (body.position !== undefined) {
      updates.push('position = ?');
      values.push(body.position);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>(
        { success: false, error: 'No updates provided' },
        400
      );
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(blockId);
    values.push(pageId);

    await c.env.DB.prepare(
      `UPDATE blocks SET ${updates.join(', ')} WHERE id = ? AND page_id = ?`
    )
      .bind(...values)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Block updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update block error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update block' },
      500
    );
  }
});

/**
 * DELETE /pages/:pageId/blocks/:blockId
 * Delete a single block
 */
pages.delete('/pages/:pageId/blocks/:blockId', async (c) => {
  try {
    const userId = c.get('userId');
    const pageId = c.req.param('pageId');
    const blockId = c.req.param('blockId');

    const access = await verifyPageAccess(c.env.DB, userId, pageId, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE blocks SET deleted_at = ?, updated_at = ? WHERE id = ? AND page_id = ?'
    )
      .bind(now, now, blockId, pageId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Block deleted successfully'
      },
      200
    );
  } catch (error) {
    console.error('Delete block error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to delete block' },
      500
    );
  }
});

export default pages;
