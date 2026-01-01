// ============================================================================
// R2 File Upload Routes
// Handle file uploads to Cloudflare R2 storage
// ============================================================================

import { Hono } from 'hono';
import { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  uploadFile,
  uploadData,
  getSignedUrl,
  downloadFile,
  getFileMetadata,
  deleteFile,
  deleteFiles,
  listFiles,
  copyFile,
  getStorageUsage,
  isAllowedType,
  generateFileKey,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES
} from '../services/storage.service';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Allowed file types (for backwards compatibility)
const ALLOWED_IMAGE_TYPES = ALLOWED_FILE_TYPES.images;
const ALLOWED_DOC_TYPES = [...ALLOWED_FILE_TYPES.data, ...ALLOWED_FILE_TYPES.text];

// Upload file to R2
app.post('/upload', requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const orgId = formData.get('orgId') as string;
    const spaceId = formData.get('spaceId') as string;

    if (!file) {
      return c.json({ error: { message: 'No file provided', code: 'NO_FILE' } }, 400);
    }

    if (!orgId || !spaceId) {
      return c.json({ error: { message: 'orgId and spaceId required', code: 'MISSING_PARAMS' } }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: { message: 'File too large (max 10MB)', code: 'FILE_TOO_LARGE' } }, 400);
    }

    // Validate file type
    const isAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES].includes(file.type);
    if (!isAllowed) {
      return c.json({ error: { message: 'File type not allowed', code: 'INVALID_TYPE' } }, 400);
    }

    // Generate unique key
    const key = generateFileKey(`${orgId}/${spaceId}`, file.name);

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.STORAGE.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: c.get('user').id,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return public URL (requires R2 public access or custom domain)
    // For private buckets, use signed URLs
    const publicUrl = `https://assets.foohut.com/${key}`;

    return c.json({
      data: {
        key,
        url: publicUrl,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: { message: 'Upload failed', code: 'UPLOAD_ERROR' } }, 500);
  }
});

// Get signed URL for private file access
app.get('/signed-url/:key{.+}', requireAuth, async (c) => {
  const key = c.req.param('key');

  // Check if file exists
  const object = await c.env.STORAGE.head(key);
  if (!object) {
    return c.json({ error: { message: 'File not found', code: 'NOT_FOUND' } }, 404);
  }

  // For R2, we'd typically use a signed URL service
  // For now, return direct access (requires public bucket or custom domain)
  return c.json({
    data: {
      url: `https://assets.foohut.com/${key}`,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
    }
  });
});

// Delete file from R2
app.delete('/:key{.+}', requireAuth, async (c) => {
  const key = c.req.param('key');

  try {
    await c.env.STORAGE.delete(key);
    return c.json({ data: { deleted: true } });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json({ error: { message: 'Delete failed', code: 'DELETE_ERROR' } }, 500);
  }
});

// List files in a space
app.get('/list/:orgId/:spaceId', requireAuth, async (c) => {
  const { orgId, spaceId } = c.req.param();
  const prefix = `${orgId}/${spaceId}/`;

  try {
    const listed = await c.env.STORAGE.list({ prefix, limit: 100 });

    const files = listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      etag: obj.etag,
    }));

    return c.json({ data: files });
  } catch (error) {
    console.error('List error:', error);
    return c.json({ error: { message: 'List failed', code: 'LIST_ERROR' } }, 500);
  }
});

// Upload OpenAPI spec
app.post('/openapi', requireAuth, async (c) => {
  try {
    const { spaceId, spec, format } = await c.req.json<{
      spaceId: string;
      spec: string;
      format: 'json' | 'yaml';
    }>();

    if (!spaceId || !spec) {
      return c.json({ error: { message: 'spaceId and spec required', code: 'MISSING_PARAMS' } }, 400);
    }

    // Validate spec format
    if (format === 'json') {
      try {
        JSON.parse(spec);
      } catch {
        return c.json({ error: { message: 'Invalid JSON', code: 'INVALID_JSON' } }, 400);
      }
    }

    const key = `specs/${spaceId}/openapi.${format === 'json' ? 'json' : 'yaml'}`;

    const result = await uploadData(c.env, key, spec, {
      contentType: format === 'json' ? 'application/json' : 'text/yaml',
      customMetadata: {
        uploadedBy: c.get('user').id
      }
    });

    return c.json({
      data: {
        key: result.key,
        url: result.url,
        format,
        size: result.size
      }
    });
  } catch (error) {
    console.error('OpenAPI upload error:', error);
    return c.json({ error: { message: 'Upload failed', code: 'UPLOAD_ERROR' } }, 500);
  }
});

/**
 * POST /uploads
 * Upload a file (multipart form data)
 *
 * Form fields:
 * - file: File (required)
 * - path: string (optional) - Storage path prefix
 *
 * Response:
 * - key: string - Storage key
 * - url: string - Public URL
 * - size: number - File size in bytes
 * - contentType: string - MIME type
 */
app.post('/', requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string || 'uploads';

    if (!file) {
      return c.json({ error: { message: 'No file provided', code: 'NO_FILE' } }, 400);
    }

    const result = await uploadFile(c.env, file, path, {
      customMetadata: {
        uploadedBy: c.get('user').id
      }
    });

    return c.json({
      data: {
        key: result.key,
        url: result.url,
        size: result.size,
        contentType: result.contentType
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Upload error:', error);
    return c.json({ error: { message, code: 'UPLOAD_ERROR' } }, 400);
  }
});

/**
 * GET /uploads/:key
 * Get file or signed URL
 *
 * Query params:
 * - signed: boolean - Return signed URL instead of file
 * - download: boolean - Force download with Content-Disposition
 *
 * Response (if signed=true):
 * - url: string - Signed URL
 * - expiresAt: string - Expiration timestamp
 *
 * Response (if signed=false):
 * - File stream with appropriate headers
 */
app.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const signed = c.req.query('signed') === 'true';
  const download = c.req.query('download') === 'true';

  if (!key) {
    return c.json({ error: { message: 'Key is required', code: 'MISSING_KEY' } }, 400);
  }

  try {
    if (signed) {
      const result = await getSignedUrl(c.env, key);
      return c.json({
        data: {
          url: result.url,
          expiresAt: result.expiresAt.toISOString()
        }
      });
    }

    // Return file directly
    const file = await downloadFile(c.env, key);
    if (!file) {
      return c.json({ error: { message: 'File not found', code: 'NOT_FOUND' } }, 404);
    }

    const headers: Record<string, string> = {
      'Content-Type': file.metadata.contentType || 'application/octet-stream',
      'ETag': file.metadata.etag,
      'Cache-Control': 'public, max-age=31536000'
    };

    if (download && file.metadata.customMetadata?.originalName) {
      headers['Content-Disposition'] = `attachment; filename="${file.metadata.customMetadata.originalName}"`;
    }

    return new Response(file.data, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get file';
    console.error('Get file error:', error);
    return c.json({ error: { message, code: 'GET_ERROR' } }, 500);
  }
});

/**
 * DELETE /uploads/:key
 * Delete a file
 */
app.delete('/:key{.+}', requireAuth, async (c) => {
  const key = c.req.param('key');

  if (!key) {
    return c.json({ error: { message: 'Key is required', code: 'MISSING_KEY' } }, 400);
  }

  try {
    await deleteFile(c.env, key);
    return c.json({ data: { deleted: true } });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json({ error: { message: 'Delete failed', code: 'DELETE_ERROR' } }, 500);
  }
});

/**
 * POST /uploads/batch-delete
 * Delete multiple files
 *
 * Request body:
 * - keys: string[] - Array of file keys to delete
 */
app.post('/batch-delete', requireAuth, async (c) => {
  try {
    const { keys } = await c.req.json<{ keys: string[] }>();

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return c.json({ error: { message: 'keys array is required', code: 'MISSING_KEYS' } }, 400);
    }

    if (keys.length > 1000) {
      return c.json({ error: { message: 'Maximum 1000 keys per request', code: 'TOO_MANY_KEYS' } }, 400);
    }

    await deleteFiles(c.env, keys);

    return c.json({ data: { deleted: keys.length } });
  } catch (error) {
    console.error('Batch delete error:', error);
    return c.json({ error: { message: 'Batch delete failed', code: 'DELETE_ERROR' } }, 500);
  }
});

/**
 * POST /uploads/copy
 * Copy a file to a new location
 *
 * Request body:
 * - sourceKey: string - Source file key
 * - destinationKey: string - Destination file key
 */
app.post('/copy', requireAuth, async (c) => {
  try {
    const { sourceKey, destinationKey } = await c.req.json<{
      sourceKey: string;
      destinationKey: string;
    }>();

    if (!sourceKey || !destinationKey) {
      return c.json({ error: { message: 'sourceKey and destinationKey are required', code: 'MISSING_PARAMS' } }, 400);
    }

    const result = await copyFile(c.env, sourceKey, destinationKey);

    return c.json({
      data: {
        key: result.key,
        url: result.url,
        size: result.size,
        contentType: result.contentType
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Copy failed';
    console.error('Copy error:', error);
    return c.json({ error: { message, code: 'COPY_ERROR' } }, 500);
  }
});

/**
 * GET /uploads/metadata/:key
 * Get file metadata without downloading
 */
app.get('/metadata/:key{.+}', requireAuth, async (c) => {
  const key = c.req.param('key');

  if (!key) {
    return c.json({ error: { message: 'Key is required', code: 'MISSING_KEY' } }, 400);
  }

  try {
    const metadata = await getFileMetadata(c.env, key);

    if (!metadata) {
      return c.json({ error: { message: 'File not found', code: 'NOT_FOUND' } }, 404);
    }

    return c.json({
      data: {
        key: metadata.key,
        size: metadata.size,
        uploaded: metadata.uploaded.toISOString(),
        etag: metadata.etag,
        contentType: metadata.contentType,
        customMetadata: metadata.customMetadata
      }
    });
  } catch (error) {
    console.error('Metadata error:', error);
    return c.json({ error: { message: 'Failed to get metadata', code: 'METADATA_ERROR' } }, 500);
  }
});

/**
 * GET /uploads/usage/:prefix
 * Get storage usage for a prefix
 */
app.get('/usage/:prefix{.+}', requireAuth, async (c) => {
  const prefix = c.req.param('prefix');

  if (!prefix) {
    return c.json({ error: { message: 'Prefix is required', code: 'MISSING_PREFIX' } }, 400);
  }

  try {
    const usage = await getStorageUsage(c.env, prefix);

    return c.json({
      data: {
        prefix,
        totalSize: usage.totalSize,
        totalSizeMB: Math.round(usage.totalSize / 1024 / 1024 * 100) / 100,
        fileCount: usage.fileCount
      }
    });
  } catch (error) {
    console.error('Usage error:', error);
    return c.json({ error: { message: 'Failed to get usage', code: 'USAGE_ERROR' } }, 500);
  }
});

export default app;
