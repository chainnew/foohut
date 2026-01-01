// ============================================================================
// foohut.com Drizzle Configuration
// Database connection and migration settings
// ============================================================================

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Validate required environment variable
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export default {
  // Schema location
  schema: './db/schema/index.ts',

  // Output directory for migrations
  out: './db/migrations',

  // Database driver
  dialect: 'postgresql',

  // Database connection
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Additional options
  verbose: true,
  strict: true,

  // Table filters (include all tables)
  tablesFilter: ['*'],

  // Extensions to enable
  extensionsFilters: ['postgis'],

} satisfies Config;
