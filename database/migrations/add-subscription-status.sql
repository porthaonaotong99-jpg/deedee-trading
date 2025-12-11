-- Migration: Add subscription status tracking to customer_services
-- Date: 2025-12-10
-- Description: Adds status enum field for better subscription lifecycle management

-- Step 1: Create the subscription_status enum type
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'pending',
        'active', 
        'expired',
        'cancelled',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add status column with default 'pending'
ALTER TABLE customer_services 
ADD COLUMN IF NOT EXISTS status subscription_status DEFAULT 'pending';

-- Step 3: Set initial status values based on existing data
-- Active services with no expiry or future expiry -> 'active'
UPDATE customer_services 
SET status = 'active' 
WHERE active = true 
  AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW());

-- Active services with past expiry -> 'expired' (and deactivate them)
UPDATE customer_services 
SET status = 'expired', 
    active = false 
WHERE active = true 
  AND subscription_expires_at IS NOT NULL 
  AND subscription_expires_at <= NOW();

-- Inactive services with past expiry -> 'expired'
UPDATE customer_services 
SET status = 'expired' 
WHERE active = false 
  AND subscription_expires_at IS NOT NULL 
  AND subscription_expires_at <= NOW();

-- Inactive services without expiry or future expiry -> 'pending'
UPDATE customer_services 
SET status = 'pending' 
WHERE active = false 
  AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW());

-- Step 4: Add index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_customer_services_status 
ON customer_services(status);

CREATE INDEX IF NOT EXISTS idx_customer_services_expires_at 
ON customer_services(subscription_expires_at) 
WHERE subscription_expires_at IS NOT NULL;

-- Step 5: Add comments
COMMENT ON COLUMN customer_services.status IS 'Subscription lifecycle status: pending (awaiting payment/approval), active (currently valid), expired (past expiry date), cancelled (manually terminated), suspended (temporarily disabled)';

-- Migration verification query (run separately to verify):
-- SELECT 
--     status,
--     active,
--     COUNT(*) as count,
--     COUNT(CASE WHEN subscription_expires_at IS NOT NULL THEN 1 END) as with_expiry,
--     COUNT(CASE WHEN subscription_expires_at <= NOW() THEN 1 END) as past_expiry
-- FROM customer_services 
-- GROUP BY status, active 
-- ORDER BY status, active;
