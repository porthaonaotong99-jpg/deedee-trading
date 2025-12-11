# Subscription Status Management System

## Overview

This document describes the implementation of an automated subscription status management system for the `customer_services` table. The system tracks subscription lifecycle states and automatically expires subscriptions when they reach their expiration date.

## Status Enum

### `SubscriptionStatus`

```typescript
export enum SubscriptionStatus {
  PENDING = 'pending',      // Awaiting payment or approval
  ACTIVE = 'active',        // Currently valid subscription
  EXPIRED = 'expired',      // Past expiration date
  CANCELLED = 'cancelled',  // Manually terminated by admin/customer
  SUSPENDED = 'suspended',  // Temporarily disabled (payment issues, violations, etc.)
}
```

## Entity Changes

### Added Field

```typescript
@Column({
  type: 'enum',
  enum: SubscriptionStatus,
  default: SubscriptionStatus.PENDING,
  comment: 'Subscription lifecycle status',
})
status: SubscriptionStatus;
```

## Expiration Mechanisms

### 1. **Application-Level Scheduler** (Primary Method)

**File:** `src/modules/customers/services/subscription-scheduler.service.ts`

The NestJS cron scheduler runs every hour to check and expire subscriptions:

```typescript
@Cron(CronExpression.EVERY_HOUR)
async handleExpiredSubscriptions() {
  const result = await this.customersService.checkExpiredSubscriptions();
  // Logs expired subscriptions with customer details
}
```

**Updated Method:** `CustomersService.checkExpiredSubscriptions()`

Now performs:
- Finds subscriptions where `subscription_expires_at < NOW()`
- Updates `status` to `EXPIRED` and `active` to `false`
- Returns detailed information including customer emails
- Logs each expiration for audit trail

**Benefits:**
- ✅ Works with any database
- ✅ Full control and logging
- ✅ Can send notifications/emails
- ✅ Easy to test and debug

### 2. **Database-Level Triggers** (Automatic Enforcement)

**File:** `database/migrations/subscription-expiration-trigger.sql`

#### Trigger Function: `check_subscription_expiration()`

Automatically enforces expiration rules on INSERT/UPDATE:

```sql
-- Auto-expires if subscription_expires_at <= NOW()
IF NEW.subscription_expires_at <= NOW() 
   AND NEW.status NOT IN ('expired', 'cancelled') THEN
    NEW.status := 'expired';
    NEW.active := false;
END IF;

-- Auto-reactivates if expiry date is extended to future
IF NEW.subscription_expires_at > NOW() 
   AND NEW.status = 'expired' THEN
    NEW.status := 'active';
    NEW.active := true;
END IF;
```

**Benefits:**
- ✅ Immediate enforcement at database level
- ✅ Prevents invalid state combinations
- ✅ Works even if application is down
- ✅ No race conditions

#### Batch Function: `batch_expire_subscriptions()`

Can be called manually or by PostgreSQL cron:

```sql
SELECT * FROM batch_expire_subscriptions();
-- Returns: (updated_count, service_ids[])
```

**Setup PostgreSQL Cron (optional):**

```sql
-- Requires pg_cron extension
SELECT cron.schedule(
  'expire-subscriptions-hourly',
  '0 * * * *',  -- Every hour
  'SELECT batch_expire_subscriptions();'
);
```

## Migration Instructions

### Step 1: Run Migration SQL

```bash
psql -U postgres -d trading_db -f database/migrations/add-subscription-status.sql
```

This will:
1. Create `subscription_status` enum type
2. Add `status` column with default `'pending'`
3. Migrate existing data intelligently:
   - Active + future expiry → `'active'`
   - Active + past expiry → `'expired'` (and deactivate)
   - Inactive + past expiry → `'expired'`
   - Inactive + no/future expiry → `'pending'`
4. Add indexes for performance
5. Add column comments

### Step 2: Install Triggers (Optional but Recommended)

```bash
psql -U postgres -d trading_db -f database/migrations/subscription-expiration-trigger.sql
```

### Step 3: Restart Application

The application will automatically:
- Load the new `SubscriptionStatus` enum
- Use the enhanced `checkExpiredSubscriptions()` method
- Run hourly expiration checks via scheduler

### Step 4: Verify Migration

```sql
-- Check status distribution
SELECT 
    status,
    active,
    COUNT(*) as count,
    COUNT(CASE WHEN subscription_expires_at IS NOT NULL THEN 1 END) as with_expiry,
    COUNT(CASE WHEN subscription_expires_at <= NOW() THEN 1 END) as past_expiry
FROM customer_services 
GROUP BY status, active 
ORDER BY status, active;

-- Test trigger manually
UPDATE customer_services 
SET subscription_expires_at = NOW() - INTERVAL '1 day' 
WHERE id = 'test-service-id';

-- Verify it auto-expired
SELECT id, status, active, subscription_expires_at 
FROM customer_services 
WHERE id = 'test-service-id';
```

## Usage Examples

### Check Current Subscription Status

```typescript
const service = await customerServiceRepo.findOne({
  where: { 
    customer_id: customerId,
    service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
  }
});

if (service.status === SubscriptionStatus.ACTIVE) {
  // Allow access
} else if (service.status === SubscriptionStatus.EXPIRED) {
  // Show renewal prompt
} else if (service.status === SubscriptionStatus.PENDING) {
  // Show payment pending message
}
```

### Query Only Active Subscriptions

```typescript
const activeServices = await customerServiceRepo.find({
  where: {
    customer_id: customerId,
    status: SubscriptionStatus.ACTIVE,
    subscription_expires_at: MoreThan(new Date()), // Extra safety
  }
});
```

### Manually Expire a Subscription

```typescript
await customerServiceRepo.update(serviceId, {
  status: SubscriptionStatus.EXPIRED,
  active: false,
});
```

### Cancel a Subscription

```typescript
await customerServiceRepo.update(serviceId, {
  status: SubscriptionStatus.CANCELLED,
  active: false,
});
```

### Extend/Renew a Subscription

```typescript
const newExpiryDate = new Date();
newExpiryDate.setMonth(newExpiryDate.getMonth() + 3); // +3 months

await customerServiceRepo.update(serviceId, {
  subscription_expires_at: newExpiryDate,
  status: SubscriptionStatus.ACTIVE,
  active: true,
});
```

## Scheduler Configuration

The scheduler runs every hour by default. To change:

**File:** `src/modules/customers/services/subscription-scheduler.service.ts`

```typescript
// Change from EVERY_HOUR to custom cron
@Cron('0 */2 * * *') // Every 2 hours
// @Cron('*/30 * * * *') // Every 30 minutes
// @Cron('0 0 * * *') // Daily at midnight
async handleExpiredSubscriptions() {
  // ...
}
```

## Monitoring & Logging

### View Logs

```bash
# Development
npm run start:dev

# Check logs for:
# "Checking for expired subscriptions..."
# "Deactivated X expired subscriptions: ..."
# "Subscription expired: <service_type> for customer <id> (<email>)"
```

### Database Monitoring

```sql
-- Services expiring in next 7 days
SELECT 
    s.id,
    s.service_type,
    s.status,
    s.subscription_expires_at,
    c.email,
    c.username
FROM customer_services s
JOIN customers c ON c.id = s.customer_id
WHERE s.subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND s.status = 'active'
ORDER BY s.subscription_expires_at ASC;

-- Recently expired subscriptions
SELECT 
    s.id,
    s.service_type,
    s.subscription_expires_at,
    c.email
FROM customer_services s
JOIN customers c ON c.id = s.customer_id
WHERE s.status = 'expired'
  AND s.subscription_expires_at > NOW() - INTERVAL '7 days'
ORDER BY s.subscription_expires_at DESC;
```

## Testing

### Test Expiration Logic

```typescript
// Create a test subscription that expires in 1 minute
const testService = await customerServiceRepo.save({
  customer_id: 'test-customer-id',
  service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
  status: SubscriptionStatus.ACTIVE,
  active: true,
  subscription_expires_at: new Date(Date.now() + 60000), // +1 minute
  subscription_duration: SubscriptionDuration.THREE_MONTHS,
});

// Wait 61 seconds, then manually trigger
await customersService.checkExpiredSubscriptions();

// Verify
const updated = await customerServiceRepo.findOne({ 
  where: { id: testService.id } 
});
console.log(updated.status); // Should be 'expired'
console.log(updated.active); // Should be false
```

### Manual Trigger

Add a development endpoint (remove in production):

```typescript
@Get('dev/trigger-expiration')
async triggerExpiration() {
  return this.customersService.checkExpiredSubscriptions();
}
```

## Best Practices

### 1. **Always Check Status** 

Don't rely only on `active` flag:

```typescript
// ❌ Bad
if (service.active) { /* allow access */ }

// ✅ Good  
if (service.status === SubscriptionStatus.ACTIVE && service.active) {
  /* allow access */
}
```

### 2. **Use Status for Business Logic**

```typescript
switch (service.status) {
  case SubscriptionStatus.ACTIVE:
    return { access: true };
  case SubscriptionStatus.EXPIRED:
    return { access: false, message: 'Please renew' };
  case SubscriptionStatus.PENDING:
    return { access: false, message: 'Payment pending' };
  case SubscriptionStatus.CANCELLED:
    return { access: false, message: 'Subscription cancelled' };
  case SubscriptionStatus.SUSPENDED:
    return { access: false, message: 'Account suspended' };
}
```

### 3. **Index Performance**

The migration creates these indexes:
- `idx_customer_services_status` - Fast status filtering
- `idx_customer_services_expires_at` - Fast expiry date queries

### 4. **Audit Trail**

The enhanced `checkExpiredSubscriptions()` now logs:
- Service type
- Customer ID
- Customer email
- Expiration timestamp

## Rollback Instructions

If needed, to rollback the migration:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_check_subscription_expiration_insert ON customer_services;
DROP TRIGGER IF EXISTS trigger_check_subscription_expiration_update ON customer_services;
DROP FUNCTION IF EXISTS check_subscription_expiration();
DROP FUNCTION IF EXISTS batch_expire_subscriptions();

-- Remove indexes
DROP INDEX IF EXISTS idx_customer_services_status;
DROP INDEX IF EXISTS idx_customer_services_expires_at;

-- Remove column
ALTER TABLE customer_services DROP COLUMN IF EXISTS status;

-- Remove enum type
DROP TYPE IF EXISTS subscription_status;
```

## Future Enhancements

### 1. **Expiration Warnings**

Implement in `SubscriptionSchedulerService`:

```typescript
@Cron('0 9 * * *') // Daily at 9 AM
async sendExpirationWarnings() {
  const soonToExpire = await this.customerServiceRepo.find({
    where: {
      status: SubscriptionStatus.ACTIVE,
      subscription_expires_at: Between(
        new Date(),
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
      )
    },
    relations: ['customer']
  });
  
  for (const service of soonToExpire) {
    await this.emailService.sendExpirationWarning(service);
  }
}
```

### 2. **Grace Period**

```typescript
// Allow 3-day grace period after expiration
const gracePeriodDays = 3;
const isInGracePeriod = service.status === SubscriptionStatus.EXPIRED 
  && service.subscription_expires_at 
  && differenceInDays(new Date(), service.subscription_expires_at) <= gracePeriodDays;
```

### 3. **Auto-Renewal**

Add to entity:

```typescript
@Column({ type: 'boolean', default: false })
auto_renew: boolean;

@Column({ type: 'uuid', nullable: true })
payment_method_id: string;
```

## Summary

This implementation provides:

✅ **Comprehensive Status Tracking** - 5 distinct lifecycle states  
✅ **Automated Expiration** - Hourly scheduler + database triggers  
✅ **Audit Logging** - Full trail of expiration events  
✅ **Performance Optimized** - Indexed queries  
✅ **Data Integrity** - Triggers prevent invalid states  
✅ **Easy Migration** - Automated data migration with rollback support  
✅ **Developer Friendly** - Clear enums, comprehensive documentation  

The system is production-ready and handles subscription expiration automatically without manual intervention.
