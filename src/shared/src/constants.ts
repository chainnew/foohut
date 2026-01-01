// Application Constants

export const APP_NAME = 'foohut';
export const APP_DESCRIPTION = 'AI-native documentation and knowledge management platform';

// API Configuration
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Rate Limits
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;

// Auth
export const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
export const SESSION_COOKIE_NAME = 'foohut_session';

// AI Configuration
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export const MAX_CONTEXT_TOKENS = 8000;
export const MIN_SIMILARITY_SCORE = 0.65;
export const MAX_SEARCH_RESULTS = 10;

// Content Limits
export const MAX_PAGE_TITLE_LENGTH = 255;
export const MAX_PAGE_DESCRIPTION_LENGTH = 500;
export const MAX_SLUG_LENGTH = 100;
export const MAX_BLOCKS_PER_PAGE = 500;
export const MAX_NESTING_DEPTH = 10;

// Git Sync
export const GIT_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const GIT_WEBHOOK_SECRET_LENGTH = 32;

// File Upload
export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

// Performance Targets (from scope)
export const PERFORMANCE_TARGETS = {
  pageLoadP95: 2000, // 2 seconds
  searchResponse: 500, // 500ms
  aiAssistantResponse: 3000, // 3 seconds
  gitSyncLatency: 30000, // 30 seconds
  buildTime1000Pages: 300000, // 5 minutes
} as const;

// Role Permissions Matrix
export const ROLE_PERMISSIONS = {
  admin: ['*'],
  creator: [
    'space:create',
    'space:edit',
    'space:delete',
    'space:publish',
    'page:create',
    'page:edit',
    'page:delete',
    'page:publish',
    'git:configure',
    'member:invite',
  ],
  editor: ['page:create', 'page:edit', 'change_request:create', 'change_request:submit', 'comment:create'],
  commenter: ['comment:create', 'comment:edit_own'],
  visitor: ['page:read', 'search:use'],
} as const;

// Block Type Configuration
export const BLOCK_CONFIG = {
  paragraph: { maxLength: 10000, allowNesting: false },
  heading: { levels: [1, 2, 3, 4, 5, 6], maxLength: 500 },
  code: { maxLength: 50000, supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'sql', 'bash', 'json', 'yaml', 'markdown'] },
  blockquote: { maxLength: 5000, allowNesting: true },
  list: { maxItems: 100, maxNesting: 5 },
  table: { maxRows: 100, maxColumns: 20 },
  image: { maxSizeMB: 10 },
  video: { maxSizeMB: 100 },
  hint: { types: ['info', 'warning', 'danger', 'success'] },
  math: { maxLength: 2000 },
} as const;
