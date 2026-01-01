import { Hono } from 'hono';
import { Env, AuthUser, ApiResponse, MemberRole } from '../types/index';
import { requireAuth, checkOrgMembership } from '../middleware/auth';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: MemberRole;
  email: string;
  display_name: string | null;
  joined_at: string;
}

const organizations = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>();

// All routes require authentication
organizations.use('*', requireAuth);

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
 * GET /organizations
 * List all organizations the user is a member of
 */
organizations.get('/', async (c) => {
  try {
    const userId = c.get('userId');

    const results = await c.env.DB.prepare(
      `SELECT o.* FROM organizations o
       INNER JOIN organization_members om ON o.id = om.organization_id
       WHERE om.user_id = ? AND o.deleted_at IS NULL AND om.is_active = 1
       ORDER BY o.name ASC`
    )
      .bind(userId)
      .all<Organization>();

    return c.json<ApiResponse<{ organizations: Organization[] }>>(
      {
        success: true,
        data: { organizations: results.results || [] }
      },
      200
    );
  } catch (error) {
    console.error('List organizations error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to list organizations' },
      500
    );
  }
});

/**
 * POST /organizations
 * Create a new organization
 */
organizations.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json<{
      name: string;
      description?: string;
      iconUrl?: string;
    }>();

    // Validate input
    if (!body.name?.trim()) {
      return c.json<ApiResponse>(
        { success: false, error: 'Organization name is required' },
        400
      );
    }

    const id = crypto.randomUUID();
    const slug = generateSlug(body.name);
    const now = new Date().toISOString();

    // Check if slug is unique
    const existing = await c.env.DB.prepare(
      'SELECT id FROM organizations WHERE slug = ? AND deleted_at IS NULL'
    )
      .bind(slug)
      .first();

    if (existing) {
      return c.json<ApiResponse>(
        { success: false, error: 'An organization with this name already exists' },
        409
      );
    }

    // Create organization
    await c.env.DB.prepare(
      `INSERT INTO organizations (id, name, slug, description, icon_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, body.name.trim(), slug, body.description?.trim() || null, body.iconUrl || null, now, now)
      .run();

    // Add creator as owner
    const memberId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', ?, ?)`
    )
      .bind(memberId, id, userId, now, now)
      .run();

    const organization: Organization = {
      id,
      name: body.name.trim(),
      slug,
      description: body.description?.trim() || null,
      icon_url: body.iconUrl || null,
      created_at: now,
      updated_at: now
    };

    return c.json<ApiResponse<{ organization: Organization }>>(
      {
        success: true,
        data: { organization },
        message: 'Organization created successfully'
      },
      201
    );
  } catch (error) {
    console.error('Create organization error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to create organization' },
      500
    );
  }
});

/**
 * GET /organizations/:orgId
 * Get a specific organization
 */
organizations.get('/:orgId', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    // Check membership
    const membership = await checkOrgMembership(c.env.DB, userId, orgId);
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Organization not found' },
        404
      );
    }

    const organization = await c.env.DB.prepare(
      'SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(orgId)
      .first<Organization>();

    if (!organization) {
      return c.json<ApiResponse>(
        { success: false, error: 'Organization not found' },
        404
      );
    }

    return c.json<ApiResponse<{ organization: Organization; role: string }>>(
      {
        success: true,
        data: { organization, role: membership.role! }
      },
      200
    );
  } catch (error) {
    console.error('Get organization error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to get organization' },
      500
    );
  }
});

/**
 * PATCH /organizations/:orgId
 * Update an organization
 */
organizations.patch('/:orgId', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    // Check admin or owner role
    const membership = await checkOrgMembership(c.env.DB, userId, orgId, 'admin');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      name?: string;
      description?: string;
      iconUrl?: string;
    }>();

    const updates: string[] = [];
    const values: (string | null)[] = [];

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

    if (body.iconUrl !== undefined) {
      updates.push('icon_url = ?');
      values.push(body.iconUrl || null);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>(
        { success: false, error: 'No updates provided' },
        400
      );
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(orgId);

    await c.env.DB.prepare(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
    )
      .bind(...values)
      .run();

    const organization = await c.env.DB.prepare(
      'SELECT * FROM organizations WHERE id = ?'
    )
      .bind(orgId)
      .first<Organization>();

    return c.json<ApiResponse<{ organization: Organization }>>(
      {
        success: true,
        data: { organization: organization! },
        message: 'Organization updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update organization error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update organization' },
      500
    );
  }
});

/**
 * DELETE /organizations/:orgId
 * Soft delete an organization
 */
organizations.delete('/:orgId', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    // Only owner can delete
    const membership = await checkOrgMembership(c.env.DB, userId, orgId, 'owner');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Only the owner can delete the organization' },
        403
      );
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE organizations SET deleted_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind(now, now, orgId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Organization deleted successfully'
      },
      200
    );
  } catch (error) {
    console.error('Delete organization error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to delete organization' },
      500
    );
  }
});

/**
 * GET /organizations/:orgId/members
 * List organization members
 */
organizations.get('/:orgId/members', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    // Check membership
    const membership = await checkOrgMembership(c.env.DB, userId, orgId);
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Organization not found' },
        404
      );
    }

    const results = await c.env.DB.prepare(
      `SELECT om.id, om.user_id, om.organization_id, om.role,
              u.email, u.display_name, om.created_at as joined_at
       FROM organization_members om
       INNER JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = ? AND om.is_active = 1 AND u.deleted_at IS NULL
       ORDER BY om.created_at ASC`
    )
      .bind(orgId)
      .all<OrganizationMember>();

    return c.json<ApiResponse<{ members: OrganizationMember[] }>>(
      {
        success: true,
        data: { members: results.results || [] }
      },
      200
    );
  } catch (error) {
    console.error('List members error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to list members' },
      500
    );
  }
});

/**
 * POST /organizations/:orgId/members
 * Add a member to organization
 */
organizations.post('/:orgId/members', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');

    // Check admin or owner role
    const membership = await checkOrgMembership(c.env.DB, userId, orgId, 'admin');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    const body = await c.req.json<{
      email: string;
      role?: MemberRole;
    }>();

    if (!body.email?.trim()) {
      return c.json<ApiResponse>(
        { success: false, error: 'Email is required' },
        400
      );
    }

    // Find user by email
    const targetUser = await c.env.DB.prepare(
      'SELECT id, email, display_name FROM users WHERE email = ? AND deleted_at IS NULL'
    )
      .bind(body.email.toLowerCase().trim())
      .first<{ id: string; email: string; display_name: string | null }>();

    if (!targetUser) {
      return c.json<ApiResponse>(
        { success: false, error: 'User not found with this email' },
        404
      );
    }

    // Check if already a member
    const existingMember = await c.env.DB.prepare(
      'SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ? AND is_active = 1'
    )
      .bind(orgId, targetUser.id)
      .first();

    if (existingMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'User is already a member' },
        409
      );
    }

    // Only owner can add owner/admin roles
    const role: MemberRole = body.role || 'member';
    if ((role === 'owner' || role === 'admin') && membership.role !== 'owner') {
      return c.json<ApiResponse>(
        { success: false, error: 'Only owner can add admin or owner roles' },
        403
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO organization_members (id, organization_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, orgId, targetUser.id, role, now, now)
      .run();

    const member: OrganizationMember = {
      id,
      user_id: targetUser.id,
      organization_id: orgId,
      role,
      email: targetUser.email,
      display_name: targetUser.display_name,
      joined_at: now
    };

    return c.json<ApiResponse<{ member: OrganizationMember }>>(
      {
        success: true,
        data: { member },
        message: 'Member added successfully'
      },
      201
    );
  } catch (error) {
    console.error('Add member error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to add member' },
      500
    );
  }
});

/**
 * PATCH /organizations/:orgId/members/:memberId
 * Update member role
 */
organizations.patch('/:orgId/members/:memberId', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');
    const memberId = c.req.param('memberId');

    // Only owner can change roles
    const membership = await checkOrgMembership(c.env.DB, userId, orgId, 'owner');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Only owner can change member roles' },
        403
      );
    }

    const body = await c.req.json<{ role: MemberRole }>();

    if (!body.role) {
      return c.json<ApiResponse>(
        { success: false, error: 'Role is required' },
        400
      );
    }

    const validRoles: MemberRole[] = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(body.role)) {
      return c.json<ApiResponse>(
        { success: false, error: 'Invalid role' },
        400
      );
    }

    await c.env.DB.prepare(
      `UPDATE organization_members SET role = ?, updated_at = ? WHERE id = ? AND organization_id = ?`
    )
      .bind(body.role, new Date().toISOString(), memberId, orgId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Member role updated successfully'
      },
      200
    );
  } catch (error) {
    console.error('Update member error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to update member' },
      500
    );
  }
});

/**
 * DELETE /organizations/:orgId/members/:memberId
 * Remove a member from organization
 */
organizations.delete('/:orgId/members/:memberId', async (c) => {
  try {
    const userId = c.get('userId');
    const orgId = c.req.param('orgId');
    const memberId = c.req.param('memberId');

    // Check admin or owner role
    const membership = await checkOrgMembership(c.env.DB, userId, orgId, 'admin');
    if (!membership.isMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Insufficient permissions' },
        403
      );
    }

    // Get target member
    const targetMember = await c.env.DB.prepare(
      'SELECT user_id, role FROM organization_members WHERE id = ? AND organization_id = ? AND is_active = 1'
    )
      .bind(memberId, orgId)
      .first<{ user_id: string; role: string }>();

    if (!targetMember) {
      return c.json<ApiResponse>(
        { success: false, error: 'Member not found' },
        404
      );
    }

    // Cannot remove owner unless you are owner
    if (targetMember.role === 'owner' && membership.role !== 'owner') {
      return c.json<ApiResponse>(
        { success: false, error: 'Cannot remove owner' },
        403
      );
    }

    // Cannot remove yourself if you're the only owner
    if (targetMember.user_id === userId && targetMember.role === 'owner') {
      const ownerCount = await c.env.DB.prepare(
        `SELECT COUNT(*) as count FROM organization_members
         WHERE organization_id = ? AND role = 'owner' AND is_active = 1`
      )
        .bind(orgId)
        .first<{ count: number }>();

      if (ownerCount && ownerCount.count <= 1) {
        return c.json<ApiResponse>(
          { success: false, error: 'Cannot remove the only owner' },
          403
        );
      }
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE organization_members SET is_active = 0, updated_at = ? WHERE id = ?'
    )
      .bind(now, memberId)
      .run();

    return c.json<ApiResponse>(
      {
        success: true,
        message: 'Member removed successfully'
      },
      200
    );
  } catch (error) {
    console.error('Remove member error:', error);
    return c.json<ApiResponse>(
      { success: false, error: 'Failed to remove member' },
      500
    );
  }
});

export default organizations;
