-- Migration: Create Settings Tables
-- This migration creates tables for user notification settings and system settings

-- Create user_settings table for storing user-specific notification preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notify_new_customers BOOLEAN NOT NULL DEFAULT true,
    notify_payments BOOLEAN NOT NULL DEFAULT true,
    notify_investments BOOLEAN NOT NULL DEFAULT true,
    notify_stock_activity BOOLEAN NOT NULL DEFAULT true,
    notify_system_alerts BOOLEAN NOT NULL DEFAULT true,
    notify_email BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Create system_settings table for storing application-wide configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'string',
    category VARCHAR(100),
    description VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Create trigger to update updated_at on user_settings
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Create trigger to update updated_at on system_settings
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default system settings
INSERT INTO system_settings (key, value, type, category, description, is_public)
VALUES 
    ('maintenance_mode', 'false', 'boolean', 'system', 'Enable/disable maintenance mode', true),
    ('backup_frequency', 'daily', 'string', 'system', 'Auto backup frequency: daily, weekly, monthly', false),
    ('api_rate_limit', '100', 'number', 'api', 'API rate limit per minute', false)
ON CONFLICT (key) DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON user_settings TO your_app_user;
-- GRANT ALL PRIVILEGES ON system_settings TO your_app_user;

COMMENT ON TABLE user_settings IS 'Stores user-specific notification and preference settings';
COMMENT ON TABLE system_settings IS 'Stores application-wide configuration settings';
