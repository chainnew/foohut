-- Add username column to users table
ALTER TABLE users ADD COLUMN username TEXT;

-- Create unique index for username (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL AND deleted_at IS NULL;
