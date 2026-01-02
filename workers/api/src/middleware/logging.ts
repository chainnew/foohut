import { Context, Next } from 'hono';
import { Env, AuthUser } from '../types/index';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'api';
  method: string;
  path: string;
  status?: number;
  duration_ms?: number;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  request_id: string;
  error?: string;
  error_stack?: string;
  metadata?: string;
  created_at: string;
}

// Generate a unique request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Get client IP from various headers
function getClientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// Async log writing (non-blocking)
async function writeLog(db: D1Database, entry: LogEntry): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO api_logs (id, timestamp, level, method, path, status, duration_ms, user_id, user_email, ip_address, user_agent, request_id, error, error_stack, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        entry.id,
        entry.timestamp,
        entry.level,
        entry.method,
        entry.path,
        entry.status ?? null,
        entry.duration_ms ?? null,
        entry.user_id ?? null,
        entry.user_email ?? null,
        entry.ip_address ?? null,
        entry.user_agent ?? null,
        entry.request_id,
        entry.error ?? null,
        entry.error_stack ?? null,
        entry.metadata ?? null,
        entry.created_at
      )
      .run();
  } catch (err) {
    // Silently fail - don't let logging errors affect the request
    console.error('Failed to write log:', err);
  }
}

// Logging middleware
export function loggingMiddleware() {
  return async (c: Context<{ Bindings: Env; Variables: { user?: AuthUser; userId?: string } }>, next: Next) => {
    const startTime = performance.now();
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const method = c.req.method;
    const path = new URL(c.req.url).pathname;
    const userAgent = c.req.header('user-agent') || 'unknown';
    const ipAddress = getClientIp(c);

    // Skip logging for health checks to reduce noise
    if (path === '/health') {
      return next();
    }

    // Add request ID to response headers
    c.header('x-request-id', requestId);

    let error: string | undefined;
    let errorStack: string | undefined;
    let status = 0;

    try {
      await next();
      status = c.res.status;
    } catch (err) {
      status = 500;
      if (err instanceof Error) {
        error = err.message;
        errorStack = err.stack;
      } else {
        error = String(err);
      }
      throw err; // Re-throw to let error handler catch it
    } finally {
      const duration = Math.round(performance.now() - startTime);
      const user = c.get('user');

      // Determine log level based on status
      let level: LogEntry['level'] = 'api';
      if (status >= 500) {
        level = 'error';
      } else if (status >= 400) {
        level = 'warn';
      }

      const logEntry: LogEntry = {
        id: crypto.randomUUID(),
        timestamp,
        level,
        method,
        path,
        status,
        duration_ms: duration,
        user_id: user?.id,
        user_email: user?.email,
        ip_address: ipAddress,
        user_agent: userAgent,
        request_id: requestId,
        error,
        error_stack: errorStack,
        created_at: timestamp,
      };

      // Write log asynchronously (use waitUntil if available)
      const ctx = c.executionCtx;
      if (ctx && 'waitUntil' in ctx) {
        ctx.waitUntil(writeLog(c.env.DB, logEntry));
      } else {
        // Fallback: fire and forget
        writeLog(c.env.DB, logEntry).catch(() => {});
      }
    }
  };
}

// Helper to manually log events (for non-request logging)
export async function logEvent(
  db: D1Database,
  level: LogEntry['level'],
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp,
    level,
    method: 'EVENT',
    path: message,
    request_id: `event-${Date.now()}`,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    created_at: timestamp,
  };
  await writeLog(db, entry);
}
