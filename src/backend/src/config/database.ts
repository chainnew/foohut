/**
 * Database configuration for foohut.com backend API
 * Uses Drizzle ORM with PostgreSQL
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './index.js';
import { logger } from '../index.js';

// PostgreSQL connection options
const connectionOptions = {
  max: config.isDev ? 10 : 50,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true,
};

// Create PostgreSQL client
export const sql = postgres(config.databaseUrl, connectionOptions);

// Create Drizzle instance
// Schema will be imported from db/schema once created by DB agent
export const db = drizzle(sql, {
  logger: config.isDev
    ? {
        logQuery: (query: string, params: unknown[]) => {
          logger.debug({ query, params }, 'Database query');
        },
      }
    : false,
});

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error({ error }, 'Database connection failed');
    return false;
  }
}

/**
 * Close database connection gracefully
 */
export async function closeConnection(): Promise<void> {
  try {
    await sql.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error({ error }, 'Error closing database connection');
  }
}

/**
 * Database health check
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await sql`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export type for use in services
export type Database = typeof db;
