-- Migration: Add Two-Factor Authentication columns to users table
-- Date: 2024

-- Add 2FA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret key for generating 2FA codes';
COMMENT ON COLUMN users.two_factor_backup_codes IS 'Comma-separated hashed backup codes for recovery';

-- Create index for 2FA queries
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users(two_factor_enabled);
