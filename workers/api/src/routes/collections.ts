import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types/index';
import { requireAuth, checkOrgMembership } from '../middleware/auth';

interface Collection {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

const collections = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
collections.use('*', requireAuth);

/**
 * Generate URL-friendly slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * GET /organizations/:orgId/collections
 * List all collections in an organization
 */
collections.get('/organizations/:orgId/collections', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    const membership = await checkOrgMembership(c.env.DB, userId, orgId);
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Organization not found' },
        404
      );
    }

    const results = await c.env.DB.prepare(
      `SELECT * FROM collections
       WHERE organization_id = ? AND deleted_at IS NULL
       ORDER BY position ASC, name ASC`
    )
      .bind(orgId)
      .all<Collection>();

    return c.json<ApiResponse<{ collections: Collection[] }>>(
      {
        success: true,
        data: { collections: results.results || [] }
      },
      200
    );
  } catch (error) {
    console.error('List collections error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to list collections' },
      500
    );
  }
});

/**
 * POST /organizations/:orgId/collections
 * Create a new collection
 */
collections.post('/organizations/:orgId/collections', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    const membership = await checkOrgMembership(c.env.DB, userId, orgId, 'member');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      name: string;
      description?: string;
      icon?: string;
      position?: number;
    }>();

    if (!body.name?.trim()) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection name is required' },
        400
      );
    }

    const id = crypto.randomUUID();
    const slug = generateSlug(body.name);
    const now = new Date().toISOString();

    // Get max position if not provided
    let position = body.position;
    if (position === undefined) {
      const maxPos = await c.env.DB.prepare(
        'SELECT MAX(position) as max_pos FROM collections WHERE organization_id = ? AND deleted_at IS NULL'
      )
        .bind(orgId)
        .first<{ max_pos: number | null }>();
      position = (maxPos?.max_pos ?? -1) + 1;
    }

    await c.env.DB.prepare(
      `INSERT INTO collections (id, organization_id, name, slug, description, icon, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        orgId,
        body.name.trim(),
        slug,
        body.description?.trim() || null,
        body.icon || null,
        position,
        now,
        now
      )
      .run();

    const collection: Collection = {
      id,
      organization_id: orgId,
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || null,
      icon: body.icon || null,
      position,
      created_at: now,
      updated_at: now
    };

    return c.json<ApiResponse<{ collection: Collection }>>(
      {
        success: true,
        data: { collection },
        message: 'Collection created successfully'
      },
      201
    );
  } catch (error) {
    console.error('Create collection error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to create collection' },
      500
    );
  }
});

/**
 * GET /collections/:collectionId
 * Get a specific collection
 */
collections.get('/collections/:collectionId', async (c) => {
  try {
    const userId = c.get('userId');
    const collectionId = c.req.param('collectionId');

    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(collectionId)
      .first<Collection>();

    if (!collection) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    const membership = await checkOrgMembership(c.env.DB, userId, collection.organization_id);
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    return c.json<ApiResponse<{ collection: Collection }>>(
      {
        success: true,
        data: { collection }
      },
      200
    );
  } catch (error) {
    console.error('Get collection error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to get collection' },
      500
    );
  }
});

/**
 * PATCH /collections/:collectionId
 * Update a collection
 */
collections.patch('/collections/:collectionId', async (c) => {
  try {
    const userId = c.get('userId');
    const collectionId = c.req.param('collectionId');

    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(collectionId)
      .first<Collection>();

    if (!collection) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    const membership = await checkOrgMembership(c.env.DB, userId, collection.organization_id, 'member');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      name?: string;
      description?: string;
      icon?: string;
      position?: number;
    }>();

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name.trim());
      updates.push('slug = ?');
      values.push(generateSlug(body.name));
    }

    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description?.trim() || null);
    }

    if (body.icon !== undefined) {
      updates.push('icon = ?');
      values.push(body.icon || null);
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
    values.push(collectionId);

    await c.env.DB.prepare(
      `UPDATE collections SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    const updatedCollection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ?'
    )
      .bind(collectionId)
      .first<Collection>();

    return c.json<ApiResponse<{ collection: Collection }>>(
      {
        success: true,
        data: { collection: updatedCollection! },
        message: 'Collection updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update collection error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update collection' },
      500
    );
  }
});

/**
 * DELETE /collections/:collectionId
 * Soft delete a collection
 */
collections.delete('/collections/:collectionId', async (c) => {
  try {
    const userId = c.get('userId');
    const collectionId = c.req.param('collectionId');

    const collection = await c.env.DB.prepare(
      'SELECT * FROM collections WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(collectionId)
      .first<Collection>();

    if (!collection) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    const membership = await checkOrgMembership(c.env.DB, userId, collection.organization_id, 'admin');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE collections SET deleted_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind(now, now, collectionId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Collection deleted successfully'
      },
      200
    );
  } catch (error) {
    console.error('Delete collection error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to delete collection' },
      500
    );
  }
});

export default collections;
