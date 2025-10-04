# Customer Service Subscription Enhancement Migration

This document outlines the database schema changes needed to support the new subscription system for premium membership services.

## Schema Changes

### customer_services table modifications

```sql
-- Add subscription and payment related columns
ALTER TABLE customer_services 
ADD COLUMN requires_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN subscription_duration INTEGER NULL COMMENT 'Subscription duration in months (3, 6, or 12)',
ADD COLUMN subscription_expires_at TIMESTAMP NULL COMMENT 'When the subscription expires',
ADD COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending' COMMENT 'Payment status for subscription services',
ADD COLUMN subscription_fee DECIMAL(10,2) NULL COMMENT 'Subscription fee amount';

-- Add indexes for better query performance
CREATE INDEX idx_customer_services_expires_at ON customer_services(subscription_expires_at);
CREATE INDEX idx_customer_services_payment_status ON customer_services(payment_status);
CREATE INDEX idx_customer_services_subscription ON customer_services(subscription_duration, subscription_expires_at);
```

## Migration Steps

1. **Backup Database**: Always backup your database before running migrations
2. **Apply Schema Changes**: Run the ALTER TABLE statements above
3. **Update Existing Records**: Set appropriate defaults for existing services
4. **Verify Indexes**: Ensure indexes are created for performance

## Data Migration

### Update existing premium_membership records (if any)
```sql
-- Set existing premium memberships to require payment (if any exist)
UPDATE customer_services 
SET requires_payment = TRUE 
WHERE service_type = 'premium_membership';

-- Set existing premium_stock_picks to not require payment
UPDATE customer_services 
SET requires_payment = FALSE,
    payment_status = 'paid'
WHERE service_type = 'premium_stock_picks';
```

## Rollback Plan

If you need to rollback these changes:

```sql
-- Remove the new columns (WARNING: This will lose subscription data)
ALTER TABLE customer_services 
DROP COLUMN requires_payment,
DROP COLUMN subscription_duration,
DROP COLUMN subscription_expires_at,
DROP COLUMN payment_status,
DROP COLUMN subscription_fee;

-- Drop the indexes
DROP INDEX idx_customer_services_expires_at;
DROP INDEX idx_customer_services_payment_status;
DROP INDEX idx_customer_services_subscription;
```

## Post-Migration Verification

After applying the migration, verify:

1. **Schema Changes Applied**: Check that all columns exist with correct types
2. **Indexes Created**: Verify performance indexes are in place
3. **Application Compatibility**: Test that the application starts and functions correctly
4. **Data Integrity**: Ensure existing data is preserved and new defaults are applied

## Notes

- The `subscription_duration` uses integer values (3, 6, 12) for months
- The `payment_status` enum matches the PaymentStatus enum in the code
- All new columns are nullable to maintain compatibility with existing records
- Indexes are added to support common query patterns for subscription management

## Next Steps

1. Run the migration on development environment first
2. Test all subscription-related functionality
3. Verify performance with the new indexes
4. Apply to staging and production environments
5. Monitor for any issues after deployment