import { Hono } from 'hono';
import { DocumentService } from '../services/document.service';
import { requireAuth } from '../middleware/auth';
import { Env, AuthUser } from '../types';

const documents = new Hono<{
  Bindings: Env;
  Variables: { user?: AuthUser; userId?: string };
}>();

// ============ DOCUMENTS ============

// List documents
documents.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')!
  const service = new DocumentService(c.env.DB);

  const status = c.req.query('status');
  const visibility = c.req.query('visibility');
  const template = c.req.query('template');
  const org_id = c.req.query('org_id');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await service.listDocuments(userId, {
    status,
    visibility,
    template,
    org_id,
    limit,
    offset
  });

  return c.json(result);
});

// Get templates (public endpoint - no auth required)
documents.get('/templates', async (c) => {
  console.log('HIT /templates route');
  const service = new DocumentService(c.env.DB);
  const category = c.req.query('category');

  const templates = await service.getTemplates(category);
  return c.json({ success: true, templates });
});

// Get single template
documents.get('/templates/:slug', async (c) => {
  const service = new DocumentService(c.env.DB);
  const slug = c.req.param('slug');

  const template = await service.getTemplate(slug);
  if (!template) {
    return c.json({ error: 'Template not found' }, 404);
  }

  return c.json({ template });
});

// Create document
documents.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);

  const body = await c.req.json();
  const { title, slug, org_id, template, classification, visibility, description } = body;

  if (!title) {
    return c.json({ error: 'Title is required' }, 400);
  }

  const document = await service.createDocument(userId, {
    title,
    slug,
    org_id,
    template,
    classification,
    visibility,
    description
  });

  return c.json({ document }, 201);
});

// Get document by ID
documents.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const document = await service.getDocument(id, userId);
  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  // Get blocks and notes
  const blocks = await service.getDocumentBlocks(id);
  const notes = await service.getDocumentNotes(id);
  const findings = await service.getDocumentFindings(id);

  return c.json({ document, blocks, notes, findings });
});

// Get document by username/slug
documents.get('/u/:username/:slug', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const username = c.req.param('username');
  const slug = c.req.param('slug');

  const document = await service.getDocumentBySlug(username, slug, userId);
  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const blocks = await service.getDocumentBlocks(document.id);
  const notes = await service.getDocumentNotes(document.id);
  const findings = await service.getDocumentFindings(document.id);

  return c.json({ document, blocks, notes, findings });
});

// Update document
documents.patch('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const body = await c.req.json();

  const document = await service.updateDocument(id, userId, body);
  if (!document) {
    return c.json({ error: 'Document not found or access denied' }, 404);
  }

  return c.json({ document });
});

// Delete document
documents.delete('/:id', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const deleted = await service.deleteDocument(id, userId);
  if (!deleted) {
    return c.json({ error: 'Document not found or access denied' }, 404);
  }

  return c.json({ success: true });
});

// ============ BLOCKS ============

// Get document blocks
documents.get('/:id/blocks', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');
  const layer = c.req.query('layer');

  // Verify access
  const document = await service.getDocument(id, userId);
  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const blocks = await service.getDocumentBlocks(id, layer);
  return c.json({ blocks });
});

// Create block
documents.post('/:id/blocks', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  // Verify access
  const document = await service.getDocument(id, userId);
  if (!document) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const body = await c.req.json();
  const { type, content, parent_id, position, layer } = body;

  if (!type || content === undefined) {
    return c.json({ error: 'Type and content are required' }, 400);
  }

  const block = await service.createBlock(id, userId, {
    type,
    content,
    parent_id,
    position,
    layer
  });

  return c.json({ block }, 201);
});

// Update block
documents.patch('/:id/blocks/:blockId', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const blockId = c.req.param('blockId');

  const body = await c.req.json();

  const block = await service.updateBlock(blockId, userId, body);
  if (!block) {
    return c.json({ error: 'Block not found' }, 404);
  }

  return c.json({ block });
});

// Delete block
documents.delete('/:id/blocks/:blockId', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const blockId = c.req.param('blockId');

  const deleted = await service.deleteBlock(blockId, userId);
  if (!deleted) {
    return c.json({ error: 'Block not found' }, 404);
  }

  return c.json({ success: true });
});

// Reorder blocks
documents.post('/:id/blocks/reorder', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const body = await c.req.json();
  const { block_ids } = body;

  if (!Array.isArray(block_ids)) {
    return c.json({ error: 'block_ids array is required' }, 400);
  }

  await service.reorderBlocks(id, block_ids);
  return c.json({ success: true });
});

// ============ NOTES ============

// Get document notes
documents.get('/:id/notes', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const type = c.req.query('type');
  const resolved = c.req.query('resolved');
  const block_id = c.req.query('block_id');

  const notes = await service.getDocumentNotes(id, {
    type,
    resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    block_id
  });

  return c.json({ notes });
});

// Create note
documents.post('/:id/notes', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const body = await c.req.json();
  const { block_id, type, content, position, priority, assignee_id, due_date } = body;

  if (!type || !content) {
    return c.json({ error: 'Type and content are required' }, 400);
  }

  const note = await service.createNote(id, userId, {
    block_id,
    type,
    content,
    position,
    priority,
    assignee_id,
    due_date
  });

  return c.json({ note }, 201);
});

// Update note
documents.patch('/:id/notes/:noteId', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const noteId = c.req.param('noteId');

  const body = await c.req.json();

  const note = await service.updateNote(noteId, userId, body);
  if (!note) {
    return c.json({ error: 'Note not found' }, 404);
  }

  return c.json({ note });
});

// Delete note
documents.delete('/:id/notes/:noteId', async (c) => {
  const service = new DocumentService(c.env.DB);
  const noteId = c.req.param('noteId');

  const deleted = await service.deleteNote(noteId);
  if (!deleted) {
    return c.json({ error: 'Note not found' }, 404);
  }

  return c.json({ success: true });
});

// ============ VERSIONS ============

// Get document versions
documents.get('/:id/versions', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');
  const type = c.req.query('type');

  const versions = await service.getDocumentVersions(id, type);
  return c.json({ versions });
});

// Create named version
documents.post('/:id/versions', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const body = await c.req.json();
  const { version, name, description } = body;

  const versionObj = await service.createVersion(id, userId, {
    version,
    name,
    description,
    type: 'manual'
  });

  return c.json({ version: versionObj }, 201);
});

// Get specific version
documents.get('/:id/versions/:versionId', async (c) => {
  const service = new DocumentService(c.env.DB);
  const versionId = c.req.param('versionId');

  const version = await service.getVersion(versionId);
  if (!version) {
    return c.json({ error: 'Version not found' }, 404);
  }

  return c.json({ version });
});

// Restore version
documents.post('/:id/versions/:versionId/restore', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const versionId = c.req.param('versionId');

  const document = await service.restoreVersion(versionId, userId);
  if (!document) {
    return c.json({ error: 'Version not found' }, 404);
  }

  return c.json({ document });
});

// Auto-save
documents.post('/:id/autosave', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const version = await service.autoSave(id, userId);
  return c.json({ version });
});

// ============ RESEARCH ============

// Get research items
documents.get('/:id/research', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');
  const status = c.req.query('status');

  const items = await service.getDocumentResearch(id, status);
  return c.json({ items });
});

// Create research item (evidence dump)
documents.post('/:id/research', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const body = await c.req.json();
  const { type, content, file_path, file_name, file_size, file_type, source, captured_at } = body;

  if (!type) {
    return c.json({ error: 'Type is required' }, 400);
  }

  const item = await service.createResearchItem(id, userId, {
    type,
    content,
    file_path,
    file_name,
    file_size,
    file_type,
    source,
    captured_at
  });

  return c.json({ item }, 201);
});

// Update research item
documents.patch('/:id/research/:itemId', async (c) => {
  const service = new DocumentService(c.env.DB);
  const itemId = c.req.param('itemId');

  const body = await c.req.json();

  const item = await service.updateResearchItem(itemId, body);
  if (!item) {
    return c.json({ error: 'Research item not found' }, 404);
  }

  return c.json({ item });
});

// Delete research item
documents.delete('/:id/research/:itemId', async (c) => {
  const service = new DocumentService(c.env.DB);
  const itemId = c.req.param('itemId');

  const deleted = await service.deleteResearchItem(itemId);
  if (!deleted) {
    return c.json({ error: 'Research item not found' }, 404);
  }

  return c.json({ success: true });
});

// ============ FINDINGS ============

// Get document findings
documents.get('/:id/findings', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const findings = await service.getDocumentFindings(id);
  return c.json({ findings });
});

// Create finding
documents.post('/:id/findings', requireAuth, async (c) => {
  const userId = c.get('userId')!;
  const service = new DocumentService(c.env.DB);
  const id = c.req.param('id');

  const body = await c.req.json();
  const { title, severity, component, status, confidence, cve_id, cwe_id } = body;

  if (!title || !severity) {
    return c.json({ error: 'Title and severity are required' }, 400);
  }

  const finding = await service.createFinding(id, userId, {
    title,
    severity,
    component,
    status,
    confidence,
    cve_id,
    cwe_id
  });

  return c.json({ finding }, 201);
});

// Update finding
documents.patch('/:id/findings/:findingId', async (c) => {
  const service = new DocumentService(c.env.DB);
  const findingId = c.req.param('findingId');

  const body = await c.req.json();

  const finding = await service.updateFinding(findingId, body);
  if (!finding) {
    return c.json({ error: 'Finding not found' }, 404);
  }

  return c.json({ finding });
});

export default documents;
