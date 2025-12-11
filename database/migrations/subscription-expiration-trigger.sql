-- Database Trigger: Auto-update subscription status on expiration
-- This trigger automatically sets status to 'expired' and active to false
-- when subscription_expires_at is reached

-- Function to check and update expired subscriptions
CREATE OR REPLACE FUNCTION check_subscription_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- If subscription_expires_at is set and in the past, mark as expired
    IF NEW.subscription_expires_at IS NOT NULL 
       AND NEW.subscription_expires_at <= NOW() 
       AND NEW.status != 'expired' 
       AND NEW.status != 'cancelled' THEN
        NEW.status := 'expired';
        NEW.active := false;
    END IF;
    
    -- If subscription_expires_at is in the future and status is expired, reactivate
    IF NEW.subscription_expires_at IS NOT NULL 
       AND NEW.subscription_expires_at > NOW() 
       AND NEW.status = 'expired' THEN
        NEW.status := 'active';
        NEW.active := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT
DROP TRIGGER IF EXISTS trigger_check_subscription_expiration_insert ON customer_services;
CREATE TRIGGER trigger_check_subscription_expiration_insert
    BEFORE INSERT ON customer_services
    FOR EACH ROW
    EXECUTE FUNCTION check_subscription_expiration();

-- Trigger on UPDATE
DROP TRIGGER IF EXISTS trigger_check_subscription_expiration_update ON customer_services;
CREATE TRIGGER trigger_check_subscription_expiration_update
    BEFORE UPDATE ON customer_services
    FOR EACH ROW
    WHEN (
        NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
        OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.active IS DISTINCT FROM OLD.active
    )
    EXECUTE FUNCTION check_subscription_expiration();

-- Scheduled job function to batch-update expired subscriptions
-- This can be called by a cron job or scheduler
CREATE OR REPLACE FUNCTION batch_expire_subscriptions()
RETURNS TABLE(
    updated_count INTEGER,
    service_ids TEXT[]
) AS $$
DECLARE
    v_count INTEGER;
    v_ids TEXT[];
BEGIN
    -- Update all subscriptions that should be expired
    WITH updated AS (
        UPDATE customer_services
        SET 
            status = 'expired',
            active = false
        WHERE 
            subscription_expires_at IS NOT NULL
            AND subscription_expires_at <= NOW()
            AND status NOT IN ('expired', 'cancelled')
        RETURNING id
    )
    SELECT 
        COUNT(*)::INTEGER,
        ARRAY_AGG(id::TEXT)
    INTO v_count, v_ids
    FROM updated;
    
    updated_count := COALESCE(v_count, 0);
    service_ids := COALESCE(v_ids, ARRAY[]::TEXT[]);
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Manual execution example:
-- SELECT * FROM batch_expire_subscriptions();

-- To setup a PostgreSQL cron job (requires pg_cron extension):
-- SELECT cron.schedule(
--     'expire-subscriptions-hourly',
--     '0 * * * *',  -- Every hour at minute 0
--     'SELECT batch_expire_subscriptions();'
-- );

COMMENT ON FUNCTION check_subscription_expiration() IS 'Trigger function that automatically marks subscriptions as expired when subscription_expires_at is reached';
COMMENT ON FUNCTION batch_expire_subscriptions() IS 'Batch function to expire all subscriptions that have passed their expiration date. Returns count and IDs of updated records.';
