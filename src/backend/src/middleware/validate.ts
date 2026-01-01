/**
 * Zod validation middleware for foohut.com backend API
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Validation target options
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
interface ValidationOptions {
  /**
   * Whether to strip unknown properties (default: true)
   */
  stripUnknown?: boolean;
}

/**
 * Create validation middleware for a Zod schema
 */
export function validate<T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { stripUnknown = true } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[target];

      // Parse and validate
      const result = stripUnknown
        ? schema.parse(data)
        : schema.strict().parse(data);

      // Replace request data with validated data
      req[target] = result;

      next();
    } catch (error) {
      // Pass Zod errors to error handler
      if (error instanceof ZodError) {
        next(error);
        return;
      }
      next(error);
    }
  };
}

/**
 * Validate request body
 */
export function validateBody<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
) {
  return validate(schema, 'body', options);
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
) {
  return validate(schema, 'query', options);
}

/**
 * Validate route parameters
 */
export function validateParams<T extends ZodSchema>(
  schema: T,
  options?: ValidationOptions
) {
  return validate(schema, 'params', options);
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * UUID parameter schema
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Slug parameter schema
 */
export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
});

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Search query schema
 */
export const searchQuerySchema = paginationSchema.extend({
  q: z.string().min(1).max(200).optional(),
});

/**
 * ID array schema for bulk operations
 */
export const idsArraySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Visibility enum schema
 */
export const visibilitySchema = z.enum(['public', 'private', 'internal']);

/**
 * Common string validation helpers
 */
export const stringSchemas = {
  name: z.string().min(1).max(255).trim(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(1000).optional(),
  email: z.string().email(),
  url: z.string().url(),
  uuid: z.string().uuid(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  icon: z.string().max(50).optional(),
};

/**
 * Transform string to slug
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Create a schema that auto-generates slug from name if not provided
 */
export function withAutoSlug<T extends z.ZodObject<{ name: z.ZodString }>>(schema: T) {
  return schema.transform((data) => {
    if (!data.slug && data.name) {
      return { ...data, slug: toSlug(data.name) };
    }
    return data;
  });
}
