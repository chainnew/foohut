-- =============================================================================
-- Foohut Database Initialization Script
-- =============================================================================
-- This script runs automatically when PostgreSQL container is first created.
-- It sets up extensions, creates schemas, and configures initial settings.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS foohut;

-- Set default search path
ALTER DATABASE foohut SET search_path TO foohut, public;

-- Create application role for backend
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'foohut_app') THEN
        CREATE ROLE foohut_app WITH LOGIN PASSWORD 'foohut_app_password';
    END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA foohut TO foohut_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA foohut TO foohut_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA foohut TO foohut_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA foohut GRANT ALL ON TABLES TO foohut_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA foohut GRANT ALL ON SEQUENCES TO foohut_app;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Foohut database initialized successfully';
END
$$;
