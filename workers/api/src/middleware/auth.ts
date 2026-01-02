import { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { Env, JWTPayload, AuthUser } from '../types/index';

/**
 * Base64url encode
 */
function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url decode
 */
function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get crypto key for HMAC signing
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a JWT token
 */
export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 days in seconds
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const message = `${headerB64}.${payloadB64}`;

  const key = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  return `${message}.${base64urlEncode(signature)}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const message = `${headerB64}.${payloadB64}`;

  const key = await getCryptoKey(secret);
  const encoder = new TextEncoder();
  const signature = base64urlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(message)
  );

  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  const payloadBytes = base64urlDecode(payloadB64);
  const decoder = new TextDecoder();
  const payload = JSON.parse(decoder.decode(payloadBytes)) as JWTPayload;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token has expired');
  }

  return payload;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

type KindePayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getIssuer(domain: string): string {
  return domain.replace(/\/+$/, '');
}

function getJwks(domain: string) {
  const issuer = getIssuer(domain);
  const existing = jwksCache.get(issuer);
  if (existing) return existing;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  jwksCache.set(issuer, jwks);
  return jwks;
}

async function fetchAuth0UserProfile(token: string, env: Env): Promise<KindePayload | null> {
  const domain = env.AUTH0_DOMAIN || env.KINDE_DOMAIN;
  if (!domain) return null;
  const issuer = getIssuer(domain.startsWith('https://') ? domain : `https://${domain}`);
  try {
    const response = await fetch(`${issuer}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      sub: typeof data.sub === 'string' ? data.sub : typeof data.id === 'string' ? data.id : undefined,
      email: typeof data.email === 'string' ? data.email : undefined,
      email_verified: typeof data.email_verified === 'boolean' ? data.email_verified : undefined,
      given_name: typeof data.given_name === 'string' ? data.given_name : undefined,
      family_name: typeof data.family_name === 'string' ? data.family_name : undefined,
      picture: typeof data.picture === 'string' ? data.picture : undefined,
    };
  } catch {
    return null;
  }
}

async function enrichAuthPayload(
  payload: KindePayload,
  token: string,
  env: Env
): Promise<KindePayload> {
  if (payload.email) {
    return payload;
  }

  const profile = await fetchAuth0UserProfile(token, env);
  if (!profile) {
    return payload;
  }

  return {
    ...payload,
    ...(profile.sub ? { sub: profile.sub } : {}),
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.email_verified !== undefined ? { email_verified: profile.email_verified } : {}),
    ...(profile.given_name ? { given_name: profile.given_name } : {}),
    ...(profile.family_name ? { family_name: profile.family_name } : {}),
    ...(profile.picture ? { picture: profile.picture } : {}),
  };
}

async function verifyAuth0Token(token: string, env: Env): Promise<KindePayload | null> {
  // Try Auth0 first, then fall back to Kinde for backwards compatibility
  const domain = env.AUTH0_DOMAIN || env.KINDE_DOMAIN;
  if (!domain) return null;

  const issuer = getIssuer(domain.startsWith('https://') ? domain : `https://${domain}`);
  const audience = env.AUTH0_AUDIENCE || env.KINDE_AUDIENCE;

  try {
    const { payload } = await jwtVerify(token, getJwks(issuer), {
      issuer: issuer + '/',  // Auth0 issuer ends with /
      ...(audience ? { audience } : {}),
    });
    return await enrichAuthPayload(payload as KindePayload, token, env);
  } catch {
    // Try without trailing slash for Kinde compatibility
    try {
      const { payload } = await jwtVerify(token, getJwks(issuer), {
        issuer,
        ...(audience ? { audience } : {}),
      });
      return await enrichAuthPayload(payload as KindePayload, token, env);
    } catch {
      return null;
    }
  }
}

async function getUserById(db: D1Database, userId: string): Promise<AuthUser | null> {
  const result = await db.prepare(
    'SELECT id, email, username, display_name, avatar_url, role, is_admin FROM users WHERE id = ? AND deleted_at IS NULL'
  )
    .bind(userId)
    .first<{ id: string; email: string; username: string | null; display_name: string | null; avatar_url: string | null; role: string | null; is_admin: number | null }>();

  if (!result) return null;

  return {
    id: result.id,
    email: result.email,
    username: result.username,
    displayName: result.display_name,
    avatarUrl: result.avatar_url,
    role: result.role,
    is_admin: result.is_admin === 1
  };
}

/**
 * Generate a username from email prefix
 * - Extracts the part before @
 * - Converts to lowercase
 * - Replaces invalid characters with underscores
 * - Ensures it's 3-20 characters
 */
function generateUsernameFromEmail(email: string): string | null {
  const prefix = email.split('@')[0];
  if (!prefix) return null;

  // Normalize: lowercase, replace non-alphanumeric with underscore, collapse multiple underscores
  let username = prefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, ''); // trim underscores from ends

  // Ensure minimum length of 3
  if (username.length < 3) {
    username = username.padEnd(3, '0');
  }

  // Truncate to max 20 characters
  if (username.length > 20) {
    username = username.slice(0, 20);
  }

  // Validate final format
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return null;
  }

  return username;
}

/**
 * Check if new registrations are allowed
 */
async function areRegistrationsAllowed(db: D1Database): Promise<boolean> {
  const setting = await db.prepare(
    "SELECT value FROM system_settings WHERE key = 'allow_registrations'"
  ).first<{ value: string }>();
  return setting?.value === 'true';
}

/**
 * Check if a username is available (not taken and not reserved)
 */
async function isUsernameAvailable(db: D1Database, username: string): Promise<boolean> {
  // Check if taken by another user
  const taken = await db.prepare(
    'SELECT 1 FROM users WHERE username = ? AND deleted_at IS NULL'
  ).bind(username).first();
  if (taken) return false;

  // Check if reserved
  const reserved = await db.prepare(
    'SELECT 1 FROM reserved_usernames WHERE username = ?'
  ).bind(username).first();
  if (reserved) return false;

  return true;
}

async function ensureKindeUser(db: D1Database, payload: KindePayload): Promise<AuthUser | null> {
  const kindeId = payload.sub;
  const email = payload.email;
  if (!kindeId || !email) return null;

  const existingByKinde = await db.prepare(
    'SELECT id, email, username, display_name, avatar_url, role, kinde_id, is_admin FROM users WHERE kinde_id = ? AND deleted_at IS NULL'
  )
    .bind(kindeId)
    .first<{ id: string; email: string; username: string | null; display_name: string | null; avatar_url: string | null; role: string | null; kinde_id: string | null; is_admin: number | null }>();

  const existingByProvider = await db.prepare(
    'SELECT id, email, username, display_name, avatar_url, role, kinde_id, is_admin FROM users WHERE auth_provider = ? AND auth_provider_id = ? AND deleted_at IS NULL'
  )
    .bind('kinde', kindeId)
    .first<{ id: string; email: string; username: string | null; display_name: string | null; avatar_url: string | null; role: string | null; kinde_id: string | null; is_admin: number | null }>();

  const displayName = [payload.given_name, payload.family_name].filter(Boolean).join(' ').trim() || null;
  const avatarUrl = payload.picture ?? null;
  const now = new Date().toISOString();

  const existing = existingByKinde || existingByProvider;
  if (existing) {
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (existing.kinde_id !== kindeId) {
      updates.push('kinde_id = ?');
      values.push(kindeId);
    }
    if (displayName && existing.display_name !== displayName) {
      updates.push('display_name = ?');
      values.push(displayName);
    }
    if (avatarUrl && !existing.avatar_url) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    // Auto-assign username if missing
    let assignedUsername = existing.username;
    if (!existing.username) {
      const candidateUsername = generateUsernameFromEmail(existing.email);
      if (candidateUsername && await isUsernameAvailable(db, candidateUsername)) {
        updates.push('username = ?');
        values.push(candidateUsername);
        assignedUsername = candidateUsername;
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(now);
      values.push(existing.id);
      await db.prepare(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...values)
        .run();
    }

    return {
      id: existing.id,
      email: existing.email,
      username: assignedUsername,
      displayName: displayName ?? existing.display_name,
      avatarUrl: avatarUrl ?? existing.avatar_url,
      role: existing.role,
      is_admin: existing.is_admin === 1
    };
  }

  const byEmail = await db.prepare(
    'SELECT id, email, username, display_name, avatar_url, role, kinde_id, is_admin FROM users WHERE email = ? AND deleted_at IS NULL'
  )
    .bind(email)
    .first<{ id: string; email: string; username: string | null; display_name: string | null; avatar_url: string | null; role: string | null; kinde_id: string | null; is_admin: number | null }>();

  if (byEmail) {
    // Auto-assign username if missing
    let assignedUsername = byEmail.username;
    let usernameUpdate = '';
    const updateValues: (string | null)[] = ['kinde', kindeId, kindeId, displayName, avatarUrl];

    if (!byEmail.username) {
      const candidateUsername = generateUsernameFromEmail(byEmail.email);
      if (candidateUsername && await isUsernameAvailable(db, candidateUsername)) {
        usernameUpdate = ', username = ?';
        updateValues.push(candidateUsername);
        assignedUsername = candidateUsername;
      }
    }

    updateValues.push(now, byEmail.id);

    await db.prepare(
      `UPDATE users SET auth_provider = ?, auth_provider_id = ?, kinde_id = ?, display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url)${usernameUpdate}, updated_at = ? WHERE id = ?`
    )
      .bind(...updateValues)
      .run();

    return {
      id: byEmail.id,
      email: byEmail.email,
      username: assignedUsername,
      displayName: displayName ?? byEmail.display_name,
      avatarUrl: avatarUrl ?? byEmail.avatar_url,
      role: byEmail.role,
      is_admin: byEmail.is_admin === 1
    };
  }

  // Check if new registrations are allowed
  const registrationsAllowed = await areRegistrationsAllowed(db);
  if (!registrationsAllowed) {
    // New user registration is disabled
    return null;
  }

  const userId = crypto.randomUUID();

  // Try to auto-assign username from email prefix
  let autoUsername: string | null = null;
  const candidateUsername = generateUsernameFromEmail(email);
  if (candidateUsername && await isUsernameAvailable(db, candidateUsername)) {
    autoUsername = candidateUsername;
  }

  await db.prepare(
    `INSERT INTO users (id, email, email_verified, username, display_name, avatar_url, auth_provider, auth_provider_id, kinde_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      userId,
      email,
      payload.email_verified ? 1 : 0,
      autoUsername,
      displayName,
      avatarUrl,
      'kinde',
      kindeId,
      kindeId,
      now,
      now
    )
    .run();

  return {
    id: userId,
    email,
    username: autoUsername,
    displayName,
    avatarUrl,
    role: 'user',
    is_admin: false
  };
}

/**
 * Required authentication middleware
 * Extracts and verifies JWT token, sets user in context
 */
export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      { success: false, error: 'Authentication required' },
      401
    );
  }

  try {
    const authPayload = await verifyAuth0Token(token, c.env);
    if (authPayload) {
      const user = await ensureKindeUser(c.env.DB, authPayload);
      if (!user) {
        return c.json(
          { success: false, error: 'User not found' },
          401
        );
      }

      c.set('user', user);
      c.set('userId', user.id);

      await next();
      return;
    }

    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const user = await getUserById(c.env.DB, payload.sub);

    if (!user) {
      return c.json(
        { success: false, error: 'User not found' },
        401
      );
    }

    c.set('user', user);
    c.set('userId', user.id);

    await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    return c.json(
      { success: false, error: message },
      401
    );
  }
};

/**
 * Require global admin access
 */
export const requireAdmin: MiddlewareHandler<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}> = async (c, next) => {
  const userId = c.get('userId');

  const admin = await c.env.DB.prepare(
    'SELECT is_admin, role FROM users WHERE id = ? AND deleted_at IS NULL'
  )
    .bind(userId)
    .first<{ is_admin: number; role: string | null }>();

  const isAdmin = admin && (admin.is_admin === 1 || admin.role === 'admin');

  if (!isAdmin) {
    return c.json(
      { success: false, error: 'Admin access required' },
      403
    );
  }

  await next();
};

/**
 * Optional authentication middleware
 * If token is present and valid, sets user in context
 * If no token or invalid, continues without user
 */
export const optionalAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: { user?: AuthUser; userId?: string };
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (token) {
    try {
      const authPayload = await verifyAuth0Token(token, c.env);
      if (authPayload) {
        const user = await ensureKindeUser(c.env.DB, authPayload);
        if (user) {
          c.set('user', user);
          c.set('userId', user.id);
        }
      } else {
        const payload = await verifyToken(token, c.env.JWT_SECRET);
        const user = await getUserById(c.env.DB, payload.sub);
        if (user) {
          c.set('user', user);
          c.set('userId', user.id);
        }
      }
    } catch {
      // Token invalid, continue without user
    }
  }

  await next();
};

/**
 * Check if user is member of organization with minimum role
 */
export async function checkOrgMembership(
  db: D1Database,
  userId: string,
  orgId: string,
  minRole?: 'owner' | 'admin' | 'member' | 'viewer'
): Promise<{ isMember: boolean; role: string | null }> {
  const result = await db.prepare(
    'SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ? AND is_active = 1'
  )
    .bind(orgId, userId)
    .first<{ role: string }>();

  if (!result) {
    return { isMember: false, role: null };
  }

  if (!minRole) {
    return { isMember: true, role: result.role };
  }

  const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
  const userRoleIndex = roleHierarchy.indexOf(result.role);
  const minRoleIndex = roleHierarchy.indexOf(minRole);

  return {
    isMember: userRoleIndex >= minRoleIndex,
    role: result.role
  };
}
