/**
 * Space service for foohut.com backend API
 */

import { nanoid } from 'nanoid';
import type { Space, Page, UpdateSpaceInput, CreatePageInput } from '../types/index.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { logger } from '../index.js';

// ============================================================================
// Types
// ============================================================================

interface PaginationOptions {
  limit: number;
  offset: number;
  parentId?: string;
  status?: 'draft' | 'published' | 'archived';
  flat?: boolean;
}

interface PageTreeNode {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
  status: string;
  children: PageTreeNode[];
}

// ============================================================================
// Service Implementation
// ============================================================================

class SpaceService {
  /**
   * Get space by ID with access check
   */
  async getById(spaceId: string, userId?: string): Promise<Space> {
    logger.debug({ spaceId, userId }, 'Getting space by ID');

    const space = await this.findById(spaceId);
    if (!space) {
      throw new NotFoundError('Space');
    }

    await this.checkAccess(space, userId, 'read');

    return space;
  }

  /**
   * Update space
   */
  async update(
    spaceId: string,
    input: UpdateSpaceInput,
    userId?: string
  ): Promise<Space> {
    logger.info({ spaceId }, 'Updating space');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'write');

    // Check slug uniqueness if changing
    if (input.slug && input.slug !== space.slug) {
      const existing = await this.findBySlugInCollection(space.collectionId, input.slug);
      if (existing) {
        throw new ConflictError('Space slug already exists in collection');
      }
    }

    const updated: Space = {
      ...space,
      ...input,
      settings: input.settings
        ? { ...space.settings, ...input.settings }
        : space.settings,
      updatedAt: new Date(),
    };

    // TODO: Update in database

    return updated;
  }

  /**
   * Delete space
   */
  async delete(spaceId: string, userId?: string): Promise<void> {
    logger.info({ spaceId }, 'Deleting space');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'admin');

    // TODO: Delete space and cascade to pages

    logger.info({ spaceId }, 'Space deleted');
  }

  /**
   * Move space to different collection
   */
  async move(
    spaceId: string,
    collectionId: string,
    position?: number,
    userId?: string
  ): Promise<Space> {
    logger.info({ spaceId, collectionId, position }, 'Moving space');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'write');

    // TODO: Verify collection exists and user has access
    // TODO: Verify same organization

    const updated: Space = {
      ...space,
      collectionId,
      position: position ?? space.position,
      updatedAt: new Date(),
    };

    // TODO: Update in database
    // TODO: Reorder siblings

    return updated;
  }

  /**
   * List pages in space
   */
  async listPages(
    spaceId: string,
    options: PaginationOptions,
    userId?: string
  ): Promise<{ pages: Page[]; total: number }> {
    logger.debug({ spaceId, ...options }, 'Listing pages in space');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'read');

    // TODO: Query pages for space with filters

    return { pages: [], total: 0 };
  }

  /**
   * Create page in space
   */
  async createPage(
    spaceId: string,
    input: CreatePageInput,
    userId: string
  ): Promise<Page> {
    logger.info({ spaceId, title: input.title }, 'Creating page');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'write');

    // Validate parent if provided
    if (input.parentId) {
      const parent = await this.findPageById(input.parentId);
      if (!parent || parent.spaceId !== spaceId) {
        throw new NotFoundError('Parent page');
      }
    }

    const page: Page = {
      id: nanoid(),
      spaceId,
      parentId: input.parentId || null,
      title: input.title,
      slug: input.slug || this.generateSlug(input.title),
      content: input.content || { type: 'doc', content: [] },
      contentText: this.extractText(input.content),
      icon: input.icon || null,
      coverImage: input.coverImage || null,
      position: 0,
      visibility: input.visibility || space.visibility,
      status: input.status || 'draft',
      createdById: userId,
      lastEditedById: userId,
      publishedAt: input.status === 'published' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Calculate position
    // TODO: Generate embeddings for search

    return page;
  }

  /**
   * Get page tree for space
   */
  async getPageTree(
    spaceId: string,
    depth: number = 10,
    userId?: string
  ): Promise<PageTreeNode[]> {
    logger.debug({ spaceId, depth }, 'Getting page tree');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'read');

    // TODO: Build hierarchical tree of pages

    return [];
  }

  /**
   * Get recently modified pages
   */
  async getRecentPages(
    spaceId: string,
    limit: number = 10,
    userId?: string
  ): Promise<Page[]> {
    logger.debug({ spaceId, limit }, 'Getting recent pages');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'read');

    // TODO: Query pages ordered by updatedAt desc

    return [];
  }

  /**
   * Duplicate space with pages
   */
  async duplicate(
    spaceId: string,
    options: {
      name?: string;
      collectionId?: string;
      includePages?: boolean;
    },
    userId: string
  ): Promise<Space> {
    logger.info({ spaceId, options }, 'Duplicating space');

    const source = await this.getById(spaceId, userId);
    await this.checkAccess(source, userId, 'read');

    const newSpace: Space = {
      ...source,
      id: nanoid(),
      collectionId: options.collectionId || source.collectionId,
      name: options.name || `${source.name} (Copy)`,
      slug: await this.generateUniqueSlug(source.collectionId, source.slug),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Duplicate pages if includePages

    return newSpace;
  }

  /**
   * Import pages from external source
   */
  async importPages(
    spaceId: string,
    source: 'markdown' | 'notion' | 'confluence' | 'github',
    data: unknown,
    options: {
      preserveStructure?: boolean;
      createSubspace?: boolean;
    } | undefined,
    userId: string
  ): Promise<{ imported: number; errors: string[] }> {
    logger.info({ spaceId, source }, 'Importing pages');

    const space = await this.getById(spaceId, userId);
    await this.checkAccess(space, userId, 'write');

    // TODO: Parse import data based on source
    // TODO: Create pages
    // TODO: Handle errors

    return { imported: 0, errors: [] };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async findById(_spaceId: string): Promise<Space | null> {
    // TODO: Query database
    return null;
  }

  private async findBySlugInCollection(
    _collectionId: string,
    _slug: string
  ): Promise<Space | null> {
    // TODO: Query database
    return null;
  }

  private async findPageById(_pageId: string): Promise<Page | null> {
    // TODO: Query database
    return null;
  }

  private async checkAccess(
    _space: Space,
    _userId: string | undefined,
    _level: 'read' | 'write' | 'admin'
  ): Promise<void> {
    // TODO: Check user has required access level
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniqueSlug(collectionId: string, baseSlug: string): Promise<string> {
    let slug = `${baseSlug}-copy`;
    let counter = 1;

    while (await this.findBySlugInCollection(collectionId, slug)) {
      slug = `${baseSlug}-copy-${counter}`;
      counter++;
    }

    return slug;
  }

  private extractText(content: unknown): string {
    // TODO: Extract plain text from page content for search
    return '';
  }
}

// Export singleton instance
export const spaceService = new SpaceService();
