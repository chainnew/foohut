import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';
import { Env, ApiResponse } from './types/index';

// Import route handlers
import aiRoutes from './routes/ai';
import auth from './routes/auth';
import organizations from './routes/organizations';
import collections from './routes/collections';
import spaces from './routes/spaces';
import pages from './routes/pages';
import uploads from './routes/uploads';
import projects from './routes/projects';
import profiles from './routes/profiles';
import codeAI from './routes/code-ai';
import chat from './routes/chat';
import friends from './routes/friends';
import admin from './routes/admin';
import documents from './routes/documents';
import users from './routes/users';

// Import middleware
import { subdomainMiddleware } from './middleware/subdomain';
import { loggingMiddleware } from './middleware/logging';

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', loggingMiddleware());

// CORS configuration
app.use('*', cors({
  origin: (origin) => {
    const allowed = [
      'https://foohut.com',
      'https://foohut.pages.dev',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];
    if (allowed.includes(origin)) return origin;
    // Allow Cloudflare Pages preview URLs
    if (/^https:\/\/[a-z0-9]+\.foohut\.pages\.dev$/.test(origin)) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Global error handler
app.onError((err, c) => {
  console.error('API Error:', err);

  if (err instanceof HTTPException) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: err.message
      },
      err.status
    );
  }

  // Don't expose internal errors in production
  const isProduction = c.env.ENVIRONMENT === 'production';
  const message = isProduction ? 'Internal server error' : (err.message || 'Unknown error');

  return c.json<ApiResponse>(
    {
      success: false,
      error: message
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json<ApiResponse>(
    {
      success: false,
      error: 'Not found'
    },
    404
  );
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json<ApiResponse<{ status: string; environment: string; timestamp: string }>>(
    {
      success: true,
      data: {
        status: 'healthy',
        environment: c.env.ENVIRONMENT || 'development',
        timestamp: new Date().toISOString()
      }
    },
    200
  );
});

// API version info
app.get('/', (c) => {
  return c.json<ApiResponse<{ version: string; name: string; status: string }>>(
    {
      success: true,
      data: {
        name: 'Foohut API',
        version: '1.0.0',
        status: 'ok'
      }
    },
    200
  );
});

// Apply subdomain detection middleware
app.use('*', subdomainMiddleware);

// Mount route groups - ORDER MATTERS!
// Document Canvas routes (must be before catch-all routers)
app.route('/documents', documents);

// Specific path routes
app.route('/ai', aiRoutes);
app.route('/auth', auth);
app.route('/uploads', uploads);
app.route('/projects', projects);
app.route('/profiles', profiles);
app.route('/code-ai', codeAI);
app.route('/chat', chat);
app.route('/friends', friends);
app.route('/users', users);
app.route('/api/users', users);

// Catch-all routers (mounted at '/' - these can intercept other routes!)
app.route('/', organizations);
app.route('/', collections);
app.route('/', spaces);
app.route('/', pages);
app.route('/', admin);

// Export for Cloudflare Workers
export default app;
