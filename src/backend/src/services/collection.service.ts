/**
 * Collection service for foohut.com backend API
 */

import { nanoid } from 'nanoid';
import type { Collection, Space, UpdateCollectionInput } from '../types/index.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { logger } from '../index.js';

// ============================================================================
// Types
// ============================================================================

interface PaginationOptions {
  limit: number;
  offset: number;
}

interface CollectionTree extends Collection {
  children: CollectionTree[];
  spaces: Space[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
  slug: string;
  type: 'organization' | 'collection';
}

// ============================================================================
// Service Implementation
// ============================================================================

class CollectionService {
  /**
   * Get collection by ID with access check
   */
  async getById(collectionId: string, userId?: string): Promise<Collection> {
    logger.debug({ collectionId, userId }, 'Getting collection by ID');

    const collection = await this.findById(collectionId);
    if (!collection) {
      throw new NotFoundError('Collection');
    }

    // Check access
    await this.checkAccess(collection, userId, 'read');

    return collection;
  }

  /**
   * Update collection
   */
  async update(
    collectionId: string,
    input: UpdateCollectionInput,
    userId?: string
  ): Promise<Collection> {
    logger.info({ collectionId }, 'Updating collection');

    const collection = await this.getById(collectionId, userId);
    await this.checkAccess(collection, userId, 'write');

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== collection.slug) {
      const existing = await this.findBySlugInOrg(collection.organizationId, input.slug);
      if (existing) {
        throw new ConflictError('Collection slug already exists in organization');
      }
    }

    const updated: Collection = {
      ...collection,
      ...input,
      updatedAt: new Date(),
    };

    // TODO: Update in database

    return updated;
  }

  /**
   * Delete collection
   */
  async delete(collectionId: string, userId?: string): Promise<void> {
    logger.info({ collectionId }, 'Deleting collection');

    const collection = await this.getById(collectionId, userId);
    await this.checkAccess(collection, userId, 'admin');

    // TODO: Delete collection and cascade to:
    // - Subcollections
    // - Spaces
    // - Pages

    logger.info({ collectionId }, 'Collection deleted');
  }

  /**
   * Move collection to different parent
   */
  async move(
    collectionId: string,
    parentId: string | null,
    position?: number,
    userId?: string
  ): Promise<Collection> {
    logger.info({ collectionId, parentId, position }, 'Moving collection');

    const collection = await this.getById(collectionId, userId);
    await this.checkAccess(collection, userId, 'write');

    // Validate parent if provided
    if (parentId) {
      const parent = await this.getById(parentId, userId);

      // Check same organization
      if (parent.organizationId !== collection.organizationId) {
        throw new ForbiddenError('Cannot move collection to different organization');
      }

      // Check for circular reference
      if (await this.wouldCreateCycle(collectionId, parentId)) {
        throw new ForbiddenError('Cannot move collection to its descendant');
      }
    }

    const updated: Collection = {
      ...collection,
      parentId,
      position: position ?? collection.position,
      updatedAt: new Date(),
    };

    // TODO: Update in database
    // TODO: Reorder siblings if position changed

    return updated;
  }

  /**
   * List spaces in collection
   */
  async listSpaces(
    collectionId: string,
    options: PaginationOptions,
    userId?: string
  ): Promise<{ spaces: Space[]; total: number }> {
    logger.debug({ collectionId, ...options }, 'Listing spaces in collection');

    const collection = await this.getById(collectionId, userId);
    await this.checkAccess(collection, userId, 'read');

    // TODO: Query spaces for collection

    return { spaces: [], total: 0 };
  }

  /**
   * Create space in collection
   */
  async createSpace(
    collectionId: string,
    input: {
      name: string;
      slug?: string;
      description?: string;
      icon?: string;
      color?: string;
      visibility?: 'public' | 'private' | 'internal';
      settings?: {
        allowComments?: boolean;
        allowReactions?: boolean;
        defaultPageTemplate?: string | null;
      };
    },
    userId?: string
  ): Promise<Space> {
    logger.info({ collectionId, name: input.name }, 'Creating space');

    const collection = await this.getById(collectionId, userId);
    await this.checkAccess(collection, userId, 'write');

    const space: Space = {
      id: nanoid(),
      collectionId,
      name: input.name,
      slug: input.slug || this.generateSlug(input.name),
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || null,
      position: 0,
      visibility: input.visibility || collection.visibility,
      settings: {
        allowComments: input.settings?.allowComments ?? true,
        allowReactions: input.settings?.allowReactions ?? true,
        defaultPageTemplate: input.settings?.defaultPageTemplate || null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Calculate position

    return space;
  }

  /**
   * Get collection tree with nested subcollections and spaces
   */
  async getTree(
    collectionId: string,
    depth: number = 3,
    userId?: string
  ): Promise<CollectionTree> {
    logger.debug({ collectionId, depth }, 'Getting collection tree');

    const collection = await this.getById(collectionId, userId);

    const tree: CollectionTree = {
      ...collection,
      children: [],
      spaces: [],
    };

    if (depth > 0) {
      // TODO: Recursively fetch children and spaces
      // tree.children = await this.getChildTrees(collectionId, depth - 1, userId);
      // tree.spaces = await this.getSpaces(collectionId, userId);
    }

    return tree;
  }

  /**
   * Get breadcrumb path to collection
   */
  async getBreadcrumb(collectionId: string, userId?: string): Promise<BreadcrumbItem[]> {
    logger.debug({ collectionId }, 'Getting collection breadcrumb');

    const collection = await this.getById(collectionId, userId);
    const breadcrumb: BreadcrumbItem[] = [];

    // Build path from root to current collection
    let current: Collection | null = collection;
    while (current) {
      breadcrumb.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
        type: 'collection',
      });

      if (current.parentId) {
        current = await this.findById(current.parentId);
      } else {
        current = null;
      }
    }

    // TODO: Add organization at the start

    return breadcrumb;
  }

  /**
   * Duplicate collection with contents
   */
  async duplicate(
    collectionId: string,
    options: {
      name?: string;
      includeSpaces?: boolean;
      includePages?: boolean;
    },
    userId?: string
  ): Promise<Collection> {
    logger.info({ collectionId, options }, 'Duplicating collection');

    const source = await this.getById(collectionId, userId);
    await this.checkAccess(source, userId, 'read');

    const newCollection: Collection = {
      ...source,
      id: nanoid(),
      name: options.name || `${source.name} (Copy)`,
      slug: await this.generateUniqueSlug(source.organizationId, source.slug),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Duplicate spaces if includeSpaces
    // TODO: Duplicate pages if includePages

    return newCollection;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async findById(_collectionId: string): Promise<Collection | null> {
    // TODO: Query database
    return null;
  }

  private async findBySlugInOrg(
    _organizationId: string,
    _slug: string
  ): Promise<Collection | null> {
    // TODO: Query database
    return null;
  }

  private async checkAccess(
    _collection: Collection,
    _userId: string | undefined,
    _level: 'read' | 'write' | 'admin'
  ): Promise<void> {
    // TODO: Check user has required access level
    // - Check organization membership
    // - Check visibility settings
    // - Check specific permissions
  }

  private async wouldCreateCycle(
    _collectionId: string,
    _newParentId: string
  ): Promise<boolean> {
    // TODO: Check if newParentId is a descendant of collectionId
    return false;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(organizationId: string, baseSlug: string): Promise<string> {
    let slug = `${baseSlug}-copy`;
    let counter = 1;

    while (await this.findBySlugInOrg(organizationId, slug)) {
      slug = `${baseSlug}-copy-${counter}`;
      counter++;
    }

    return slug;
  }
}

// Export singleton instance
export const collectionService = new CollectionService();
