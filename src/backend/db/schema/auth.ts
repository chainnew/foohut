// ============================================================================
// foohut.com Drizzle Schema - Authentication
// Better-Auth compatible user and session management
// ============================================================================

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  inet,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizationMembers } from './organizations';

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Core auth fields
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    passwordHash: text('password_hash'),

    // Profile
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),

    // Auth provider (Better-Auth compatible)
    authProvider: varchar('auth_provider', { length: 50 }).default('email').notNull(),
    authProviderId: varchar('auth_provider_id', { length: 255 }),

    // Settings
    preferences: jsonb('preferences').default({}).notNull(),
    notificationSettings: jsonb('notification_settings').default({}).notNull(),

    // Status
    isActive: boolean('is_active').default(true).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
    authProviderIdx: index('users_auth_provider_idx').on(table.authProvider, table.authProviderId),
    activeIdx: index('users_active_idx').on(table.isActive).where(sql`${table.deletedAt} IS NULL`),
  })
);

// ============================================================================
// SESSIONS
// ============================================================================

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Token (hashed for security)
    tokenHash: text('token_hash').notNull(),

    // Metadata
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    deviceInfo: jsonb('device_info').default({}).notNull(),

    // Expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),

    // Revocation
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: varchar('revoked_reason', { length: 255 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
    tokenHashIdx: index('sessions_token_hash_idx').on(table.tokenHash),
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// ACCOUNTS (Better-Auth OAuth Accounts)
// ============================================================================

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // OAuth provider info
    provider: varchar('provider', { length: 50 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),

    // Tokens (encrypted at rest)
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),

    // Token type and scope
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),

    // Provider-specific data
    providerData: jsonb('provider_data').default({}).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
    providerAccountIdx: uniqueIndex('accounts_provider_account_idx').on(
      table.provider,
      table.providerAccountId
    ),
  })
);

// ============================================================================
// VERIFICATION TOKENS (Better-Auth compatible)
// ============================================================================

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Token identification
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: text('token').notNull(),

    // Token purpose
    type: varchar('type', { length: 50 }).notNull(), // email_verification, password_reset, etc.

    // Expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    // Usage tracking
    usedAt: timestamp('used_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    identifierIdx: index('verification_tokens_identifier_idx').on(table.identifier),
    tokenIdx: uniqueIndex('verification_tokens_token_idx').on(table.token),
    expiresAtIdx: index('verification_tokens_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  organizationMemberships: many(organizationMembers),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
