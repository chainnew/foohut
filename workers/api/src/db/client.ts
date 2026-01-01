// ============================================================================
// foohut.com D1 Database Client
// Drizzle ORM client for Cloudflare D1
// ============================================================================

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Create a Drizzle database instance from a D1 binding
 * @param d1 - D1Database binding from Cloudflare Workers env
 * @returns Drizzle database instance with schema
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

/**
 * Type for the Drizzle database instance
 */
export type DrizzleDb = ReturnType<typeof createDb>;

/**
 * Re-export schema for convenience
 */
export { schema };

/**
 * Re-export all types from schema
 */
export type {
  User,
  NewUser,
  Session,
  NewSession,
  Account,
  NewAccount,
  VerificationToken,
  NewVerificationToken,
  Organization,
  NewOrganization,
  OrganizationMember,
  NewOrganizationMember,
  OrganizationInvitation,
  NewOrganizationInvitation,
  Permission,
  NewPermission,
  Collection,
  NewCollection,
  Space,
  NewSpace,
  Page,
  NewPage,
  Block,
  NewBlock,
  PageVersion,
  NewPageVersion,
  AiConversation,
  NewAiConversation,
  AiMessage,
  NewAiMessage,
  UserRole,
  PublishMode,
  BlockType,
  MessageRole,
} from './schema';

/**
 * Re-export enum value arrays for validation
 */
export {
  USER_ROLES,
  PUBLISH_MODES,
  BLOCK_TYPES,
  MESSAGE_ROLES,
} from './schema';
