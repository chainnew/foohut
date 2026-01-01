/**
 * Application configuration
 * Loads from environment variables with sensible defaults
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

// Configuration schema with validation
const configSchema = z.object({
  // Server
  env: z.enum(['development', 'staging', 'production']).default('development'),
  port: z.coerce.number().default(3001),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  databaseUrl: z.string().url(),
  redisUrl: z.string().url().optional(),

  // Auth
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('15m'),
  jwtRefreshExpiresIn: z.string().default('7d'),

  // CORS
  corsOrigins: z.string().transform((s) => s.split(',')),

  // AI/LLM - Multiple Provider Support
  // OpenAI
  openaiApiKey: z.string().optional(),
  openaiBaseUrl: z.string().url().optional(),

  // Anthropic
  anthropicApiKey: z.string().optional(),
  anthropicBaseUrl: z.string().url().optional(),

  // OpenRouter (unified access to 100+ models)
  openrouterApiKey: z.string().optional(),
  openrouterBaseUrl: z.string().url().optional(),

  // Default AI settings
  defaultLlmProvider: z.enum(['openai', 'anthropic', 'openrouter']).default('openrouter'),
  defaultLlmModel: z.string().default('anthropic/claude-3-opus'),
  embeddingModel: z.string().default('text-embedding-3-small'),
  embeddingDimensions: z.coerce.number().default(1536),

  // App URL for OpenRouter referrer
  appUrl: z.string().url().default('https://foohut.com'),

  // GitHub
  githubAppId: z.string().optional(),
  githubPrivateKey: z.string().optional(),
  githubWebhookSecret: z.string().optional(),

  // Storage
  s3Bucket: z.string().optional(),
  s3Region: z.string().default('us-east-1'),
});

// Parse and validate config
const parseConfig = () => {
  const result = configSchema.safeParse({
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    logLevel: process.env.LOG_LEVEL,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/foohut',
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production-min-32-chars',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173',
    // OpenAI
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,

    // Anthropic
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,

    // OpenRouter
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterBaseUrl: process.env.OPENROUTER_BASE_URL,

    // Default AI settings
    defaultLlmProvider: process.env.DEFAULT_LLM_PROVIDER,
    defaultLlmModel: process.env.DEFAULT_LLM_MODEL,
    embeddingModel: process.env.EMBEDDING_MODEL,
    embeddingDimensions: process.env.EMBEDDING_DIMENSIONS,
    appUrl: process.env.APP_URL,
    githubAppId: process.env.GITHUB_APP_ID,
    githubPrivateKey: process.env.GITHUB_PRIVATE_KEY,
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    s3Bucket: process.env.S3_BUCKET,
    s3Region: process.env.S3_REGION,
  });

  if (!result.success) {
    console.error('❌ Invalid configuration:', result.error.format());
    process.exit(1);
  }

  return result.data;
};

const parsedConfig = parseConfig();

export const config = {
  ...parsedConfig,
  isDev: parsedConfig.env === 'development',
  isProd: parsedConfig.env === 'production',
};

export type Config = typeof config;
