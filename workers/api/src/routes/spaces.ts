import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse } from '../types/index';
import { requireAuth, checkOrgMembership } from '../middleware/auth';

interface Space {
  id: string;
  collection_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface Collection {
  id: string;
  organization_id: string;
  name: string;
}

const spaces = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
spaces.use('*', requireAuth);

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
 * Verify user has access to collection
 */
async function verifyCollectionAccess(
  db: D1Database,
  userId: string,
  collectionId: string,
  minRole?: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<{ hasAccess: boolean; collection: Collection | null; role: string | null }> {
  const collection = await db.prepare(
    'SELECT id, organization_id, name FROM collections WHERE id = ? AND deleted_at IS NULL'
  )
    .bind(collectionId)
    .first<Collection>();

  if (!collection) {
    return { hasAccess: false, collection: null, role: null };
  }

  const membership = await checkOrgMembership(db, userId, collection.organization_id, minRole);
  return { hasAccess: membership.isMember, collection, role: membership.role };
}

/**
 * GET /collections/:collectionId/spaces
 * List all spaces in a collection
 */
spaces.get('/collections/:collectionId/spaces', async (c) => {
  try {
    const userId = c.get('userId');
    const collectionId = c.req.param('collectionId');

    const access = await verifyCollectionAccess(c.env.DB, userId, collectionId);
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Collection not found' },
        404
      );
    }

    const results = await c.env.DB.prepare(
      `SELECT * FROM spaces
       WHERE collection_id = ? AND deleted_at IS NULL
       ORDER BY position ASC, name ASC`
    )
      .bind(collectionId)
      .all<Space>();

    return c.json<ApiResponse<{ spaces: Space[] }>>(
      {
        success: true,
        data: { spaces: results.results || [] }
      },
      200
    );
  } catch (error) {
    console.error('List spaces error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to list spaces' },
      500
    );
  }
});

/**
 * POST /collections/:collectionId/spaces
 * Create a new space in a collection
 */
spaces.post('/collections/:collectionId/spaces', async (c) => {
  try {
    const userId = c.get('userId');
    const collectionId = c.req.param('collectionId');

    const access = await verifyCollectionAccess(c.env.DB, userId, collectionId, 'member');
    if (!access.hasAccess) {
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
        { success: false, error: 'Space name is required' },
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
        'SELECT MAX(position) as max_pos FROM spaces WHERE collection_id = ? AND deleted_at IS NULL'
      )
        .bind(collectionId)
        .first<{ max_pos: number | null }>();
      position = (maxPos?.max_pos ?? -1) + 1;
    }

    await c.env.DB.prepare(
      `INSERT INTO spaces (id, collection_id, name, slug, description, icon, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        collectionId,
        body.name.trim(),
        slug,
        body.description?.trim() || null,
        body.icon || null,
        position,
        now,
        now
      )
      .run();

    const space: Space = {
      id,
      collection_id: collectionId,
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || null,
      icon: body.icon || null,
      position,
      created_at: now,
      updated_at: now
    };

    return c.json<ApiResponse<{ space: Space }>>(
      {
        success: true,
        data: { space },
        message: 'Space created successfully'
      },
      201
    );
  } catch (error) {
    console.error('Create space error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to create space' },
      500
    );
  }
});

/**
 * GET /spaces/:spaceId
 * Get a specific space
 */
spaces.get('/spaces/:spaceId', async (c) => {
  try {
    const userId = c.get('userId');
    const spaceId = c.req.param('spaceId');

    const space = await c.env.DB.prepare(
      'SELECT * FROM spaces WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(spaceId)
      .first<Space>();

    if (!space) {
      return c.json<ApiResponse>(
        { success: false, error: 'Space not found' },
        404
      );
    }

    const access = await verifyCollectionAccess(c.env.DB, userId, space.collection_id);
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Space not found' },
        404
      );
    }

    return c.json<ApiResponse<{ space: Space }>>(
      {
        success: true,
        data: { space }
      },
      200
    );
  } catch (error) {
    console.error('Get space error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to get space' },
      500
    );
  }
});

/**
 * PATCH /spaces/:spaceId
 * Update a space
 */
spaces.patch('/spaces/:spaceId', async (c) => {
  try {
    const userId = c.get('userId');
    const spaceId = c.req.param('spaceId');

    const space = await c.env.DB.prepare(
      'SELECT * FROM spaces WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(spaceId)
      .first<Space>();

    if (!space) {
      return c.json<ApiResponse>(
        { success: false, error: 'Space not found' },
        404
      );
    }

    const access = await verifyCollectionAccess(c.env.DB, userId, space.collection_id, 'member');
    if (!access.hasAccess) {
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
    values.push(spaceId);

    await c.env.DB.prepare(
      `UPDATE spaces SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    const updatedSpace = await c.env.DB.prepare(
      'SELECT * FROM spaces WHERE id = ?'
    )
      .bind(spaceId)
      .first<Space>();

    return c.json<ApiResponse<{ space: Space }>>(
      {
        success: true,
        data: { space: updatedSpace! },
        message: 'Space updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update space error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update space' },
      500
    );
  }
});

/**
 * DELETE /spaces/:spaceId
 * Soft delete a space
 */
spaces.delete('/spaces/:spaceId', async (c) => {
  try {
    const userId = c.get('userId');
    const spaceId = c.req.param('spaceId');

    const space = await c.env.DB.prepare(
      'SELECT * FROM spaces WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(spaceId)
      .first<Space>();

    if (!space) {
      return c.json<ApiResponse>(
        { success: false, error: 'Space not found' },
        404
      );
    }

    const access = await verifyCollectionAccess(c.env.DB, userId, space.collection_id, 'admin');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE spaces SET deleted_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind(now, now, spaceId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Space deleted successfully'
      },
      200
    );
  } catch (error) {
    console.error('Delete space error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to delete space' },
      500
    );
  }
});

/**
 * POST /spaces/:spaceId/reorder
 * Reorder spaces within a collection
 */
spaces.post('/spaces/:spaceId/reorder', async (c) => {
  try {
    const userId = c.get('userId');
    const spaceId = c.req.param('spaceId');

    const space = await c.env.DB.prepare(
      'SELECT * FROM spaces WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(spaceId)
      .first<Space>();

    if (!space) {
      return c.json<ApiResponse>(
        { success: false, error: 'Space not found' },
        404
      );
    }

    const access = await verifyCollectionAccess(c.env.DB, userId, space.collection_id, 'member');
    if (!access.hasAccess) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{ position: number }>();

    if (typeof body.position !== 'number' || body.position < 0) {
      return c.json<ApiResponse>(
        { success: false, error: 'Valid position is required' },
        400
      );
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE spaces SET position = ?, updated_at = ? WHERE id = ?'
    )
      .bind(body.position, now, spaceId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Space reordered successfully'
      },
      200
    );
  } catch (error) {
    console.error('Reorder space error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to reorder space' },
      500
    );
  }
});

export default spaces;
