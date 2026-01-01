import { AuthUser } from '../types/index';

/**
 * Generate a random UUID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Hash a password using PBKDF2 with Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...hashArray));

  return `pbkdf2:100000:${saltB64}:${hashB64}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const [, iterationsStr, saltB64, expectedHashB64] = parts;
  const iterations = parseInt(iterationsStr, 10);

  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const hashB64 = btoa(String.fromCharCode(...hashArray));

  return hashB64 === expectedHashB64;
}

/**
 * User creation data
 */
export interface CreateUserData {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
}

/**
 * User record from database
 */
export interface UserRecord {
  id: string;
  email: string;
  username: string | null;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Create a new user
 */
export async function createUser(
  db: D1Database,
  data: CreateUserData
): Promise<AuthUser> {
  const id = generateId();
  const passwordHash = await hashPassword(data.password);
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO users (id, email, username, password_hash, display_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, data.email, data.username || null, passwordHash, data.displayName || null, now, now)
    .run();

  return {
    id,
    email: data.email,
    username: data.username || null,
    displayName: data.displayName || null
  };
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  db: D1Database,
  email: string
): Promise<UserRecord | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL'
  )
    .bind(email)
    .first<UserRecord>();

  return result || null;
}

/**
 * Find user by ID
 */
export async function findUserById(
  db: D1Database,
  id: string
): Promise<UserRecord | null> {
  const result = await db.prepare(
    'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL'
  )
    .bind(id)
    .first<UserRecord>();

  return result || null;
}

/**
 * Update user profile
 */
export async function updateUser(
  db: D1Database,
  id: string,
  updates: Partial<Pick<UserRecord, 'display_name' | 'avatar_url'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.display_name !== undefined) {
    fields.push('display_name = ?');
    values.push(updates.display_name);
  }

  if (updates.avatar_url !== undefined) {
    fields.push('avatar_url = ?');
    values.push(updates.avatar_url);
  }

  if (fields.length === 0) {
    return;
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.prepare(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run();
}

/**
 * Session record
 */
export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  last_active_at: string;
  created_at: string;
}

/**
 * Create a session record (for session tracking)
 */
export async function createSession(
  db: D1Database,
  userId: string,
  tokenHash: string,
  expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
): Promise<SessionRecord> {
  const id = generateId();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + expiresIn);

  await db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, device_info, expires_at, last_active_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, userId, tokenHash, '{}', expiresAt.toISOString(), nowIso, nowIso)
    .run();

  return {
    id,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    last_active_at: nowIso,
    created_at: nowIso
  };
}

/**
 * Delete expired sessions
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare(
    'DELETE FROM sessions WHERE expires_at < ?'
  )
    .bind(new Date().toISOString())
    .run();
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(
  db: D1Database,
  userId: string
): Promise<void> {
  await db.prepare(
    'DELETE FROM sessions WHERE user_id = ?'
  )
    .bind(userId)
    .run();
}

/**
 * Hash a token for session storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray));
}
