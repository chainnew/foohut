/**
 * Organization service for foohut.com backend API
 */

import { nanoid } from 'nanoid';
import type {
  Organization,
  OrganizationMember,
  Collection,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../types/index.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { logger } from '../index.js';

// ============================================================================
// Types
// ============================================================================

interface PaginationOptions {
  limit: number;
  offset: number;
}

interface CreateOrgInput extends CreateOrganizationInput {
  ownerId: string;
  settings?: {
    defaultVisibility?: 'public' | 'private' | 'internal';
    allowPublicPages?: boolean;
    aiEnabled?: boolean;
  };
}

// ============================================================================
// Service Implementation
// ============================================================================

class OrganizationService {
  /**
   * List organizations for a user
   */
  async listForUser(
    userId: string,
    options: PaginationOptions
  ): Promise<{ organizations: Organization[]; total: number }> {
    logger.debug({ userId, ...options }, 'Listing organizations for user');

    // TODO: Query organizations where user is a member
    // SELECT o.* FROM organizations o
    // JOIN organization_members om ON o.id = om.organization_id
    // WHERE om.user_id = $userId
    // ORDER BY o.name
    // LIMIT $limit OFFSET $offset

    return { organizations: [], total: 0 };
  }

  /**
   * Create a new organization
   */
  async create(input: CreateOrgInput): Promise<Organization> {
    const { name, slug, description, ownerId, settings } = input;

    logger.info({ name, ownerId }, 'Creating organization');

    // Generate slug if not provided
    const orgSlug = slug || this.generateSlug(name);

    // Check if slug is available
    const existing = await this.findBySlug(orgSlug);
    if (existing) {
      throw new ConflictError('Organization slug already taken');
    }

    const org: Organization = {
      id: nanoid(),
      name,
      slug: orgSlug,
      description: description || null,
      logoUrl: null,
      ownerId,
      settings: {
        defaultVisibility: settings?.defaultVisibility || 'private',
        allowPublicPages: settings?.allowPublicPages || false,
        aiEnabled: settings?.aiEnabled ?? true,
        maxMembers: 50,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Create owner membership record

    logger.info({ orgId: org.id }, 'Organization created');

    return org;
  }

  /**
   * Get organization by ID
   */
  async getById(orgId: string): Promise<Organization> {
    logger.debug({ orgId }, 'Getting organization by ID');

    // TODO: Query database
    const org = await this.findById(orgId);
    if (!org) {
      throw new NotFoundError('Organization');
    }

    return org;
  }

  /**
   * Update organization
   */
  async update(orgId: string, input: UpdateOrganizationInput): Promise<Organization> {
    logger.info({ orgId }, 'Updating organization');

    const org = await this.getById(orgId);

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== org.slug) {
      const existing = await this.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError('Organization slug already taken');
      }
    }

    const updated: Organization = {
      ...org,
      ...input,
      updatedAt: new Date(),
    };

    // TODO: Update in database

    return updated;
  }

  /**
   * Delete organization
   */
  async delete(orgId: string): Promise<void> {
    logger.info({ orgId }, 'Deleting organization');

    // TODO: Check if organization exists
    await this.getById(orgId);

    // TODO: Delete organization and cascade to:
    // - Collections
    // - Spaces
    // - Pages
    // - Members

    logger.info({ orgId }, 'Organization deleted');
  }

  /**
   * List organization members
   */
  async listMembers(
    orgId: string,
    options: PaginationOptions
  ): Promise<{ members: OrganizationMember[]; total: number }> {
    logger.debug({ orgId, ...options }, 'Listing organization members');

    // TODO: Query organization_members with user join

    return { members: [], total: 0 };
  }

  /**
   * Invite member to organization
   */
  async inviteMember(
    orgId: string,
    email: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<{ invitationId: string; email: string }> {
    logger.info({ orgId, email, role }, 'Inviting member to organization');

    // TODO: Check if user already a member
    // TODO: Check if invitation already pending
    // TODO: Create invitation record
    // TODO: Send invitation email

    const invitationId = nanoid();

    return { invitationId, email };
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<OrganizationMember> {
    logger.info({ orgId, memberId, role }, 'Updating member role');

    // TODO: Get member record
    // TODO: Check not changing owner role
    // TODO: Update role

    const member: OrganizationMember = {
      id: memberId,
      organizationId: orgId,
      userId: 'user-id',
      role,
      joinedAt: new Date(),
    };

    return member;
  }

  /**
   * Remove member from organization
   */
  async removeMember(orgId: string, memberId: string): Promise<void> {
    logger.info({ orgId, memberId }, 'Removing member from organization');

    // TODO: Check member exists
    // TODO: Check not removing owner
    // TODO: Delete member record
  }

  /**
   * Leave organization
   */
  async leaveOrganization(orgId: string, userId: string): Promise<void> {
    logger.info({ orgId, userId }, 'User leaving organization');

    // TODO: Check user is member
    // TODO: Check user is not owner
    // TODO: Delete member record

    const org = await this.getById(orgId);
    if (org.ownerId === userId) {
      throw new ForbiddenError('Owner cannot leave organization. Transfer ownership first.');
    }
  }

  /**
   * List collections in organization
   */
  async listCollections(
    orgId: string,
    options: PaginationOptions
  ): Promise<{ collections: Collection[]; total: number }> {
    logger.debug({ orgId, ...options }, 'Listing organization collections');

    // TODO: Query collections for organization

    return { collections: [], total: 0 };
  }

  /**
   * Create collection in organization
   */
  async createCollection(
    orgId: string,
    input: {
      name: string;
      slug?: string;
      description?: string;
      icon?: string;
      color?: string;
      visibility?: 'public' | 'private' | 'internal';
      parentId?: string;
    }
  ): Promise<Collection> {
    logger.info({ orgId, name: input.name }, 'Creating collection');

    const collection: Collection = {
      id: nanoid(),
      organizationId: orgId,
      name: input.name,
      slug: input.slug || this.generateSlug(input.name),
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
      parentId: input.parentId || null,
      position: 0,
      visibility: input.visibility || 'private',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Calculate position

    return collection;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async findById(_orgId: string): Promise<Organization | null> {
    // TODO: Query database
    return null;
  }

  private async findBySlug(_slug: string): Promise<Organization | null> {
    // TODO: Query database
    return null;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();
