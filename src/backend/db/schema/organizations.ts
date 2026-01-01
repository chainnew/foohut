// ============================================================================
// foohut.com Drizzle Schema - Organizations
// Root administrative container for billing, identity, and user membership
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
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';
import { users } from './auth';
import { collections } from './content';
import { auditLogs } from './audit';

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Identity
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    logoUrl: text('logo_url'),

    // Settings
    settings: jsonb('settings').default({}).notNull(),
    billingInfo: jsonb('billing_info').default({}).notNull(),

    // Feature flags
    features: jsonb('features').default({}).notNull(),

    // Plan/tier
    plan: varchar('plan', { length: 50 }).default('free').notNull(),
    planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(table.slug),
    createdAtIdx: index('organizations_created_at_idx').on(table.createdAt),
    activeIdx: index('organizations_active_idx').on(table.id).where(sql`${table.deletedAt} IS NULL`),
  })
);

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Foreign keys
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Role assignment
    role: userRoleEnum('role').default('editor').notNull(),

    // Invitation tracking
    invitedBy: uuid('invited_by').references(() => users.id),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),

    // Member status
    isActive: boolean('is_active').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserIdx: uniqueIndex('organization_members_org_user_idx').on(
      table.organizationId,
      table.userId
    ),
    userIdIdx: index('organization_members_user_id_idx').on(table.userId),
    roleIdx: index('organization_members_role_idx').on(table.role),
  })
);

// ============================================================================
// ORGANIZATION INVITATIONS
// ============================================================================

export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Foreign keys
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    // Invitation details
    email: varchar('email', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('editor').notNull(),

    // Token for accepting invitation
    token: text('token').notNull().unique(),

    // Tracking
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),

    // Status
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('organization_invitations_token_idx').on(table.token),
    orgEmailIdx: index('organization_invitations_org_email_idx').on(
      table.organizationId,
      table.email
    ),
    expiresAtIdx: index('organization_invitations_expires_at_idx').on(table.expiresAt),
  })
);

// ============================================================================
// PERMISSIONS (Granular resource-level permissions)
// ============================================================================

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Permission target
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Polymorphic resource reference
    resourceType: varchar('resource_type', { length: 50 }).notNull(), // collection, space, page
    resourceId: uuid('resource_id').notNull(),

    // Permission level
    role: userRoleEnum('role').notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userResourceIdx: uniqueIndex('permissions_user_resource_idx').on(
      table.userId,
      table.resourceType,
      table.resourceId
    ),
    resourceIdx: index('permissions_resource_idx').on(table.resourceType, table.resourceId),
    userIdIdx: index('permissions_user_id_idx').on(table.userId),
  })
);

// ============================================================================
// RELATIONS
// ============================================================================

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invitations: many(organizationInvitations),
  collections: many(collections),
  auditLogs: many(auditLogs),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [organizationMembers.invitedBy],
    references: [users.id],
  }),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationInvitations.organizationId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [organizationInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  user: one(users, {
    fields: [permissions.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
