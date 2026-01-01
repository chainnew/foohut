// ============================================================================
// foohut.com Drizzle Schema - Index
// Central export for all schema definitions
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export {
  userRoleEnum,
  publishModeEnum,
  changeRequestStatusEnum,
  syncStatusEnum,
  blockTypeEnum,
  auditActionEnum,
  gitProviderEnum,
  specFormatEnum,
  embeddingModelEnum,
} from './enums';

// ============================================================================
// AUTH TABLES
// ============================================================================

export {
  users,
  sessions,
  accounts,
  verificationTokens,
  usersRelations,
  sessionsRelations,
  accountsRelations,
} from './auth';

export type {
  User,
  NewUser,
  Session,
  NewSession,
  Account,
  NewAccount,
  VerificationToken,
  NewVerificationToken,
} from './auth';

// ============================================================================
// ORGANIZATION TABLES
// ============================================================================

export {
  organizations,
  organizationMembers,
  organizationInvitations,
  permissions,
  organizationsRelations,
  organizationMembersRelations,
  organizationInvitationsRelations,
  permissionsRelations,
} from './organizations';

export type {
  Organization,
  NewOrganization,
  OrganizationMember,
  NewOrganizationMember,
  OrganizationInvitation,
  NewOrganizationInvitation,
  Permission,
  NewPermission,
} from './organizations';

// ============================================================================
// CONTENT TABLES
// ============================================================================

export {
  collections,
  spaces,
  pages,
  blocks,
  pageVersions,
  collectionsRelations,
  spacesRelations,
  pagesRelations,
  blocksRelations,
  pageVersionsRelations,
} from './content';

export type {
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
} from './content';

// ============================================================================
// COLLABORATION TABLES
// ============================================================================

export {
  changeRequests,
  changeRequestChanges,
  changeRequestComments,
  reviews,
  changeRequestsRelations,
  changeRequestChangesRelations,
  changeRequestCommentsRelations,
  reviewsRelations,
} from './collaboration';

export type {
  ChangeRequest,
  NewChangeRequest,
  ChangeRequestChange,
  NewChangeRequestChange,
  ChangeRequestComment,
  NewChangeRequestComment,
  Review,
  NewReview,
} from './collaboration';

// ============================================================================
// GIT TABLES
// ============================================================================

export {
  gitSyncConfigs,
  gitCommits,
  gitBranches,
  syncHistory,
  gitSyncConfigsRelations,
  gitCommitsRelations,
  gitBranchesRelations,
  syncHistoryRelations,
} from './git';

export type {
  GitSyncConfig,
  NewGitSyncConfig,
  GitCommit,
  NewGitCommit,
  GitBranch,
  NewGitBranch,
  SyncHistoryEntry,
  NewSyncHistoryEntry,
} from './git';

// ============================================================================
// AI TABLES
// ============================================================================

export {
  embeddings,
  searchIndex,
  searchQueries,
  aiConversations,
  aiMessages,
  searchIndexRelations,
  searchQueriesRelations,
  aiConversationsRelations,
  aiMessagesRelations,
} from './ai';

export type {
  Embedding,
  NewEmbedding,
  SearchIndexEntry,
  NewSearchIndexEntry,
  SearchQuery,
  NewSearchQuery,
  AIConversation,
  NewAIConversation,
  AIMessage,
  NewAIMessage,
} from './ai';

// ============================================================================
// AUDIT TABLES
// ============================================================================

export {
  auditLogs,
  apiSpecifications,
  customDomains,
  auditLogsRelations,
} from './audit';

export type {
  AuditLog,
  NewAuditLog,
  ApiSpecification,
  NewApiSpecification,
  CustomDomain,
  NewCustomDomain,
} from './audit';
