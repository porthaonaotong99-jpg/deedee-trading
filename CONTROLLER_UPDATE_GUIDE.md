# Quick Fix Guide: Update Controllers for Database Notifications

## Problem

The notification service now uses database storage and all methods are **async**. Controllers calling `createNotification()` must use `await`.

---

## Files to Update

Run this command to find all locations:
```bash
cd phajaoinvest-backend
grep -rn "createNotification" src/modules/ --include="*.controller.ts"
```

### Expected Matches (17 total):

1. ✅ `notifications.controller.ts` - Already updated
2. ❌ `customer-services.controller.ts` - 10 calls need await
3. ❌ `admin-stock-picks.controller.ts` - 2 calls need await
4. ❌ `customer-stock-picks.controller.ts` - 1 call needs await
5. ❌ `admin-transfer-history.controller.ts` - 2 calls need await
6. ❌ `investment.controller.ts` - 2 calls need await

---

## Fix Pattern

### Step 1: Find the call
```typescript
// Current (BROKEN)
const notification = this.notificationsService.createNotification(payload);
this.notificationsGateway.emitNotification(notification);
```

### Step 2: Add await
```typescript
// Fixed
const notification = await this.notificationsService.createNotification(payload);
this.notificationsGateway.emitNotification(notification);
```

### Step 3: Make method async (if not already)
```typescript
// Before
@Post('apply')
apply(@Body() dto: ApplyDto) {
  // ...
  const notification = this.notificationsService.createNotification(payload);
}

// After
@Post('apply')
async apply(@Body() dto: ApplyDto) {
  // ...
  const notification = await this.notificationsService.createNotification(payload);
}
```

---

## Automated Fix Script

Create and run this script to fix all controllers:

### `fix-notifications.sh`
```bash
#!/bin/bash

# Files to update
FILES=(
  "src/modules/customers/customer-services.controller.ts"
  "src/modules/stock-picks/controllers/admin-stock-picks.controller.ts"
  "src/modules/stock-picks/controllers/customer-stock-picks.controller.ts"
  "src/modules/transfer-history/controllers/admin-transfer-history.controller.ts"
  "src/modules/investment-info/investment.controller.ts"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  
  # Add await before createNotification calls
  sed -i.bak 's/this\.notificationsService\.createNotification/await this.notificationsService.createNotification/g' "$file"
  
  echo "✅ Updated $file"
done

echo ""
echo "Done! Remember to:"
echo "1. Check each method is 'async'"
echo "2. Run 'npm run lint' to verify"
echo "3. Test all endpoints"
```

### Run the script:
```bash
chmod +x fix-notifications.sh
./fix-notifications.sh
```

---

## Manual Fix Checklist

### 1. customer-services.controller.ts

#### Lines to fix (approximate):
- ~Line 190: `apply()` method - stock account notification
- ~Line 199: `apply()` method - guaranteed returns notification  
- ~Line 238: `applyPremiumMembership()` - premium membership notification
- ~Line 304: `approve()` - stock account approval
- ~Line 316: `approve()` - guaranteed returns approval
- ~Line 405: `reject()` - stock account rejection
- ~Line 418: `reject()` - guaranteed returns rejection
- ~Line 606: `topup()` - top-up notification

**Pattern**:
```typescript
// Find these patterns
const notification = this.notificationsService.createNotification(

// Replace with
const notification = await this.notificationsService.createNotification(

// Then ensure parent method is async
async apply(@Body() dto: ApplyServiceDto) {
```

### 2. admin-stock-picks.controller.ts

#### Lines to fix:
- ~Line 327: `approveCustomerPick()` - approval notification
- ~Line 398: `rejectCustomerPick()` - rejection notification

```typescript
// Make methods async
async approveCustomerPick(...) {
  // Add await
  const notification = await this.notificationsService.createNotification(payload);
  this.notificationsGateway.emitNotification(notification);
}
```

### 3. customer-stock-picks.controller.ts

#### Lines to fix:
- ~Line 306: `submitPaymentSlip()` - payment slip notification

```typescript
async submitPaymentSlip(...) {
  const notification = await this.notificationsService.createNotification(payload);
  this.notificationsGateway.emitNotification(notification);
}
```

### 4. admin-transfer-history.controller.ts

#### Lines to fix:
- ~Line 163: `approve()` - approval notification
- ~Line 195: `reject()` - rejection notification

```typescript
async approve(...) {
  const notification = await this.notificationsService.createNotification(payload);
  this.notificationsGateway.emitNotification(notification);
}
```

### 5. investment.controller.ts

#### Lines to fix:
- ~Line 176: `createInvestmentRequest()` - investment request notification
- ~Line 367: `createReturnRequest()` - return request notification

```typescript
async createInvestmentRequest(...) {
  const notification = await this.notificationsService.createNotification(payload);
  this.notificationsGateway.emitNotification(notification);
}
```

---

## Verification

### 1. Check TypeScript Compilation
```bash
npm run build
```

Should compile without errors.

### 2. Check for Missing Awaits
```bash
# Find calls without await
grep -rn "= this.notificationsService.createNotification" src/modules/ --include="*.controller.ts" | grep -v "await"
```

Should return 0 results (except comments).

### 3. Check All Methods Are Async
```bash
# Find all methods calling createNotification
grep -B5 "createNotification" src/modules/**/*.controller.ts | grep -E "@(Post|Put|Get|Delete)"
```

Verify each decorator is followed by `async` in the method signature.

### 4. Run Linter
```bash
npm run lint
```

Fix any remaining async/await issues.

### 5. Test Each Endpoint

Create a test script:

```bash
#!/bin/bash
API="http://localhost:3000"
TOKEN="your-test-token"

# Test customer service application (should create notification)
curl -X POST "$API/customers/services/apply" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "service_type": "international_stock_account",
    "customer_id": "test-customer-id"
  }'

# Check if notification was created in database
psql -U your_user -d your_database -c "SELECT * FROM notifications ORDER BY \"createdAt\" DESC LIMIT 1;"
```

---

## Common Errors

### Error 1: Method is not async
```
Type 'Promise<NotificationResponse>' is not assignable to type 'NotificationResponse'
```

**Fix**: Add `async` to the method signature:
```typescript
async apply(@Body() dto: ApplyDto) {
```

### Error 2: Missing await
```
Floating Promise
```

**Fix**: Add `await`:
```typescript
const notification = await this.notificationsService.createNotification(payload);
```

### Error 3: Cannot use await in non-async function
```
'await' expressions are only allowed within async functions
```

**Fix**: Make the parent method async:
```typescript
async myMethod() {
  await this.notificationsService.createNotification(payload);
}
```

---

## After All Updates

### 1. Restart Server
```bash
npm run start:dev
```

### 2. Test Notification Flow

```bash
# 1. Connect Socket.IO client
# 2. Subscribe to notifications
# 3. Trigger an endpoint that creates notification
# 4. Verify real-time notification received
# 5. Check database has the record
```

### 3. Verify Database Persistence

```bash
# Create notification
curl -X POST http://localhost:3000/customers/services/apply ...

# Check database
psql -c "SELECT COUNT(*) FROM notifications;"

# Restart server
npm run start:dev

# Check notifications still exist
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer $TOKEN"
```

---

## Success Criteria

- ✅ All controllers compile without errors
- ✅ All `createNotification` calls use `await`
- ✅ All methods calling `createNotification` are `async`
- ✅ Notifications save to database
- ✅ Real-time delivery still works via Socket.IO
- ✅ Server restart doesn't lose notifications
- ✅ All tests pass
- ✅ Linter passes

---

## Need Help?

1. Check compile errors: `npm run build`
2. Check linter: `npm run lint`
3. Search for patterns: `grep -rn "createNotification" src/`
4. Review this guide
5. Check main documentation: `DATABASE_IMPLEMENTATION_SUMMARY.md`

---

**Estimated Time to Fix**: 10-15 minutes

**Complexity**: Low (simple find/replace with async/await)
