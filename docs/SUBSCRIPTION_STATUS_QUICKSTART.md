# Subscription Status System - Quick Start

## 🚀 Quick Setup (3 Steps)

### 1. Run the Setup Script

```bash
cd phajaoinvest-backend
./scripts/setup-subscription-status.sh
```

This will:
- ✅ Add the `status` column to `customer_services` table
- ✅ Create the `SubscriptionStatus` enum
- ✅ Migrate existing data intelligently
- ✅ Install database triggers (optional)
- ✅ Add performance indexes

### 2. Restart Your Application

```bash
npm run start:dev
```

### 3. Verify

Check the logs for:
```
[SubscriptionSchedulerService] Checking for expired subscriptions...
```

## 📊 Status Values

| Status | Description | Active Flag |
|--------|-------------|-------------|
| `pending` | Awaiting payment/approval | `false` |
| `active` | Currently valid | `true` |
| `expired` | Past expiration date | `false` |
| `cancelled` | Manually terminated | `false` |
| `suspended` | Temporarily disabled | `false` |

## 🔄 How It Works

### Automatic Expiration (3 Ways)

1. **Hourly Cron Job** (Primary)
   - Runs every hour via NestJS scheduler
   - Checks all subscriptions
   - Updates status to `expired` if past `subscription_expires_at`

2. **Database Triggers** (Real-time)
   - Enforces expiration on INSERT/UPDATE
   - Prevents invalid states
   - Works even if app is down

3. **Manual Function** (On-demand)
   ```sql
   SELECT * FROM batch_expire_subscriptions();
   ```

## 💻 Code Examples

### Check if Subscription is Active

```typescript
const service = await customerServiceRepo.findOne({
  where: { 
    customer_id: customerId,
    service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
  }
});

// ✅ Best practice: check both status and expiry
if (service.status === SubscriptionStatus.ACTIVE 
    && (!service.subscription_expires_at 
        || service.subscription_expires_at > new Date())) {
  // Grant access
}
```

### Get All Active Subscriptions

```typescript
const activeServices = await customerServiceRepo.find({
  where: {
    customer_id: customerId,
    status: SubscriptionStatus.ACTIVE,
  }
});
```

### Manually Expire

```typescript
await customerServiceRepo.update(serviceId, {
  status: SubscriptionStatus.EXPIRED,
  active: false,
});
```

### Renew/Extend

```typescript
const newExpiry = new Date();
newExpiry.setMonth(newExpiry.getMonth() + 3); // +3 months

await customerServiceRepo.update(serviceId, {
  subscription_expires_at: newExpiry,
  status: SubscriptionStatus.ACTIVE,
  active: true,
});
```

## 🔍 Monitoring

### Check Status Distribution

```sql
SELECT 
    status,
    COUNT(*) as count
FROM customer_services 
GROUP BY status;
```

### Find Expiring Soon

```sql
SELECT 
    s.*,
    c.email,
    c.username
FROM customer_services s
JOIN customers c ON c.id = s.customer_id
WHERE s.subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND s.status = 'active';
```

### View Recent Expirations

```sql
SELECT 
    s.*,
    c.email
FROM customer_services s
JOIN customers c ON c.id = s.customer_id
WHERE s.status = 'expired'
  AND s.subscription_expires_at > NOW() - INTERVAL '7 days'
ORDER BY s.subscription_expires_at DESC;
```

## 🎛️ Configuration

### Change Scheduler Frequency

Edit `src/modules/customers/services/subscription-scheduler.service.ts`:

```typescript
// Every 30 minutes
@Cron('*/30 * * * *')

// Every 2 hours
@Cron('0 */2 * * *')

// Daily at midnight
@Cron('0 0 * * *')
```

## 🧪 Testing

### Test with Short Expiry

```typescript
// Create test subscription expiring in 1 minute
const testService = await customerServiceRepo.save({
  customer_id: testCustomerId,
  service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
  status: SubscriptionStatus.ACTIVE,
  active: true,
  subscription_expires_at: new Date(Date.now() + 60000), // +1 min
});

// Wait 61 seconds, then check
await new Promise(resolve => setTimeout(resolve, 61000));

// Manually trigger
await customersService.checkExpiredSubscriptions();

// Verify
const updated = await customerServiceRepo.findOne({ 
  where: { id: testService.id } 
});
console.log(updated.status); // Should be 'expired'
```

## 📝 Migration Files

All migration files are in `/database/migrations/`:

1. **add-subscription-status.sql** - Adds status column and migrates data
2. **subscription-expiration-trigger.sql** - Creates database triggers

## 📚 Full Documentation

See [SUBSCRIPTION_STATUS_MANAGEMENT.md](./SUBSCRIPTION_STATUS_MANAGEMENT.md) for complete documentation including:
- Detailed architecture
- Rollback instructions
- Best practices
- Future enhancements
- Troubleshooting

## ⚠️ Important Notes

1. **Always check `status`** field, not just `active` flag
2. **Triggers are optional** but highly recommended
3. **TypeScript errors** may appear until dev server restarts
4. **Existing subscriptions** are migrated automatically
5. **Scheduler logs** appear in console every hour

## 🆘 Troubleshooting

### "Unsafe member access" TypeScript errors

**Solution:** Restart your dev server
```bash
# Kill current server (Ctrl+C)
npm run start:dev
```

### Scheduler not running

**Check:** Is `ScheduleModule` imported in `app.module.ts`?
```typescript
imports: [
  ScheduleModule.forRoot(), // ✓ Should be present
  // ...
]
```

### Status not updating automatically

1. Check if triggers are installed:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'customer_services'::regclass;
   ```

2. Check scheduler logs:
   ```
   [SubscriptionSchedulerService] Checking for expired subscriptions...
   ```

## 🎯 Next Steps

After setup:

1. ✅ Verify status column exists in database
2. ✅ Restart application
3. ✅ Check scheduler logs
4. ✅ Update frontend to use status field
5. ✅ Add email notifications for expiring subscriptions

---

**Need help?** See the full documentation in `SUBSCRIPTION_STATUS_MANAGEMENT.md`
