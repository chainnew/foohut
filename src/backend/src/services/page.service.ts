/**
 * Page service for foohut.com backend API
 */

import { nanoid } from 'nanoid';
import type { Page, PageVersion, PageContent, UpdatePageInput } from '../types/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { logger } from '../index.js';

// ============================================================================
// Types
// ============================================================================

interface PaginationOptions {
  limit: number;
  offset: number;
}

interface MoveOptions {
  parentId: string | null;
  spaceId?: string;
  position?: number;
}

interface DuplicateOptions {
  title?: string;
  includeChildren?: boolean;
  targetSpaceId?: string;
}

interface BreadcrumbItem {
  id: string;
  title: string;
  slug: string;
  type: 'organization' | 'collection' | 'space' | 'page';
}

// ============================================================================
// Service Implementation
// ============================================================================

class PageService {
  /**
   * Get page by ID with access check
   */
  async getById(pageId: string, userId?: string): Promise<Page> {
    logger.debug({ pageId, userId }, 'Getting page by ID');

    const page = await this.findById(pageId);
    if (!page) {
      throw new NotFoundError('Page');
    }

    await this.checkAccess(page, userId, 'read');

    return page;
  }

  /**
   * Update page
   */
  async update(
    pageId: string,
    input: UpdatePageInput,
    userId: string
  ): Promise<Page> {
    logger.info({ pageId }, 'Updating page');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'write');

    // Create version before updating if content changed
    if (input.content && JSON.stringify(input.content) !== JSON.stringify(page.content)) {
      await this.createVersion(page, userId);
    }

    const updated: Page = {
      ...page,
      ...input,
      contentText: input.content ? this.extractText(input.content) : page.contentText,
      lastEditedById: userId,
      updatedAt: new Date(),
    };

    // TODO: Update in database
    // TODO: Update embeddings if content changed

    return updated;
  }

  /**
   * Delete page (soft or hard delete)
   */
  async delete(pageId: string, permanent: boolean, userId?: string): Promise<void> {
    logger.info({ pageId, permanent }, 'Deleting page');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'write');

    if (permanent) {
      // Hard delete
      // TODO: Delete page, children, and versions from database
    } else {
      // Soft delete (archive)
      // TODO: Update status to 'archived'
    }

    logger.info({ pageId }, 'Page deleted');
  }

  /**
   * Publish a draft page
   */
  async publish(pageId: string, userId: string): Promise<Page> {
    logger.info({ pageId }, 'Publishing page');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'write');

    if (page.status === 'published') {
      throw new BadRequestError('Page is already published');
    }

    const updated: Page = {
      ...page,
      status: 'published',
      publishedAt: new Date(),
      lastEditedById: userId,
      updatedAt: new Date(),
    };

    // TODO: Update in database

    return updated;
  }

  /**
   * Unpublish a page (convert to draft)
   */
  async unpublish(pageId: string, userId: string): Promise<Page> {
    logger.info({ pageId }, 'Unpublishing page');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'write');

    if (page.status !== 'published') {
      throw new BadRequestError('Page is not published');
    }

    const updated: Page = {
      ...page,
      status: 'draft',
      lastEditedById: userId,
      updatedAt: new Date(),
    };

    // TODO: Update in database

    return updated;
  }

  /**
   * Move page to different parent or space
   */
  async move(pageId: string, options: MoveOptions, userId?: string): Promise<Page> {
    logger.info({ pageId, ...options }, 'Moving page');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'write');

    // Validate parent if provided
    if (options.parentId) {
      const parent = await this.findById(options.parentId);
      if (!parent) {
        throw new NotFoundError('Parent page');
      }

      // Check for circular reference
      if (await this.wouldCreateCycle(pageId, options.parentId)) {
        throw new ForbiddenError('Cannot move page to its descendant');
      }
    }

    // Validate space if provided
    if (options.spaceId && options.spaceId !== page.spaceId) {
      // TODO: Verify space exists and user has access
    }

    const updated: Page = {
      ...page,
      parentId: options.parentId,
      spaceId: options.spaceId || page.spaceId,
      position: options.position ?? page.position,
      updatedAt: new Date(),
    };

    // TODO: Update in database
    // TODO: Move children if spaceId changed
    // TODO: Reorder siblings

    return updated;
  }

  /**
   * Duplicate page
   */
  async duplicate(
    pageId: string,
    options: DuplicateOptions,
    userId: string
  ): Promise<Page> {
    logger.info({ pageId, options }, 'Duplicating page');

    const source = await this.getById(pageId, userId);
    await this.checkAccess(source, userId, 'read');

    const newPage: Page = {
      ...source,
      id: nanoid(),
      spaceId: options.targetSpaceId || source.spaceId,
      title: options.title || `${source.title} (Copy)`,
      slug: await this.generateUniqueSlug(source.spaceId, source.slug),
      status: 'draft',
      createdById: userId,
      lastEditedById: userId,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Insert into database
    // TODO: Duplicate children if includeChildren
    // TODO: Generate embeddings

    return newPage;
  }

  /**
   * List page versions
   */
  async listVersions(
    pageId: string,
    options: PaginationOptions,
    userId?: string
  ): Promise<{ versions: PageVersion[]; total: number }> {
    logger.debug({ pageId, ...options }, 'Listing page versions');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'read');

    // TODO: Query versions for page

    return { versions: [], total: 0 };
  }

  /**
   * Get specific page version
   */
  async getVersion(
    pageId: string,
    versionId: string,
    userId?: string
  ): Promise<PageVersion> {
    logger.debug({ pageId, versionId }, 'Getting page version');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'read');

    const version = await this.findVersionById(versionId);
    if (!version || version.pageId !== pageId) {
      throw new NotFoundError('Page version');
    }

    return version;
  }

  /**
   * Restore page to specific version
   */
  async restoreVersion(
    pageId: string,
    versionId: string,
    userId: string
  ): Promise<Page> {
    logger.info({ pageId, versionId }, 'Restoring page version');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'write');

    const version = await this.getVersion(pageId, versionId, userId);

    // Create version of current state before restoring
    await this.createVersion(page, userId, 'Before restore');

    const restored: Page = {
      ...page,
      content: version.content,
      contentText: version.contentText,
      lastEditedById: userId,
      updatedAt: new Date(),
    };

    // TODO: Update in database
    // TODO: Update embeddings

    return restored;
  }

  /**
   * Get breadcrumb path to page
   */
  async getBreadcrumb(pageId: string, userId?: string): Promise<BreadcrumbItem[]> {
    logger.debug({ pageId }, 'Getting page breadcrumb');

    const page = await this.getById(pageId, userId);
    const breadcrumb: BreadcrumbItem[] = [];

    // Build path from current page up to root
    let current: Page | null = page;
    while (current) {
      breadcrumb.unshift({
        id: current.id,
        title: current.title,
        slug: current.slug,
        type: 'page',
      });

      if (current.parentId) {
        current = await this.findById(current.parentId);
      } else {
        current = null;
      }
    }

    // TODO: Add space, collection, and organization to breadcrumb

    return breadcrumb;
  }

  /**
   * Get child pages
   */
  async getChildren(pageId: string, userId?: string): Promise<Page[]> {
    logger.debug({ pageId }, 'Getting child pages');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'read');

    // TODO: Query child pages

    return [];
  }

  /**
   * Get sibling pages
   */
  async getSiblings(pageId: string, userId?: string): Promise<Page[]> {
    logger.debug({ pageId }, 'Getting sibling pages');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'read');

    // TODO: Query sibling pages (same parent)

    return [];
  }

  /**
   * Export page in various formats
   */
  async export(
    pageId: string,
    format: 'markdown' | 'html' | 'pdf' | 'json',
    includeChildren: boolean,
    userId?: string
  ): Promise<{ content: string | Buffer; filename: string }> {
    logger.info({ pageId, format, includeChildren }, 'Exporting page');

    const page = await this.getById(pageId, userId);
    await this.checkAccess(page, userId, 'read');

    let content: string | Buffer;
    let extension: string;

    switch (format) {
      case 'markdown':
        content = await this.toMarkdown(page, includeChildren);
        extension = 'md';
        break;
      case 'html':
        content = await this.toHtml(page, includeChildren);
        extension = 'html';
        break;
      case 'pdf':
        content = await this.toPdf(page, includeChildren);
        extension = 'pdf';
        break;
      case 'json':
        content = JSON.stringify(page, null, 2);
        extension = 'json';
        break;
      default:
        throw new BadRequestError('Unsupported export format');
    }

    const filename = `${page.slug}.${extension}`;

    return { content, filename };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async findById(_pageId: string): Promise<Page | null> {
    // TODO: Query database
    return null;
  }

  private async findVersionById(_versionId: string): Promise<PageVersion | null> {
    // TODO: Query database
    return null;
  }

  private async checkAccess(
    _page: Page,
    _userId: string | undefined,
    _level: 'read' | 'write'
  ): Promise<void> {
    // TODO: Check user has required access level
  }

  private async wouldCreateCycle(
    _pageId: string,
    _newParentId: string
  ): Promise<boolean> {
    // TODO: Check if newParentId is a descendant of pageId
    return false;
  }

  private async createVersion(
    page: Page,
    userId: string,
    description?: string
  ): Promise<PageVersion> {
    const version: PageVersion = {
      id: nanoid(),
      pageId: page.id,
      version: await this.getNextVersionNumber(page.id),
      content: page.content,
      contentText: page.contentText,
      createdById: userId,
      createdAt: new Date(),
      changeDescription: description || null,
    };

    // TODO: Insert into database

    return version;
  }

  private async getNextVersionNumber(_pageId: string): Promise<number> {
    // TODO: Get max version number and increment
    return 1;
  }

  private async generateUniqueSlug(spaceId: string, baseSlug: string): Promise<string> {
    let slug = `${baseSlug}-copy`;
    let counter = 1;

    // TODO: Query for existing slugs
    while (false) {
      slug = `${baseSlug}-copy-${counter}`;
      counter++;
    }

    return slug;
  }

  private extractText(content: PageContent): string {
    // TODO: Extract plain text from page content
    return '';
  }

  private async toMarkdown(_page: Page, _includeChildren: boolean): Promise<string> {
    // TODO: Convert page content to Markdown
    return '';
  }

  private async toHtml(_page: Page, _includeChildren: boolean): Promise<string> {
    // TODO: Convert page content to HTML
    return '';
  }

  private async toPdf(_page: Page, _includeChildren: boolean): Promise<Buffer> {
    // TODO: Convert page content to PDF
    return Buffer.from('');
  }
}

// Export singleton instance
export const pageService = new PageService();
