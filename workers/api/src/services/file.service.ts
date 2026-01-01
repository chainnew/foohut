/**
 * File Service
 * Handles project file operations for the Developer Portal
 */

import { Env } from '../types';

/**
 * File record from database
 */
export interface FileRecord {
  id: string;
  project_id: string;
  path: string;
  content_hash: string | null;
  content: string | null;
  is_directory: number;
  size: number;
  language: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * File tree node
 */
export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  language: string | null;
  children?: FileTreeNode[];
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp
 */
function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Normalize file path (remove leading/trailing slashes, handle dots)
 */
function normalizePath(path: string): string {
  return path
    .split('/')
    .filter((segment) => segment && segment !== '.')
    .join('/');
}

/**
 * Get parent path
 */
function getParentPath(path: string): string | null {
  const parts = path.split('/');
  if (parts.length <= 1) {
    return null;
  }
  return parts.slice(0, -1).join('/');
}

/**
 * Get file name from path
 */
function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Detect language from file extension
 */
function detectLanguage(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    go: 'go',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    markdown: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    env: 'shell',
    vue: 'vue',
    svelte: 'svelte',
    astro: 'astro',
  };

  return languageMap[ext] || null;
}

/**
 * Compute SHA-256 hash of content
 */
async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * List files in a project directory
 */
export async function listFiles(
  db: D1Database,
  projectId: string,
  path?: string
): Promise<FileRecord[]> {
  let query: string;
  let values: (string | number)[];

  if (path) {
    // List files in specific directory
    const normalizedPath = normalizePath(path);
    const pathPrefix = normalizedPath ? `${normalizedPath}/` : '';

    // Get direct children (files and directories at this level)
    query = `
      SELECT * FROM project_files
      WHERE project_id = ?
        AND path LIKE ?
        AND path NOT LIKE ?
      ORDER BY is_directory DESC, path ASC
    `;
    values = [projectId, `${pathPrefix}%`, `${pathPrefix}%/%`];
  } else {
    // List root level files
    query = `
      SELECT * FROM project_files
      WHERE project_id = ?
        AND path NOT LIKE '%/%'
      ORDER BY is_directory DESC, path ASC
    `;
    values = [projectId];
  }

  const result = await db.prepare(query).bind(...values).all<FileRecord>();

  return result.results || [];
}

/**
 * Get all files in a project (flat list)
 */
export async function getAllFiles(db: D1Database, projectId: string): Promise<FileRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM project_files
       WHERE project_id = ?
       ORDER BY is_directory DESC, path ASC`
    )
    .bind(projectId)
    .all<FileRecord>();

  return result.results || [];
}

/**
 * Get file tree for a project
 */
export async function getFileTree(db: D1Database, projectId: string): Promise<FileTreeNode[]> {
  const files = await getAllFiles(db, projectId);

  // Build tree structure
  const root: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();

  // Sort files by path length to ensure parents are processed first
  files.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  for (const file of files) {
    const node: FileTreeNode = {
      id: file.id,
      name: getFileName(file.path),
      path: file.path,
      isDirectory: file.is_directory === 1,
      size: file.size,
      language: file.language,
      children: file.is_directory === 1 ? [] : undefined,
    };

    nodeMap.set(file.path, node);

    const parentPath = getParentPath(file.path);
    if (parentPath) {
      const parent = nodeMap.get(parentPath);
      if (parent?.children) {
        parent.children.push(node);
      }
    } else {
      root.push(node);
    }
  }

  return root;
}

/**
 * Get a single file by path
 */
export async function getFile(
  db: D1Database,
  projectId: string,
  path: string
): Promise<FileRecord | null> {
  const normalizedPath = normalizePath(path);

  const result = await db
    .prepare('SELECT * FROM project_files WHERE project_id = ? AND path = ?')
    .bind(projectId, normalizedPath)
    .first<FileRecord>();

  return result || null;
}

/**
 * Create a file or directory
 */
export async function createFile(
  db: D1Database,
  projectId: string,
  path: string,
  content: string | null,
  isDirectory: boolean
): Promise<FileRecord> {
  const normalizedPath = normalizePath(path);
  const id = generateId();
  const timestamp = now();

  // Check if file already exists
  const existing = await getFile(db, projectId, normalizedPath);
  if (existing) {
    throw new Error('File already exists at this path');
  }

  // Ensure parent directory exists
  const parentPath = getParentPath(normalizedPath);
  if (parentPath) {
    const parent = await getFile(db, projectId, parentPath);
    if (!parent) {
      // Create parent directory recursively
      await createFile(db, projectId, parentPath, null, true);
    } else if (parent.is_directory !== 1) {
      throw new Error('Parent path is not a directory');
    }
  }

  const size = content ? new TextEncoder().encode(content).length : 0;
  const contentHash = content ? await computeHash(content) : null;
  const language = isDirectory ? null : detectLanguage(normalizedPath);

  await db
    .prepare(
      `INSERT INTO project_files (id, project_id, path, content_hash, content, is_directory, size, language, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      projectId,
      normalizedPath,
      contentHash,
      isDirectory ? null : content,
      isDirectory ? 1 : 0,
      size,
      language,
      timestamp,
      timestamp
    )
    .run();

  return {
    id,
    project_id: projectId,
    path: normalizedPath,
    content_hash: contentHash,
    content: isDirectory ? null : content,
    is_directory: isDirectory ? 1 : 0,
    size,
    language,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

/**
 * Update a file's content
 */
export async function updateFile(
  db: D1Database,
  projectId: string,
  path: string,
  content: string
): Promise<FileRecord | null> {
  const normalizedPath = normalizePath(path);

  // Check if file exists and is not a directory
  const existing = await getFile(db, projectId, normalizedPath);
  if (!existing) {
    throw new Error('File not found');
  }
  if (existing.is_directory === 1) {
    throw new Error('Cannot update directory content');
  }

  const timestamp = now();
  const size = new TextEncoder().encode(content).length;
  const contentHash = await computeHash(content);

  await db
    .prepare(
      `UPDATE project_files
       SET content = ?, content_hash = ?, size = ?, updated_at = ?
       WHERE project_id = ? AND path = ?`
    )
    .bind(content, contentHash, size, timestamp, projectId, normalizedPath)
    .run();

  return {
    ...existing,
    content,
    content_hash: contentHash,
    size,
    updated_at: timestamp,
  };
}

/**
 * Delete a file or directory (and all children if directory)
 */
export async function deleteFile(db: D1Database, projectId: string, path: string): Promise<void> {
  const normalizedPath = normalizePath(path);

  // Check if file exists
  const existing = await getFile(db, projectId, normalizedPath);
  if (!existing) {
    throw new Error('File not found');
  }

  if (existing.is_directory === 1) {
    // Delete directory and all children
    await db
      .prepare(
        `DELETE FROM project_files
         WHERE project_id = ? AND (path = ? OR path LIKE ?)`
      )
      .bind(projectId, normalizedPath, `${normalizedPath}/%`)
      .run();
  } else {
    // Delete single file
    await db
      .prepare('DELETE FROM project_files WHERE project_id = ? AND path = ?')
      .bind(projectId, normalizedPath)
      .run();
  }
}

/**
 * Move/rename a file or directory
 */
export async function moveFile(
  db: D1Database,
  projectId: string,
  oldPath: string,
  newPath: string
): Promise<FileRecord> {
  const normalizedOldPath = normalizePath(oldPath);
  const normalizedNewPath = normalizePath(newPath);

  if (normalizedOldPath === normalizedNewPath) {
    const existing = await getFile(db, projectId, normalizedOldPath);
    if (!existing) {
      throw new Error('File not found');
    }
    return existing;
  }

  // Check if source exists
  const existing = await getFile(db, projectId, normalizedOldPath);
  if (!existing) {
    throw new Error('Source file not found');
  }

  // Check if destination already exists
  const destExists = await getFile(db, projectId, normalizedNewPath);
  if (destExists) {
    throw new Error('Destination path already exists');
  }

  // Ensure parent of destination exists
  const destParentPath = getParentPath(normalizedNewPath);
  if (destParentPath) {
    const destParent = await getFile(db, projectId, destParentPath);
    if (!destParent) {
      await createFile(db, projectId, destParentPath, null, true);
    } else if (destParent.is_directory !== 1) {
      throw new Error('Destination parent is not a directory');
    }
  }

  const timestamp = now();
  const newLanguage = existing.is_directory === 1 ? null : detectLanguage(normalizedNewPath);

  if (existing.is_directory === 1) {
    // Move directory and all children
    // First update the directory itself
    await db
      .prepare(
        `UPDATE project_files
         SET path = ?, language = ?, updated_at = ?
         WHERE project_id = ? AND path = ?`
      )
      .bind(normalizedNewPath, newLanguage, timestamp, projectId, normalizedOldPath)
      .run();

    // Then update all children by replacing the old prefix with new prefix
    await db
      .prepare(
        `UPDATE project_files
         SET path = ? || SUBSTR(path, ?), updated_at = ?
         WHERE project_id = ? AND path LIKE ?`
      )
      .bind(
        normalizedNewPath,
        normalizedOldPath.length + 1,
        timestamp,
        projectId,
        `${normalizedOldPath}/%`
      )
      .run();
  } else {
    // Move single file
    await db
      .prepare(
        `UPDATE project_files
         SET path = ?, language = ?, updated_at = ?
         WHERE project_id = ? AND path = ?`
      )
      .bind(normalizedNewPath, newLanguage, timestamp, projectId, normalizedOldPath)
      .run();
  }

  return {
    ...existing,
    path: normalizedNewPath,
    language: newLanguage,
    updated_at: timestamp,
  };
}

/**
 * Upload a binary file to R2 storage
 */
export async function uploadFile(
  r2: R2Bucket,
  projectId: string,
  path: string,
  data: ArrayBuffer | ReadableStream,
  contentType?: string
): Promise<{
  key: string;
  url: string;
  size: number;
  etag?: string;
}> {
  const normalizedPath = normalizePath(path);
  const key = `projects/${projectId}/${normalizedPath}`;

  const result = await r2.put(key, data, {
    httpMetadata: {
      contentType: contentType || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000',
    },
    customMetadata: {
      projectId,
      originalPath: normalizedPath,
      uploadedAt: new Date().toISOString(),
    },
  });

  const size = data instanceof ArrayBuffer ? data.byteLength : 0;

  return {
    key,
    url: `https://assets.foohut.com/${key}`,
    size,
    etag: result?.etag,
  };
}

/**
 * Download a binary file from R2 storage
 */
export async function downloadFile(
  r2: R2Bucket,
  projectId: string,
  path: string
): Promise<{ data: ReadableStream; contentType: string; size: number } | null> {
  const normalizedPath = normalizePath(path);
  const key = `projects/${projectId}/${normalizedPath}`;

  const object = await r2.get(key);
  if (!object) {
    return null;
  }

  return {
    data: object.body,
    contentType: object.httpMetadata?.contentType || 'application/octet-stream',
    size: object.size,
  };
}

/**
 * Delete a binary file from R2 storage
 */
export async function deleteUploadedFile(
  r2: R2Bucket,
  projectId: string,
  path: string
): Promise<void> {
  const normalizedPath = normalizePath(path);
  const key = `projects/${projectId}/${normalizedPath}`;

  await r2.delete(key);
}

/**
 * List binary files in R2 for a project
 */
export async function listUploadedFiles(
  r2: R2Bucket,
  projectId: string,
  prefix?: string
): Promise<
  Array<{
    key: string;
    path: string;
    size: number;
    uploaded: Date;
    contentType?: string;
  }>
> {
  const basePrefix = `projects/${projectId}/`;
  const fullPrefix = prefix ? `${basePrefix}${normalizePath(prefix)}/` : basePrefix;

  const listed = await r2.list({ prefix: fullPrefix, limit: 1000 });

  return listed.objects.map((obj) => ({
    key: obj.key,
    path: obj.key.replace(basePrefix, ''),
    size: obj.size,
    uploaded: obj.uploaded,
    contentType: obj.httpMetadata?.contentType,
  }));
}

/**
 * Batch create files (for project initialization or import)
 */
export async function batchCreateFiles(
  db: D1Database,
  projectId: string,
  files: Array<{ path: string; content: string | null; isDirectory: boolean }>
): Promise<FileRecord[]> {
  const results: FileRecord[] = [];
  const timestamp = now();

  // Sort files so directories come before their contents
  files.sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.path.localeCompare(b.path);
  });

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);
    const id = generateId();
    const size = file.content ? new TextEncoder().encode(file.content).length : 0;
    const contentHash = file.content ? await computeHash(file.content) : null;
    const language = file.isDirectory ? null : detectLanguage(normalizedPath);

    await db
      .prepare(
        `INSERT OR REPLACE INTO project_files (id, project_id, path, content_hash, content, is_directory, size, language, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        projectId,
        normalizedPath,
        contentHash,
        file.isDirectory ? null : file.content,
        file.isDirectory ? 1 : 0,
        size,
        language,
        timestamp,
        timestamp
      )
      .run();

    results.push({
      id,
      project_id: projectId,
      path: normalizedPath,
      content_hash: contentHash,
      content: file.isDirectory ? null : file.content,
      is_directory: file.isDirectory ? 1 : 0,
      size,
      language,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  return results;
}

/**
 * Search files in a project
 */
export async function searchFiles(
  db: D1Database,
  projectId: string,
  query: string,
  options: {
    limit?: number;
    includeContent?: boolean;
    fileTypes?: string[];
  } = {}
): Promise<FileRecord[]> {
  const { limit = 50, includeContent = false, fileTypes } = options;

  let conditions = ['project_id = ?', 'is_directory = 0'];
  const values: (string | number)[] = [projectId];

  // Search in path
  conditions.push('(path LIKE ? OR content LIKE ?)');
  const searchPattern = `%${query}%`;
  values.push(searchPattern, searchPattern);

  // Filter by file types
  if (fileTypes && fileTypes.length > 0) {
    const typePlaceholders = fileTypes.map(() => '?').join(', ');
    conditions.push(`language IN (${typePlaceholders})`);
    values.push(...fileTypes);
  }

  values.push(limit);

  const selectCols = includeContent ? '*' : 'id, project_id, path, content_hash, is_directory, size, language, created_at, updated_at';

  const result = await db
    .prepare(
      `SELECT ${selectCols} FROM project_files
       WHERE ${conditions.join(' AND ')}
       ORDER BY path ASC
       LIMIT ?`
    )
    .bind(...values)
    .all<FileRecord>();

  return result.results || [];
}
