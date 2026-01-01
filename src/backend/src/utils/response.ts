/**
 * Response helpers for foohut.com backend API
 */

import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse, HttpStatus } from '../types/index.js';

/**
 * Send a successful JSON response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: HttpStatus = 200,
  message?: string
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  return res.status(statusCode).json(response);
}

/**
 * Send a created (201) response
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, 201, message);
}

/**
 * Send a no content (204) response
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).end();
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  statusCode: HttpStatus,
  message: string,
  code?: string,
  details?: Record<string, unknown>
): Response {
  const response: ApiResponse = {
    success: false,
    error: message,
    ...(code && { data: { code, details } }),
  };

  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response {
  const totalPages = Math.ceil(total / limit);

  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  return res.status(200).json({
    success: true,
    ...response,
  });
}

/**
 * Parse pagination parameters from query string
 */
export function parsePagination(
  query: Record<string, unknown>,
  defaults = { page: 1, limit: 20, maxLimit: 100 }
): { page: number; limit: number; offset: number } {
  let page = parseInt(String(query.page), 10) || defaults.page;
  let limit = parseInt(String(query.limit), 10) || defaults.limit;

  // Ensure valid bounds
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), defaults.maxLimit);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build sort options from query string
 */
export function parseSort(
  query: Record<string, unknown>,
  allowedFields: string[],
  defaultField = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): { field: string; order: 'asc' | 'desc' } {
  const sortBy = String(query.sortBy || defaultField);
  const sortOrder = String(query.sortOrder || defaultOrder).toLowerCase();

  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order = sortOrder === 'asc' ? 'asc' : 'desc';

  return { field, order };
}

/**
 * Build filter object from query parameters
 */
export function parseFilters<T extends Record<string, unknown>>(
  query: Record<string, unknown>,
  allowedFilters: (keyof T)[]
): Partial<T> {
  const filters: Partial<T> = {};

  for (const key of allowedFilters) {
    if (query[key as string] !== undefined) {
      filters[key] = query[key as string] as T[keyof T];
    }
  }

  return filters;
}
