/**
 * foohut.com Backend API Server
 * AI-native documentation and knowledge management platform
 */

import pino from 'pino';
import { config } from './config/index.js';
import { createApp } from './app.js';
import { testConnection, closeConnection } from './config/database.js';

// Initialize logger (exported for use by other modules)
export const logger = pino({
  level: config.logLevel,
  transport: config.isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// Create Express app
const app = createApp();

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal');

  // Close database connection
  await closeConnection();

  logger.info('Server shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start server
async function start(): Promise<void> {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed - starting in degraded mode');
    }

    // Start listening
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(
        {
          port: PORT,
          env: config.env,
          nodeVersion: process.version,
        },
        'foohut API server started'
      );
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
start();

export default app;
