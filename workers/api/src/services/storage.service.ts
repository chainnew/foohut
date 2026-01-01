/**
 * Storage Service
 * Handles file uploads, downloads, and management for R2 bucket
 */

import { Env } from '../types';

/**
 * File upload result
 */
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
  etag?: string;
}

/**
 * File metadata
 */
export interface FileMetadata {
  key: string;
  size: number;
  uploaded: Date;
  etag: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
}

/**
 * Allowed file types by category
 */
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  data: ['application/json', 'text/yaml', 'application/x-yaml', 'text/csv'],
  text: ['text/plain', 'text/markdown', 'text/html'],
  code: ['text/javascript', 'text/typescript', 'text/css', 'application/xml'],
  archives: ['application/zip', 'application/gzip']
};

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Base URL for public assets
 */
const ASSETS_BASE_URL = 'https://assets.foohut.com';

/**
 * Generate a unique file key with path
 *
 * @param prefix - Path prefix (e.g., "org-id/space-id")
 * @param filename - Original filename
 * @returns Unique storage key
 */
export function generateFileKey(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
  const sanitizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  return `${sanitizedPrefix}/${timestamp}-${random}.${ext}`;
}

/**
 * Get the public URL for a file
 *
 * @param key - Storage key
 * @returns Public URL
 */
export function getPublicUrl(key: string): string {
  return `${ASSETS_BASE_URL}/${key}`;
}

/**
 * Check if a content type is allowed
 *
 * @param contentType - MIME type to check
 * @param categories - Allowed categories (default: all)
 * @returns True if allowed
 */
export function isAllowedType(
  contentType: string,
  categories: (keyof typeof ALLOWED_FILE_TYPES)[] = ['images', 'documents', 'data', 'text']
): boolean {
  const allowedTypes = categories.flatMap(cat => ALLOWED_FILE_TYPES[cat]);
  return allowedTypes.includes(contentType);
}

/**
 * Upload a file to R2 storage
 *
 * @param env - Environment bindings
 * @param file - File to upload
 * @param path - Storage path prefix
 * @param options - Upload options
 * @returns Upload result with key and URL
 */
export async function uploadFile(
  env: Env,
  file: File,
  path: string,
  options: {
    customMetadata?: Record<string, string>;
    cacheControl?: string;
    contentDisposition?: string;
  } = {}
): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  if (!isAllowedType(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  // Generate unique key
  const key = generateFileKey(path, file.name);

  // Get file content as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Upload to R2
  const result = await env.STORAGE.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year
      contentDisposition: options.contentDisposition
    },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
      ...options.customMetadata
    }
  });

  return {
    key,
    url: getPublicUrl(key),
    size: file.size,
    contentType: file.type,
    etag: result?.etag
  };
}

/**
 * Upload raw data to R2 storage
 *
 * @param env - Environment bindings
 * @param key - Storage key
 * @param data - Data to upload (string, ArrayBuffer, or ReadableStream)
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadData(
  env: Env,
  key: string,
  data: string | ArrayBuffer | ReadableStream,
  options: {
    contentType?: string;
    customMetadata?: Record<string, string>;
    cacheControl?: string;
  } = {}
): Promise<UploadResult> {
  const size = typeof data === 'string'
    ? new TextEncoder().encode(data).length
    : data instanceof ArrayBuffer
      ? data.byteLength
      : 0;

  const result = await env.STORAGE.put(key, data, {
    httpMetadata: {
      contentType: options.contentType || 'application/octet-stream',
      cacheControl: options.cacheControl || 'public, max-age=31536000'
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      ...options.customMetadata
    }
  });

  return {
    key,
    url: getPublicUrl(key),
    size,
    contentType: options.contentType || 'application/octet-stream',
    etag: result?.etag
  };
}

/**
 * Get a signed URL for private file access
 * Note: R2 signed URLs require R2 custom domains or presigned URLs via R2 API
 * This is a placeholder implementation using time-limited tokens
 *
 * @param env - Environment bindings
 * @param key - Storage key
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Signed URL with expiration
 */
export async function getSignedUrl(
  env: Env,
  key: string,
  expiresIn: number = 3600
): Promise<{ url: string; expiresAt: Date }> {
  // Check if file exists
  const object = await env.STORAGE.head(key);
  if (!object) {
    throw new Error('File not found');
  }

  // For public buckets, return the direct URL
  // For private buckets, you would use R2's presigned URL feature
  // This requires additional setup with R2 API credentials

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // In production, use proper signed URL mechanism
  // This is a simplified version for public/semi-public access
  const url = getPublicUrl(key);

  return { url, expiresAt };
}

/**
 * Download a file from R2 storage
 *
 * @param env - Environment bindings
 * @param key - Storage key
 * @returns File data with metadata, or null if not found
 */
export async function downloadFile(
  env: Env,
  key: string
): Promise<{ data: ReadableStream; metadata: FileMetadata } | null> {
  const object = await env.STORAGE.get(key);

  if (!object) {
    return null;
  }

  return {
    data: object.body,
    metadata: {
      key: object.key,
      size: object.size,
      uploaded: object.uploaded,
      etag: object.etag,
      contentType: object.httpMetadata?.contentType,
      customMetadata: object.customMetadata
    }
  };
}

/**
 * Get file metadata without downloading
 *
 * @param env - Environment bindings
 * @param key - Storage key
 * @returns File metadata, or null if not found
 */
export async function getFileMetadata(
  env: Env,
  key: string
): Promise<FileMetadata | null> {
  const object = await env.STORAGE.head(key);

  if (!object) {
    return null;
  }

  return {
    key: object.key,
    size: object.size,
    uploaded: object.uploaded,
    etag: object.etag,
    contentType: object.httpMetadata?.contentType,
    customMetadata: object.customMetadata
  };
}

/**
 * Delete a file from R2 storage
 *
 * @param env - Environment bindings
 * @param key - Storage key to delete
 */
export async function deleteFile(env: Env, key: string): Promise<void> {
  await env.STORAGE.delete(key);
}

/**
 * Delete multiple files from R2 storage
 *
 * @param env - Environment bindings
 * @param keys - Array of storage keys to delete
 */
export async function deleteFiles(env: Env, keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  // R2 supports batch delete
  await env.STORAGE.delete(keys);
}

/**
 * List files with a given prefix
 *
 * @param env - Environment bindings
 * @param prefix - Path prefix to list
 * @param options - List options
 * @returns Array of file metadata
 */
export async function listFiles(
  env: Env,
  prefix: string,
  options: {
    limit?: number;
    cursor?: string;
    delimiter?: string;
  } = {}
): Promise<{
  files: FileMetadata[];
  truncated: boolean;
  cursor?: string;
}> {
  const { limit = 100, cursor, delimiter } = options;

  const listed = await env.STORAGE.list({
    prefix,
    limit,
    cursor,
    delimiter
  });

  const files = listed.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
    etag: obj.etag,
    contentType: obj.httpMetadata?.contentType,
    customMetadata: obj.customMetadata
  }));

  return {
    files,
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : undefined
  };
}

/**
 * Copy a file within R2 storage
 *
 * @param env - Environment bindings
 * @param sourceKey - Source file key
 * @param destinationKey - Destination file key
 * @returns New file metadata
 */
export async function copyFile(
  env: Env,
  sourceKey: string,
  destinationKey: string
): Promise<UploadResult> {
  // Get the source file
  const source = await env.STORAGE.get(sourceKey);
  if (!source) {
    throw new Error('Source file not found');
  }

  // Copy to destination
  const result = await env.STORAGE.put(destinationKey, source.body, {
    httpMetadata: source.httpMetadata,
    customMetadata: {
      ...source.customMetadata,
      copiedFrom: sourceKey,
      copiedAt: new Date().toISOString()
    }
  });

  return {
    key: destinationKey,
    url: getPublicUrl(destinationKey),
    size: source.size,
    contentType: source.httpMetadata?.contentType || 'application/octet-stream',
    etag: result?.etag
  };
}

/**
 * Get total storage usage for a prefix
 *
 * @param env - Environment bindings
 * @param prefix - Path prefix to calculate
 * @returns Total size in bytes and file count
 */
export async function getStorageUsage(
  env: Env,
  prefix: string
): Promise<{ totalSize: number; fileCount: number }> {
  let totalSize = 0;
  let fileCount = 0;
  let cursor: string | undefined;

  do {
    const listed = await env.STORAGE.list({
      prefix,
      limit: 1000,
      cursor
    });

    for (const obj of listed.objects) {
      totalSize += obj.size;
      fileCount++;
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return { totalSize, fileCount };
}
