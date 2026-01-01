import { D1Database } from '@cloudflare/workers-types';

export interface Document {
  id: string;
  title: string;
  slug: string;
  owner_id: string;
  org_id?: string;
  template?: string;
  classification: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  visibility: 'private' | 'unlisted' | 'public' | 'password';
  current_version: string;
  current_version_id?: string;
  mode: 'research' | 'draft' | 'review' | 'present' | 'export';
  description?: string;
  cover_image?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  word_count: number;
  block_count: number;
}

export interface Block {
  id: string;
  document_id: string;
  parent_id?: string;
  type: BlockType;
  content: any;
  position: number;
  depth: number;
  collapsed: boolean;
  highlighted: boolean;
  layer: 'visible' | 'notes' | 'research' | 'artifacts';
  created_at: string;
  updated_at: string;
  created_by?: string;
  source?: string;
  verified: boolean;
  hash?: string;
}

export type BlockType = 
  | 'paragraph' | 'heading' | 'finding' | 'evidence' | 'code' | 'table'
  | 'timeline' | 'diagram' | 'image' | 'callout' | 'quote' | 'divider'
  | 'artifact' | 'reference' | 'command' | 'hash' | 'file' | 'list' | 'todo';

export interface Finding {
  id: string;
  document_id: string;
  block_id?: string;
  finding_id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  component?: string;
  status: 'CONFIRMED' | 'SUSPECTED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  discovered_at?: string;
  confirmed_at?: string;
  resolved_at?: string;
  confidence: number;
  priority: number;
  related_findings: string[];
  cve_id?: string;
  cwe_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  document_id: string;
  block_id?: string;
  type: 'note' | 'question' | 'todo' | 'warning' | 'idea';
  content: string;
  position: 'inline' | 'margin' | 'floating';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Version {
  id: string;
  document_id: string;
  version: string;
  name?: string;
  description?: string;
  type: 'auto' | 'manual' | 'published';
  snapshot: any;
  word_count: number;
  block_count: number;
  created_at: string;
  created_by?: string;
}

export interface ResearchItem {
  id: string;
  document_id: string;
  type: 'paste' | 'file' | 'screenshot' | 'url' | 'note' | 'log' | 'command';
  content?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  analysis?: any;
  status: 'pending' | 'processing' | 'analyzed' | 'archived' | 'added';
  added_to_block_id?: string;
  added_to_finding_id?: string;
  source?: string;
  captured_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  icon?: string;
  structure: any;
  default_blocks: any[];
  is_system: boolean;
  is_public: boolean;
  owner_id?: string;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  title: string;
  slug?: string;
  org_id?: string;
  template?: string;
  classification?: string;
  visibility?: 'private' | 'unlisted' | 'public';
  description?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  slug?: string;
  classification?: string;
  status?: 'draft' | 'review' | 'published' | 'archived';
  visibility?: 'private' | 'unlisted' | 'public' | 'password';
  mode?: 'research' | 'draft' | 'review' | 'present' | 'export';
  description?: string;
  cover_image?: string;
  icon?: string;
}

export interface CreateBlockInput {
  type: BlockType;
  content: any;
  parent_id?: string;
  position?: number;
  layer?: 'visible' | 'notes' | 'research' | 'artifacts';
}

export interface UpdateBlockInput {
  content?: any;
  position?: number;
  collapsed?: boolean;
  highlighted?: boolean;
  layer?: 'visible' | 'notes' | 'research' | 'artifacts';
  verified?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function generateId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class DocumentService {
  constructor(private db: D1Database) {}

  // ============ DOCUMENTS ============

  async createDocument(userId: string, input: CreateDocumentInput): Promise<Document> {
    const id = generateId();
    const slug = input.slug || slugify(input.title);
    const now = new Date().toISOString();

    // Check for duplicate slug
    const existing = await this.db.prepare(
      'SELECT id FROM documents WHERE owner_id = ? AND slug = ?'
    ).bind(userId, slug).first();

    const finalSlug = existing ? `${slug}-${id.slice(0, 6)}` : slug;

    // Get template if specified
    let defaultBlocks: any[] = [];
    if (input.template) {
      const template = await this.db.prepare(
        'SELECT default_blocks FROM document_templates WHERE slug = ?'
      ).bind(input.template).first<{ default_blocks: string }>();
      
      if (template?.default_blocks) {
        defaultBlocks = JSON.parse(template.default_blocks);
        // Increment template use count
        await this.db.prepare(
          'UPDATE document_templates SET use_count = use_count + 1 WHERE slug = ?'
        ).bind(input.template).run();
      }
    }

    await this.db.prepare(`
      INSERT INTO documents (id, title, slug, owner_id, org_id, template, classification, visibility, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.title,
      finalSlug,
      userId,
      input.org_id || null,
      input.template || null,
      input.classification || 'internal',
      input.visibility || 'private',
      input.description || null,
      now,
      now
    ).run();

    // Create default blocks from template
    if (defaultBlocks.length > 0) {
      for (let i = 0; i < defaultBlocks.length; i++) {
        const block = defaultBlocks[i];
        await this.createBlock(id, userId, {
          type: block.type,
          content: block.content,
          position: i
        });
      }
    } else {
      // Create a default heading block
      await this.createBlock(id, userId, {
        type: 'heading',
        content: { text: input.title, level: 1 },
        position: 0
      });
    }

    // Create initial auto-save version
    await this.createVersion(id, userId, {
      version: '0.1',
      type: 'auto',
      description: 'Initial creation'
    });

    return this.getDocument(id, userId) as Promise<Document>;
  }

  async getDocument(documentId: string, userId: string): Promise<Document | null> {
    const doc = await this.db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM document_collaborators WHERE document_id = d.id AND user_id = ?) as is_collaborator
      FROM documents d
      WHERE d.id = ? AND (d.owner_id = ? OR d.visibility = 'public' OR 
        EXISTS (SELECT 1 FROM document_collaborators WHERE document_id = d.id AND user_id = ?))
    `).bind(userId, documentId, userId, userId).first<Document & { is_collaborator: number }>();

    return doc || null;
  }

  async getDocumentBySlug(ownerUsername: string, slug: string, userId: string): Promise<Document | null> {
    const doc = await this.db.prepare(`
      SELECT d.* FROM documents d
      JOIN users u ON d.owner_id = u.id
      WHERE u.username = ? AND d.slug = ? AND (d.owner_id = ? OR d.visibility = 'public' OR 
        EXISTS (SELECT 1 FROM document_collaborators WHERE document_id = d.id AND user_id = ?))
    `).bind(ownerUsername, slug, userId, userId).first<Document>();

    return doc || null;
  }

  async listDocuments(userId: string, options: {
    status?: string;
    visibility?: string;
    template?: string;
    org_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ documents: Document[]; total: number }> {
    const { status, visibility, template, org_id, limit = 50, offset = 0 } = options;

    let whereClause = 'WHERE (d.owner_id = ? OR EXISTS (SELECT 1 FROM document_collaborators WHERE document_id = d.id AND user_id = ?))';
    const params: any[] = [userId, userId];

    if (status) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }
    if (visibility) {
      whereClause += ' AND d.visibility = ?';
      params.push(visibility);
    }
    if (template) {
      whereClause += ' AND d.template = ?';
      params.push(template);
    }
    if (org_id) {
      whereClause += ' AND d.org_id = ?';
      params.push(org_id);
    }

    const countResult = await this.db.prepare(
      `SELECT COUNT(*) as count FROM documents d ${whereClause}`
    ).bind(...params).first<{ count: number }>();

    const documents = await this.db.prepare(`
      SELECT d.* FROM documents d
      ${whereClause}
      ORDER BY d.updated_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all<Document>();

    return {
      documents: documents.results || [],
      total: countResult?.count || 0
    };
  }

  async updateDocument(documentId: string, userId: string, input: UpdateDocumentInput): Promise<Document | null> {
    // Check ownership
    const doc = await this.db.prepare(
      'SELECT id FROM documents WHERE id = ? AND owner_id = ?'
    ).bind(documentId, userId).first();

    if (!doc) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }
    if (input.slug !== undefined) {
      updates.push('slug = ?');
      params.push(input.slug);
    }
    if (input.classification !== undefined) {
      updates.push('classification = ?');
      params.push(input.classification);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
      if (input.status === 'published') {
        updates.push('published_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (input.visibility !== undefined) {
      updates.push('visibility = ?');
      params.push(input.visibility);
    }
    if (input.mode !== undefined) {
      updates.push('mode = ?');
      params.push(input.mode);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }
    if (input.cover_image !== undefined) {
      updates.push('cover_image = ?');
      params.push(input.cover_image);
    }
    if (input.icon !== undefined) {
      updates.push('icon = ?');
      params.push(input.icon);
    }

    if (updates.length === 0) return this.getDocument(documentId, userId);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(documentId);

    await this.db.prepare(`
      UPDATE documents SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return this.getDocument(documentId, userId);
  }

  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'DELETE FROM documents WHERE id = ? AND owner_id = ?'
    ).bind(documentId, userId).run();

    return (result.meta?.changes || 0) > 0;
  }

  // ============ BLOCKS ============

  async createBlock(documentId: string, userId: string, input: CreateBlockInput): Promise<Block> {
    const id = generateId();
    const now = new Date().toISOString();

    // Get max position if not specified
    let position = input.position;
    if (position === undefined) {
      const maxPos = await this.db.prepare(
        'SELECT MAX(position) as max_pos FROM document_blocks WHERE document_id = ? AND parent_id IS ?'
      ).bind(documentId, input.parent_id || null).first<{ max_pos: number | null }>();
      position = (maxPos?.max_pos ?? -1) + 1;
    }

    await this.db.prepare(`
      INSERT INTO document_blocks (id, document_id, parent_id, type, content, position, layer, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      documentId,
      input.parent_id || null,
      input.type,
      JSON.stringify(input.content),
      position,
      input.layer || 'visible',
      now,
      now,
      userId
    ).run();

    // Update document block count
    await this.db.prepare(
      'UPDATE documents SET block_count = block_count + 1, updated_at = ? WHERE id = ?'
    ).bind(now, documentId).run();

    return this.getBlock(id) as Promise<Block>;
  }

  async getBlock(blockId: string): Promise<Block | null> {
    const block = await this.db.prepare(
      'SELECT * FROM document_blocks WHERE id = ?'
    ).bind(blockId).first<Block & { content: string }>();

    if (!block) return null;

    return {
      ...block,
      content: JSON.parse(block.content)
    };
  }

  async getDocumentBlocks(documentId: string, layer?: string): Promise<Block[]> {
    let query = 'SELECT * FROM document_blocks WHERE document_id = ?';
    const params: any[] = [documentId];

    if (layer) {
      query += ' AND layer = ?';
      params.push(layer);
    }

    query += ' ORDER BY position ASC';

    const blocks = await this.db.prepare(query).bind(...params).all<Block & { content: string }>();

    return (blocks.results || []).map(block => ({
      ...block,
      content: JSON.parse(block.content)
    }));
  }

  async updateBlock(blockId: string, userId: string, input: UpdateBlockInput): Promise<Block | null> {
    const block = await this.getBlock(blockId);
    if (!block) return null;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.content !== undefined) {
      updates.push('content = ?');
      params.push(JSON.stringify(input.content));
    }
    if (input.position !== undefined) {
      updates.push('position = ?');
      params.push(input.position);
    }
    if (input.collapsed !== undefined) {
      updates.push('collapsed = ?');
      params.push(input.collapsed);
    }
    if (input.highlighted !== undefined) {
      updates.push('highlighted = ?');
      params.push(input.highlighted);
    }
    if (input.layer !== undefined) {
      updates.push('layer = ?');
      params.push(input.layer);
    }
    if (input.verified !== undefined) {
      updates.push('verified = ?');
      params.push(input.verified);
    }

    if (updates.length === 0) return block;

    const now = new Date().toISOString();
    updates.push('updated_at = ?');
    params.push(now);
    params.push(blockId);

    await this.db.prepare(`
      UPDATE document_blocks SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    // Update document timestamp
    await this.db.prepare(
      'UPDATE documents SET updated_at = ? WHERE id = ?'
    ).bind(now, block.document_id).run();

    return this.getBlock(blockId);
  }

  async deleteBlock(blockId: string, userId: string): Promise<boolean> {
    const block = await this.getBlock(blockId);
    if (!block) return false;

    const result = await this.db.prepare(
      'DELETE FROM document_blocks WHERE id = ?'
    ).bind(blockId).run();

    if ((result.meta?.changes || 0) > 0) {
      // Update document block count
      await this.db.prepare(
        'UPDATE documents SET block_count = block_count - 1, updated_at = ? WHERE id = ?'
      ).bind(new Date().toISOString(), block.document_id).run();
      return true;
    }

    return false;
  }

  async reorderBlocks(documentId: string, blockIds: string[]): Promise<boolean> {
    const now = new Date().toISOString();

    for (let i = 0; i < blockIds.length; i++) {
      await this.db.prepare(
        'UPDATE document_blocks SET position = ?, updated_at = ? WHERE id = ? AND document_id = ?'
      ).bind(i, now, blockIds[i], documentId).run();
    }

    await this.db.prepare(
      'UPDATE documents SET updated_at = ? WHERE id = ?'
    ).bind(now, documentId).run();

    return true;
  }

  // ============ NOTES ============

  async createNote(documentId: string, userId: string, input: {
    block_id?: string;
    type: 'note' | 'question' | 'todo' | 'warning' | 'idea';
    content: string;
    position?: 'inline' | 'margin' | 'floating';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string;
    due_date?: string;
  }): Promise<Note> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO document_notes (id, document_id, block_id, type, content, position, priority, assignee_id, due_date, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      documentId,
      input.block_id || null,
      input.type,
      input.content,
      input.position || 'margin',
      input.priority || 'medium',
      input.assignee_id || null,
      input.due_date || null,
      now,
      now,
      userId
    ).run();

    return this.getNote(id) as Promise<Note>;
  }

  async getNote(noteId: string): Promise<Note | null> {
    return this.db.prepare(
      'SELECT * FROM document_notes WHERE id = ?'
    ).bind(noteId).first<Note>();
  }

  async getDocumentNotes(documentId: string, options: {
    type?: string;
    resolved?: boolean;
    block_id?: string;
  } = {}): Promise<Note[]> {
    let query = 'SELECT * FROM document_notes WHERE document_id = ?';
    const params: any[] = [documentId];

    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }
    if (options.resolved !== undefined) {
      query += ' AND resolved = ?';
      params.push(options.resolved);
    }
    if (options.block_id) {
      query += ' AND block_id = ?';
      params.push(options.block_id);
    }

    query += ' ORDER BY created_at DESC';

    const notes = await this.db.prepare(query).bind(...params).all<Note>();
    return notes.results || [];
  }

  async updateNote(noteId: string, userId: string, input: {
    content?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    resolved?: boolean;
    assignee_id?: string;
    due_date?: string;
  }): Promise<Note | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.content !== undefined) {
      updates.push('content = ?');
      params.push(input.content);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }
    if (input.resolved !== undefined) {
      updates.push('resolved = ?');
      params.push(input.resolved);
      if (input.resolved) {
        updates.push('resolved_at = ?');
        params.push(new Date().toISOString());
        updates.push('resolved_by = ?');
        params.push(userId);
      }
    }
    if (input.assignee_id !== undefined) {
      updates.push('assignee_id = ?');
      params.push(input.assignee_id);
    }
    if (input.due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(input.due_date);
    }

    if (updates.length === 0) return this.getNote(noteId);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(noteId);

    await this.db.prepare(`
      UPDATE document_notes SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return this.getNote(noteId);
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'DELETE FROM document_notes WHERE id = ?'
    ).bind(noteId).run();

    return (result.meta?.changes || 0) > 0;
  }

  // ============ VERSIONS ============

  async createVersion(documentId: string, userId: string, input: {
    version?: string;
    name?: string;
    description?: string;
    type?: 'auto' | 'manual' | 'published';
  }): Promise<Version> {
    const id = generateId();
    const now = new Date().toISOString();

    // Get current document state
    const doc = await this.db.prepare(
      'SELECT * FROM documents WHERE id = ?'
    ).bind(documentId).first<Document>();

    const blocks = await this.getDocumentBlocks(documentId);
    const notes = await this.getDocumentNotes(documentId);

    // Calculate word count
    let wordCount = 0;
    for (const block of blocks) {
      if (block.content?.text) {
        wordCount += block.content.text.split(/\s+/).filter(Boolean).length;
      }
    }

    // Determine version number
    let version = input.version;
    if (!version) {
      const lastVersion = await this.db.prepare(
        'SELECT version FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(documentId).first<{ version: string }>();

      if (lastVersion) {
        const parts = lastVersion.version.split('.');
        const minor = parseInt(parts[1] || '0') + 1;
        version = `${parts[0]}.${minor}`;
      } else {
        version = '0.1';
      }
    }

    const snapshot = {
      document: doc,
      blocks,
      notes
    };

    await this.db.prepare(`
      INSERT INTO document_versions (id, document_id, version, name, description, type, snapshot, word_count, block_count, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      documentId,
      version,
      input.name || null,
      input.description || null,
      input.type || 'auto',
      JSON.stringify(snapshot),
      wordCount,
      blocks.length,
      now,
      userId
    ).run();

    // Update document version
    await this.db.prepare(
      'UPDATE documents SET current_version = ?, current_version_id = ?, word_count = ?, updated_at = ? WHERE id = ?'
    ).bind(version, id, wordCount, now, documentId).run();

    return this.getVersion(id) as Promise<Version>;
  }

  async getVersion(versionId: string): Promise<Version | null> {
    const version = await this.db.prepare(
      'SELECT * FROM document_versions WHERE id = ?'
    ).bind(versionId).first<Version & { snapshot: string }>();

    if (!version) return null;

    return {
      ...version,
      snapshot: JSON.parse(version.snapshot)
    };
  }

  async getDocumentVersions(documentId: string, type?: string): Promise<Version[]> {
    let query = 'SELECT id, document_id, version, name, description, type, word_count, block_count, created_at, created_by FROM document_versions WHERE document_id = ?';
    const params: any[] = [documentId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const versions = await this.db.prepare(query).bind(...params).all<Omit<Version, 'snapshot'>>();
    return (versions.results || []).map(v => ({ ...v, snapshot: null })) as Version[];
  }

  async restoreVersion(versionId: string, userId: string): Promise<Document | null> {
    const version = await this.getVersion(versionId);
    if (!version) return null;

    const snapshot = version.snapshot as any;
    const documentId = version.document_id;

    // Delete current blocks
    await this.db.prepare(
      'DELETE FROM document_blocks WHERE document_id = ?'
    ).bind(documentId).run();

    // Restore blocks from snapshot
    for (const block of snapshot.blocks || []) {
      await this.db.prepare(`
        INSERT INTO document_blocks (id, document_id, parent_id, type, content, position, depth, collapsed, highlighted, layer, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId(),
        documentId,
        block.parent_id || null,
        block.type,
        JSON.stringify(block.content),
        block.position,
        block.depth || 0,
        block.collapsed || false,
        block.highlighted || false,
        block.layer || 'visible',
        block.created_at,
        new Date().toISOString(),
        block.created_by || userId
      ).run();
    }

    // Create a new version marking the restore
    await this.createVersion(documentId, userId, {
      type: 'manual',
      name: `Restored from ${version.version}`,
      description: `Restored from version ${version.version}${version.name ? ` (${version.name})` : ''}`
    });

    return this.getDocument(documentId, userId);
  }

  // ============ TEMPLATES ============

  async getTemplates(category?: string): Promise<Template[]> {
    let query = 'SELECT * FROM document_templates WHERE is_public = TRUE';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY use_count DESC, name ASC';

    const templates = await this.db.prepare(query).bind(...params).all<Template & { structure: string; default_blocks: string }>();

    return (templates.results || []).map(t => ({
      ...t,
      structure: JSON.parse(t.structure),
      default_blocks: JSON.parse(t.default_blocks)
    }));
  }

  async getTemplate(slugOrId: string): Promise<Template | null> {
    const template = await this.db.prepare(
      'SELECT * FROM document_templates WHERE slug = ? OR id = ?'
    ).bind(slugOrId, slugOrId).first<Template & { structure: string; default_blocks: string }>();

    if (!template) return null;

    return {
      ...template,
      structure: JSON.parse(template.structure),
      default_blocks: JSON.parse(template.default_blocks)
    };
  }

  // ============ AUTO-SAVE ============

  async autoSave(documentId: string, userId: string): Promise<Version> {
    // Check if we should create a new auto-save (throttle to every 30 seconds)
    const lastAutoSave = await this.db.prepare(`
      SELECT created_at FROM document_versions 
      WHERE document_id = ? AND type = 'auto' 
      ORDER BY created_at DESC LIMIT 1
    `).bind(documentId).first<{ created_at: string }>();

    if (lastAutoSave) {
      const lastTime = new Date(lastAutoSave.created_at).getTime();
      const now = Date.now();
      if (now - lastTime < 30000) {
        // Less than 30 seconds, skip
        return this.getVersion(
          (await this.db.prepare(
            'SELECT id FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT 1'
          ).bind(documentId).first<{ id: string }>())!.id
        ) as Promise<Version>;
      }
    }

    // Clean up old auto-saves (keep last 50)
    await this.db.prepare(`
      DELETE FROM document_versions 
      WHERE document_id = ? AND type = 'auto' AND id NOT IN (
        SELECT id FROM document_versions 
        WHERE document_id = ? AND type = 'auto' 
        ORDER BY created_at DESC LIMIT 50
      )
    `).bind(documentId, documentId).run();

    return this.createVersion(documentId, userId, { type: 'auto' });
  }

  // ============ RESEARCH ITEMS ============

  async createResearchItem(documentId: string, userId: string, input: {
    type: 'paste' | 'file' | 'screenshot' | 'url' | 'note' | 'log' | 'command';
    content?: string;
    file_path?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    source?: string;
    captured_at?: string;
  }): Promise<ResearchItem> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO document_research (id, document_id, type, content, file_path, file_name, file_size, file_type, source, captured_at, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      documentId,
      input.type,
      input.content || null,
      input.file_path || null,
      input.file_name || null,
      input.file_size || null,
      input.file_type || null,
      input.source || null,
      input.captured_at || now,
      now,
      now,
      userId
    ).run();

    return this.getResearchItem(id) as Promise<ResearchItem>;
  }

  async getResearchItem(itemId: string): Promise<ResearchItem | null> {
    const item = await this.db.prepare(
      'SELECT * FROM document_research WHERE id = ?'
    ).bind(itemId).first<ResearchItem & { analysis: string }>();

    if (!item) return null;

    return {
      ...item,
      analysis: item.analysis ? JSON.parse(item.analysis) : null
    };
  }

  async getDocumentResearch(documentId: string, status?: string): Promise<ResearchItem[]> {
    let query = 'SELECT * FROM document_research WHERE document_id = ?';
    const params: any[] = [documentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const items = await this.db.prepare(query).bind(...params).all<ResearchItem & { analysis: string }>();

    return (items.results || []).map(item => ({
      ...item,
      analysis: item.analysis ? JSON.parse(item.analysis) : null
    }));
  }

  async updateResearchItem(itemId: string, input: {
    status?: 'pending' | 'processing' | 'analyzed' | 'archived' | 'added';
    analysis?: any;
    added_to_block_id?: string;
    added_to_finding_id?: string;
  }): Promise<ResearchItem | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }
    if (input.analysis !== undefined) {
      updates.push('analysis = ?');
      params.push(JSON.stringify(input.analysis));
    }
    if (input.added_to_block_id !== undefined) {
      updates.push('added_to_block_id = ?');
      params.push(input.added_to_block_id);
    }
    if (input.added_to_finding_id !== undefined) {
      updates.push('added_to_finding_id = ?');
      params.push(input.added_to_finding_id);
    }

    if (updates.length === 0) return this.getResearchItem(itemId);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(itemId);

    await this.db.prepare(`
      UPDATE document_research SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();

    return this.getResearchItem(itemId);
  }

  async deleteResearchItem(itemId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'DELETE FROM document_research WHERE id = ?'
    ).bind(itemId).run();

    return (result.meta?.changes || 0) > 0;
  }

  // ============ FINDINGS ============

  async createFinding(documentId: string, userId: string, input: {
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    component?: string;
    status?: 'CONFIRMED' | 'SUSPECTED' | 'INVESTIGATING';
    confidence?: number;
    cve_id?: string;
    cwe_id?: string;
  }): Promise<Finding> {
    const id = generateId();
    const now = new Date().toISOString();

    // Get next finding ID
    const lastFinding = await this.db.prepare(
      'SELECT finding_id FROM document_findings WHERE document_id = ? ORDER BY finding_id DESC LIMIT 1'
    ).bind(documentId).first<{ finding_id: string }>();

    let findingNum = 1;
    if (lastFinding) {
      const match = lastFinding.finding_id.match(/F(\d+)/);
      if (match) findingNum = parseInt(match[1]) + 1;
    }
    const findingId = `F${findingNum}`;

    // Create a finding block
    const block = await this.createBlock(documentId, userId, {
      type: 'finding',
      content: {
        finding_id: findingId,
        title: input.title,
        severity: input.severity,
        component: input.component,
        description: '',
        evidence: [],
        impact: ''
      }
    });

    await this.db.prepare(`
      INSERT INTO document_findings (id, document_id, block_id, finding_id, title, severity, component, status, confidence, cve_id, cwe_id, discovered_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      documentId,
      block.id,
      findingId,
      input.title,
      input.severity,
      input.component || null,
      input.status || 'INVESTIGATING',
      input.confidence || 50,
      input.cve_id || null,
      input.cwe_id || null,
      now,
      now,
      now
    ).run();

    return this.getFinding(id) as Promise<Finding>;
  }

  async getFinding(findingId: string): Promise<Finding | null> {
    const finding = await this.db.prepare(
      'SELECT * FROM document_findings WHERE id = ? OR finding_id = ?'
    ).bind(findingId, findingId).first<Finding & { related_findings: string }>();

    if (!finding) return null;

    return {
      ...finding,
      related_findings: JSON.parse(finding.related_findings || '[]')
    };
  }

  async getDocumentFindings(documentId: string): Promise<Finding[]> {
    const findings = await this.db.prepare(
      'SELECT * FROM document_findings WHERE document_id = ? ORDER BY finding_id ASC'
    ).bind(documentId).all<Finding & { related_findings: string }>();

    return (findings.results || []).map(f => ({
      ...f,
      related_findings: JSON.parse(f.related_findings || '[]')
    }));
  }

  async updateFinding(findingId: string, input: {
    title?: string;
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    component?: string;
    status?: 'CONFIRMED' | 'SUSPECTED' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
    confidence?: number;
    related_findings?: string[];
    cve_id?: string;
    cwe_id?: string;
  }): Promise<Finding | null> {
    const updates: string[] = [];
    const params: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }
    if (input.severity !== undefined) {
      updates.push('severity = ?');
      params.push(input.severity);
    }
    if (input.component !== undefined) {
      updates.push('component = ?');
      params.push(input.component);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
      if (input.status === 'CONFIRMED') {
        updates.push('confirmed_at = ?');
        params.push(new Date().toISOString());
      } else if (input.status === 'RESOLVED' || input.status === 'FALSE_POSITIVE') {
        updates.push('resolved_at = ?');
        params.push(new Date().toISOString());
      }
    }
    if (input.confidence !== undefined) {
      updates.push('confidence = ?');
      params.push(input.confidence);
    }
    if (input.related_findings !== undefined) {
      updates.push('related_findings = ?');
      params.push(JSON.stringify(input.related_findings));
    }
    if (input.cve_id !== undefined) {
      updates.push('cve_id = ?');
      params.push(input.cve_id);
    }
    if (input.cwe_id !== undefined) {
      updates.push('cwe_id = ?');
      params.push(input.cwe_id);
    }

    if (updates.length === 0) return this.getFinding(findingId);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(findingId);

    await this.db.prepare(`
      UPDATE document_findings SET ${updates.join(', ')} WHERE id = ? OR finding_id = ?
    `).bind(...params, findingId).run();

    return this.getFinding(findingId);
  }
}
