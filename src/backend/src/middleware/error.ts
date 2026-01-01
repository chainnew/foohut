/**
 * Error handling middleware for foohut.com backend API
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, isOperationalError, wrapError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../index.js';
import { config } from '../config/index.js';

/**
 * Convert Zod validation errors to a readable format
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = formatZodErrors(err);
    logger.warn({ path: req.path, errors: formattedErrors }, 'Validation error');

    return sendError(res, 422, 'Validation failed', 'VALIDATION_ERROR', {
      fields: formattedErrors,
    });
  }

  // Handle known application errors
  if (isOperationalError(err)) {
    const appError = err as AppError;

    // Log based on severity
    if (appError.statusCode >= 500) {
      logger.error({ err: appError, path: req.path }, appError.message);
    } else if (appError.statusCode >= 400) {
      logger.warn({ err: appError, path: req.path }, appError.message);
    }

    return sendError(
      res,
      appError.statusCode,
      appError.message,
      appError.code,
      appError.details
    );
  }

  // Handle unexpected errors
  const wrappedError = wrapError(err);

  // Always log unexpected errors
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      body: config.isDev ? req.body : undefined,
    },
    'Unhandled error'
  );

  // In production, hide error details
  const message = config.isDev ? err.message : 'An unexpected error occurred';

  return sendError(res, wrappedError.statusCode, message, 'INTERNAL_ERROR', {
    ...(config.isDev && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): Response {
  logger.debug({ path: req.path, method: req.method }, 'Route not found');

  return sendError(res, 404, `Cannot ${req.method} ${req.path}`, 'NOT_FOUND');
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
