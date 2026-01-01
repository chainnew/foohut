/**
 * Foohut.com Frontend Type Definitions
 * AI-Native Documentation Platform
 *
 * Core TypeScript interfaces for the entire frontend application
 */

// =============================================================================
// BASE TYPES
// =============================================================================

/** UUID type for all entity identifiers */
export type UUID = string;

/** ISO 8601 timestamp string */
export type Timestamp = string;

/** Markdown content string */
export type MarkdownContent = string;

/** JSON content for TipTap editor */
export type JSONContent = Record<string, unknown>;

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

export interface User {
  id: UUID;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  emailVerified: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  editorMode: 'markdown' | 'visual';
  aiAssistantEnabled: boolean;
  keyboardShortcuts: boolean;
  language: string;
  timezone: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// =============================================================================
// ORGANIZATION
// =============================================================================

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: UUID;
  settings: OrganizationSettings;
  subscription: SubscriptionTier;
}

export interface OrganizationSettings {
  defaultVisibility: ContentVisibility;
  ssoEnabled: boolean;
  ssoProvider: SSOProvider | null;
  customDomain: string | null;
  branding: BrandingConfig;
  aiFeatures: AIFeaturesConfig;
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string | null;
  customCss: string | null;
}

export interface AIFeaturesConfig {
  assistantEnabled: boolean;
  autoTranslation: boolean;
  contentSuggestions: boolean;
  qualityAssurance: boolean;
}

export type SubscriptionTier = 'free' | 'team' | 'business' | 'enterprise';

export type SSOProvider = 'okta' | 'azure_ad' | 'auth0' | 'saml_generic';

// =============================================================================
// ORGANIZATION MEMBERSHIP
// =============================================================================

export interface OrganizationMember {
  id: UUID;
  userId: UUID;
  organizationId: UUID;
  role: OrganizationRole;
  user: User;
  joinedAt: Timestamp;
  invitedBy: UUID | null;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface OrganizationInvite {
  id: UUID;
  email: string;
  organizationId: UUID;
  role: OrganizationRole;
  invitedBy: UUID;
  expiresAt: Timestamp;
  status: 'pending' | 'accepted' | 'expired';
}

// =============================================================================
// COLLECTION
// =============================================================================

export interface Collection {
  id: UUID;
  organizationId: UUID;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  visibility: ContentVisibility;
  order: number;
  spaces: Space[];
}

export interface CollectionSummary {
  id: UUID;
  name: string;
  slug: string;
  iconUrl: string | null;
  spaceCount: number;
}

// =============================================================================
// SPACE
// =============================================================================

export interface Space {
  id: UUID;
  collectionId: UUID;
  organizationId: UUID;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  visibility: ContentVisibility;
  gitConfig: GitConfig | null;
  settings: SpaceSettings;
  rootPageId: UUID | null;
  variants: SpaceVariant[];
}

export interface SpaceSettings {
  defaultBranch: string;
  customDomain: string | null;
  allowComments: boolean;
  requireChangeRequests: boolean;
  autoTranslate: boolean;
  targetLanguages: string[];
  seoConfig: SEOConfig;
}

export interface SEOConfig {
  canonicalUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  noIndex: boolean;
}

export interface SpaceVariant {
  id: UUID;
  spaceId: UUID;
  name: string;
  slug: string;
  branch: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

export interface SpaceSummary {
  id: UUID;
  name: string;
  slug: string;
  iconUrl: string | null;
  pageCount: number;
  lastUpdated: Timestamp;
}

// =============================================================================
// GIT CONFIGURATION
// =============================================================================

export interface GitConfig {
  id: UUID;
  spaceId: UUID;
  provider: GitProvider;
  repositoryUrl: string;
  branch: string;
  rootPath: string;
  syncEnabled: boolean;
  lastSyncAt: Timestamp | null;
  lastSyncStatus: GitSyncStatus;
  webhookSecret: string | null;
  accessToken: string | null; // Encrypted
}

export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

export type GitSyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

export interface GitSyncEvent {
  id: UUID;
  spaceId: UUID;
  direction: 'push' | 'pull';
  status: GitSyncStatus;
  commitSha: string | null;
  message: string | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface GitConflict {
  id: UUID;
  spaceId: UUID;
  pageId: UUID;
  localContent: string;
  remoteContent: string;
  baseContent: string | null;
  status: 'unresolved' | 'resolved';
  resolution: 'local' | 'remote' | 'merged' | null;
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
}

// =============================================================================
// PAGE
// =============================================================================

export interface Page {
  id: UUID;
  spaceId: UUID;
  parentId: UUID | null;
  title: string;
  slug: string;
  path: string; // Full path including ancestors
  content: PageContent;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null;
  createdBy: UUID;
  lastEditedBy: UUID;
  order: number;
  isPublished: boolean;
  emoji: string | null;
  coverImageUrl: string | null;
  metadata: PageMetadata;
  children: PageTreeNode[];
}

export interface PageContent {
  /** TipTap JSON document */
  json: JSONContent;
  /** Rendered Markdown for Git sync */
  markdown: MarkdownContent;
  /** Plain text for search indexing */
  plainText: string;
  /** Content version for conflict detection */
  version: number;
}

export interface PageMetadata {
  description: string | null;
  tags: string[];
  readingTime: number; // minutes
  wordCount: number;
  aiSummary: string | null;
  lastAIAnalysis: Timestamp | null;
}

export interface PageTreeNode {
  id: UUID;
  title: string;
  slug: string;
  path: string;
  emoji: string | null;
  order: number;
  hasChildren: boolean;
  children: PageTreeNode[];
}

export interface PageSummary {
  id: UUID;
  title: string;
  slug: string;
  path: string;
  emoji: string | null;
  lastUpdated: Timestamp;
}

// =============================================================================
// BLOCK TYPES (TipTap)
// =============================================================================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'listItem'
  | 'taskList'
  | 'taskItem'
  | 'codeBlock'
  | 'blockquote'
  | 'table'
  | 'image'
  | 'video'
  | 'embed'
  | 'callout'
  | 'divider'
  | 'math'
  | 'apiBlock'
  | 'reusableBlock'
  | 'aiPrompt';

export interface Block {
  id: UUID;
  type: BlockType;
  content: JSONContent;
  attrs?: BlockAttributes;
}

export interface BlockAttributes {
  level?: 1 | 2 | 3 | 4 | 5 | 6; // For headings
  language?: string; // For code blocks
  src?: string; // For media
  alt?: string;
  caption?: string;
  variant?: CalloutVariant; // For callouts
  collapsed?: boolean;
}

export type CalloutVariant = 'info' | 'warning' | 'danger' | 'success' | 'tip';

export interface ReusableBlock {
  id: UUID;
  organizationId: UUID;
  name: string;
  content: JSONContent;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  usageCount: number;
}

// =============================================================================
// CHANGE REQUESTS
// =============================================================================

export interface ChangeRequest {
  id: UUID;
  spaceId: UUID;
  title: string;
  description: string | null;
  status: ChangeRequestStatus;
  createdBy: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  mergedAt: Timestamp | null;
  mergedBy: UUID | null;
  sourceBranch: string;
  targetBranch: string;
  changes: PageChange[];
  comments: ChangeRequestComment[];
  reviewers: ChangeRequestReviewer[];
}

export type ChangeRequestStatus = 'draft' | 'open' | 'approved' | 'merged' | 'closed';

export interface PageChange {
  id: UUID;
  changeRequestId: UUID;
  pageId: UUID;
  changeType: 'added' | 'modified' | 'deleted';
  originalContent: JSONContent | null;
  newContent: JSONContent | null;
  diff: string | null; // Unified diff format
}

export interface ChangeRequestComment {
  id: UUID;
  changeRequestId: UUID;
  pageId: UUID | null; // Null for general comments
  blockId: UUID | null; // For inline comments
  authorId: UUID;
  author: User;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
  resolvedBy: UUID | null;
}

export interface ChangeRequestReviewer {
  id: UUID;
  changeRequestId: UUID;
  userId: UUID;
  user: User;
  status: 'pending' | 'approved' | 'changes_requested';
  reviewedAt: Timestamp | null;
}

// =============================================================================
// ACCESS CONTROL
// =============================================================================

export type ContentVisibility = 'public' | 'private' | 'unlisted' | 'authenticated';

export interface SpaceMember {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  user: User;
  role: SpaceRole;
  addedAt: Timestamp;
  addedBy: UUID;
}

export type SpaceRole = 'admin' | 'creator' | 'editor' | 'commenter' | 'viewer';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'admin';
  granted: boolean;
}

// =============================================================================
// AI FEATURES
// =============================================================================

export interface AIAssistantMessage {
  id: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  sources?: AISource[];
  metadata?: AIMessageMetadata;
}

export interface AISource {
  pageId: UUID;
  pageTitle: string;
  pagePath: string;
  relevanceScore: number;
  excerpt: string;
}

export interface AIMessageMetadata {
  model: string;
  tokenCount: number;
  processingTime: number;
  confidence: number;
}

export interface AIAssistantSession {
  id: UUID;
  spaceId: UUID;
  userId: UUID;
  messages: AIAssistantMessage[];
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  context: AISessionContext;
}

export interface AISessionContext {
  currentPageId: UUID | null;
  selectedText: string | null;
  searchScope: 'page' | 'space' | 'collection' | 'organization';
}

export interface AISuggestion {
  id: UUID;
  type: AISuggestionType;
  content: string;
  explanation: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  pageId: UUID;
  blockId: UUID | null;
  createdAt: Timestamp;
}

export type AISuggestionType =
  | 'grammar'
  | 'spelling'
  | 'style'
  | 'clarity'
  | 'link_fix'
  | 'outdated_content'
  | 'terminology'
  | 'expansion'
  | 'summary';

export interface AIContentGeneration {
  id: UUID;
  prompt: string;
  generatedContent: JSONContent;
  pageId: UUID;
  status: 'generating' | 'completed' | 'failed';
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

// =============================================================================
// SEARCH
// =============================================================================

export interface SearchQuery {
  query: string;
  scope: 'page' | 'space' | 'collection' | 'organization' | 'global';
  scopeId?: UUID;
  filters?: SearchFilters;
  pagination?: PaginationParams;
}

export interface SearchFilters {
  types?: ('page' | 'api' | 'media')[];
  tags?: string[];
  authors?: UUID[];
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };
}

export interface SearchResult {
  id: UUID;
  type: 'page' | 'api' | 'media';
  title: string;
  path: string;
  excerpt: string;
  highlights: string[];
  relevanceScore: number;
  space: SpaceSummary;
  lastUpdated: Timestamp;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  query: string;
  processingTime: number;
  aiSummary?: string;
}

// =============================================================================
// API DOCUMENTATION (OpenAPI)
// =============================================================================

export interface APISpec {
  id: UUID;
  spaceId: UUID;
  name: string;
  version: string;
  format: 'openapi3' | 'openapi31' | 'swagger2';
  source: 'file' | 'url';
  sourceUrl: string | null;
  content: JSONContent; // Parsed OpenAPI spec
  lastFetched: Timestamp | null;
  refreshInterval: number | null; // minutes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface APIEndpoint {
  id: UUID;
  specId: UUID;
  path: string;
  method: HTTPMethod;
  summary: string | null;
  description: string | null;
  operationId: string | null;
  tags: string[];
  parameters: APIParameter[];
  requestBody: APIRequestBody | null;
  responses: APIResponse[];
  security: APISecurity[];
  deprecated: boolean;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description: string | null;
  schema: JSONContent;
  example: unknown;
}

export interface APIRequestBody {
  description: string | null;
  required: boolean;
  content: Record<string, APIMediaType>;
}

export interface APIMediaType {
  schema: JSONContent;
  example: unknown;
  examples: Record<string, APIExample>;
}

export interface APIExample {
  summary: string | null;
  description: string | null;
  value: unknown;
}

export interface APIResponse {
  statusCode: string;
  description: string;
  content: Record<string, APIMediaType>;
  headers: Record<string, APIParameter>;
}

export interface APISecurity {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  name: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  flows?: JSONContent;
}

// =============================================================================
// MEDIA & ASSETS
// =============================================================================

export interface MediaAsset {
  id: UUID;
  organizationId: UUID;
  name: string;
  mimeType: string;
  size: number; // bytes
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  uploadedBy: UUID;
  createdAt: Timestamp;
  metadata: MediaMetadata;
}

export interface MediaMetadata {
  alt: string | null;
  caption: string | null;
  credit: string | null;
  aiDescription: string | null;
}

// =============================================================================
// ACTIVITY & AUDIT
// =============================================================================

export interface Activity {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  user: User;
  action: ActivityAction;
  resourceType: 'organization' | 'collection' | 'space' | 'page' | 'change_request';
  resourceId: UUID;
  resourceName: string;
  metadata: JSONContent;
  createdAt: Timestamp;
}

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'published'
  | 'unpublished'
  | 'merged'
  | 'commented'
  | 'invited'
  | 'removed'
  | 'synced';

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export interface Notification {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Timestamp;
  metadata: JSONContent;
}

export type NotificationType =
  | 'mention'
  | 'comment'
  | 'change_request'
  | 'review_requested'
  | 'merge'
  | 'conflict'
  | 'ai_suggestion'
  | 'system';

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface SidebarState {
  isCollapsed: boolean;
  width: number;
  activeSection: 'navigation' | 'search' | 'ai';
  expandedItems: Set<UUID>;
}

export interface EditorState {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  selectedBlockId: UUID | null;
  selectionRange: { from: number; to: number } | null;
  isAIAssistantOpen: boolean;
  activeToolbar: 'block' | 'inline' | 'ai' | null;
}

export interface ModalState {
  type: ModalType | null;
  isOpen: boolean;
  props: Record<string, unknown>;
}

export type ModalType =
  | 'search'
  | 'ai_assistant'
  | 'settings'
  | 'share'
  | 'export'
  | 'import'
  | 'delete_confirm'
  | 'git_config'
  | 'create_page'
  | 'create_space';

// =============================================================================
// PAGINATION & COMMON TYPES
// =============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: APIError | null;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// REAL-TIME COLLABORATION
// =============================================================================

export interface CollaboratorPresence {
  userId: UUID;
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  pageId: UUID;
  cursor: CursorPosition | null;
  selection: SelectionRange | null;
  lastActive: Timestamp;
  color: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  blockId: UUID | null;
}

export interface SelectionRange {
  blockId: UUID;
  from: number;
  to: number;
}

export interface RealtimeEvent {
  type: 'cursor' | 'selection' | 'edit' | 'presence';
  userId: UUID;
  pageId: UUID;
  payload: JSONContent;
  timestamp: Timestamp;
}
