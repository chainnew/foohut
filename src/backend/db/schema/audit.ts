// ============================================================================
// foohut.com Drizzle Schema - Audit Logging
// Immutable audit trail for compliance and debugging
// ============================================================================

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  inet,
  index,
} from 'drizzle-orm/pg-core';
import { auditActionEnum } from './enums';
import { organizations } from './organizations';
import { users } from './auth';

// ============================================================================
// AUDIT LOGS
// ============================================================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Actor
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userEmail: varchar('user_email', { length: 255 }), // Denormalized for historical accuracy

    // Context
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),

    // Action details
    action: auditActionEnum('action').notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: uuid('resource_id'),
    resourceName: varchar('resource_name', { length: 500 }),

    // Change details
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),

    // Request metadata
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    requestId: uuid('request_id'),

    // Additional context
    metadata: jsonb('metadata').default({}).notNull(),

    // Timestamp (immutable)
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    orgIdIdx: index('audit_logs_org_id_idx').on(table.organizationId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    requestIdIdx: index('audit_logs_request_id_idx').on(table.requestId),
  })
);

// ============================================================================
// API SPECIFICATIONS
// ============================================================================

export const apiSpecifications = pgTable(
  'api_specifications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent space
    spaceId: uuid('space_id').notNull(),

    // Specification details
    name: varchar('name', { length: 255 }).notNull(),
    version: varchar('version', { length: 50 }),

    // Spec format and content
    specFormat: varchar('spec_format', { length: 20 }).default('openapi').notNull(),
    specVersion: varchar('spec_version', { length: 10 }),
    specContent: jsonb('spec_content').notNull(),

    // Source tracking
    sourceType: varchar('source_type', { length: 20 }).notNull(), // url, file, manual
    sourceUrl: text('source_url'),

    // Auto-sync settings
    autoSync: boolean('auto_sync').default(false).notNull(),
    syncIntervalHours: integer('sync_interval_hours').default(6).notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    spaceIdIdx: index('api_specifications_space_id_idx').on(table.spaceId),
    nameIdx: index('api_specifications_name_idx').on(table.name),
    formatIdx: index('api_specifications_format_idx').on(table.specFormat),
  })
);

// ============================================================================
// CUSTOM DOMAINS
// ============================================================================

export const customDomains = pgTable(
  'custom_domains',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Parent space
    spaceId: uuid('space_id').notNull().unique(),

    // Domain details
    domain: varchar('domain', { length: 255 }).notNull().unique(),

    // Verification
    verificationToken: text('verification_token').notNull(),
    verificationMethod: varchar('verification_method', { length: 20 }).default('dns').notNull(),
    isVerified: boolean('is_verified').default(false).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    // SSL
    sslStatus: varchar('ssl_status', { length: 20 }).default('pending').notNull(),
    sslExpiresAt: timestamp('ssl_expires_at', { withTimezone: true }),

    // CDN
    cdnEnabled: boolean('cdn_enabled').default(true).notNull(),
    cdnCacheInvalidatedAt: timestamp('cdn_cache_invalidated_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    spaceIdIdx: index('custom_domains_space_id_idx').on(table.spaceId),
    domainIdx: index('custom_domains_domain_idx').on(table.domain),
    verifiedIdx: index('custom_domains_verified_idx').on(table.isVerified),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ApiSpecification = typeof apiSpecifications.$inferSelect;
export type NewApiSpecification = typeof apiSpecifications.$inferInsert;
export type CustomDomain = typeof customDomains.$inferSelect;
export type NewCustomDomain = typeof customDomains.$inferInsert;
