/**
 * Subdomain Detection Middleware
 * Detects subdomain from request and routes accordingly
 */

import { Context, MiddlewareHandler } from 'hono';
import { Env } from '../types';

/**
 * Subdomain types
 */
export type SubdomainType = 'main' | 'developer' | 'api' | 'docs' | 'custom';

/**
 * Subdomain context variables
 */
export interface SubdomainVariables {
  subdomain: SubdomainType;
  subdomainRaw: string | null;
  customDomain: string | null;
}

/**
 * Known subdomains and their types
 */
const KNOWN_SUBDOMAINS: Record<string, SubdomainType> = {
  'developer': 'developer',
  'dev': 'developer',
  'api': 'api',
  'docs': 'docs',
  'help': 'docs',
  'www': 'main',
};

/**
 * Main domain patterns
 */
const MAIN_DOMAINS = ['foohut.com', 'foohut.io', 'localhost', '127.0.0.1'];

/**
 * Extract subdomain from host
 */
function extractSubdomain(host: string): { subdomain: string | null; baseDomain: string } {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];

  // Check if it's a main domain without subdomain
  for (const mainDomain of MAIN_DOMAINS) {
    if (hostWithoutPort === mainDomain) {
      return { subdomain: null, baseDomain: mainDomain };
    }

    // Check for subdomain
    if (hostWithoutPort.endsWith(`.${mainDomain}`)) {
      const subdomain = hostWithoutPort.replace(`.${mainDomain}`, '');
      return { subdomain, baseDomain: mainDomain };
    }
  }

  // Not a known domain - could be custom domain
  return { subdomain: null, baseDomain: hostWithoutPort };
}

/**
 * Check if host is a custom domain (not our main domains)
 */
function isCustomDomain(host: string): boolean {
  const hostWithoutPort = host.split(':')[0];

  for (const mainDomain of MAIN_DOMAINS) {
    if (hostWithoutPort === mainDomain || hostWithoutPort.endsWith(`.${mainDomain}`)) {
      return false;
    }
  }

  return true;
}

/**
 * Subdomain detection middleware
 * Detects subdomain from request host and sets context variables
 */
export const subdomainMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: SubdomainVariables;
}> = async (c, next) => {
  const host = c.req.header('host') || c.req.header('x-forwarded-host') || '';

  // Check for custom domain first
  if (isCustomDomain(host)) {
    c.set('subdomain', 'custom');
    c.set('subdomainRaw', null);
    c.set('customDomain', host.split(':')[0]);
    return next();
  }

  // Extract subdomain from host
  const { subdomain } = extractSubdomain(host);

  // Determine subdomain type
  let subdomainType: SubdomainType = 'main';
  if (subdomain) {
    subdomainType = KNOWN_SUBDOMAINS[subdomain.toLowerCase()] || 'main';
  }

  c.set('subdomain', subdomainType);
  c.set('subdomainRaw', subdomain);
  c.set('customDomain', null);

  await next();
};

/**
 * Require specific subdomain middleware
 * Returns 404 if request is not from expected subdomain
 */
export function requireSubdomain(
  expectedSubdomain: SubdomainType
): MiddlewareHandler<{
  Bindings: Env;
  Variables: SubdomainVariables;
}> {
  return async (c, next) => {
    const currentSubdomain = c.get('subdomain');

    if (currentSubdomain !== expectedSubdomain) {
      return c.json(
        { success: false, error: 'Not found' },
        404
      );
    }

    await next();
  };
}

/**
 * Get subdomain from context (helper)
 */
export function getSubdomain(c: Context<{ Variables: SubdomainVariables }>): SubdomainType {
  return c.get('subdomain') || 'main';
}

/**
 * Check if request is from developer subdomain
 */
export function isDeveloperSubdomain(c: Context<{ Variables: SubdomainVariables }>): boolean {
  return c.get('subdomain') === 'developer';
}

/**
 * Check if request is from API subdomain
 */
export function isApiSubdomain(c: Context<{ Variables: SubdomainVariables }>): boolean {
  return c.get('subdomain') === 'api';
}

/**
 * Check if request is from custom domain
 */
export function isCustomDomainRequest(c: Context<{ Variables: SubdomainVariables }>): boolean {
  return c.get('subdomain') === 'custom';
}

/**
 * Get custom domain from context
 */
export function getCustomDomain(c: Context<{ Variables: SubdomainVariables }>): string | null {
  return c.get('customDomain');
}

/**
 * Subdomain router helper
 * Routes request based on subdomain
 */
export async function routeBySubdomain<T extends { Bindings: Env; Variables: SubdomainVariables }>(
  c: Context<T>,
  handlers: {
    main?: () => Promise<Response> | Response;
    developer?: () => Promise<Response> | Response;
    api?: () => Promise<Response> | Response;
    docs?: () => Promise<Response> | Response;
    custom?: (domain: string) => Promise<Response> | Response;
    default?: () => Promise<Response> | Response;
  }
): Promise<Response> {
  const subdomain = c.get('subdomain');

  switch (subdomain) {
    case 'main':
      if (handlers.main) return handlers.main();
      break;
    case 'developer':
      if (handlers.developer) return handlers.developer();
      break;
    case 'api':
      if (handlers.api) return handlers.api();
      break;
    case 'docs':
      if (handlers.docs) return handlers.docs();
      break;
    case 'custom':
      const customDomain = c.get('customDomain');
      if (handlers.custom && customDomain) return handlers.custom(customDomain);
      break;
  }

  // Fallback to default handler or 404
  if (handlers.default) {
    return handlers.default();
  }

  return c.json({ success: false, error: 'Not found' }, 404);
}

/**
 * Developer portal routes middleware
 * Applies specific settings for developer subdomain
 */
export const developerPortalMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: SubdomainVariables;
}> = async (c, next) => {
  const subdomain = c.get('subdomain');

  if (subdomain !== 'developer') {
    return c.json({ success: false, error: 'Not found' }, 404);
  }

  // Add developer portal specific headers
  c.header('X-Portal', 'developer');

  await next();
};

/**
 * Custom domain lookup helper
 * Looks up a space by custom domain
 */
export async function lookupCustomDomain(
  db: D1Database,
  domain: string
): Promise<{
  spaceId: string;
  collectionId: string;
  organizationId: string;
  name: string;
} | null> {
  const result = await db
    .prepare(
      `SELECT s.id as space_id, s.name, s.collection_id, c.organization_id
       FROM spaces s
       INNER JOIN collections c ON s.collection_id = c.id
       WHERE s.custom_domain = ? AND s.custom_domain_verified = 1 AND s.deleted_at IS NULL`
    )
    .bind(domain)
    .first<{
      space_id: string;
      name: string;
      collection_id: string;
      organization_id: string;
    }>();

  if (!result) {
    return null;
  }

  return {
    spaceId: result.space_id,
    collectionId: result.collection_id,
    organizationId: result.organization_id,
    name: result.name,
  };
}

/**
 * Custom domain resolution middleware
 * Resolves custom domains to their corresponding spaces
 */
export const customDomainMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: SubdomainVariables & { spaceId?: string };
}> = async (c, next) => {
  const subdomain = c.get('subdomain');
  const customDomain = c.get('customDomain');

  if (subdomain !== 'custom' || !customDomain) {
    return next();
  }

  // Lookup space by custom domain
  const space = await lookupCustomDomain(c.env.DB, customDomain);

  if (!space) {
    return c.json(
      { success: false, error: 'Domain not configured' },
      404
    );
  }

  // Set space ID in context
  c.set('spaceId' as any, space.spaceId);

  await next();
};
