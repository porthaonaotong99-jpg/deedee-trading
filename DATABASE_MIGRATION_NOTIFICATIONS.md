# Database Migration for Notifications

## Migration File Created
`database/migrations/1734112800000-CreateNotificationsTable.ts`

This migration creates the `notifications` table with the following structure:

### Table: `notifications`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| category | VARCHAR | NO | - | Notification category (enum) |
| action | VARCHAR | NO | - | Notification action (enum) |
| recipientType | VARCHAR | NO | - | 'admin' or 'customer' |
| recipientId | VARCHAR | NO | - | User/Customer ID |
| title | VARCHAR | NO | - | Notification title |
| message | TEXT | NO | - | Notification message |
| metadata | JSONB | NO | '{}' | Additional data |
| isRead | BOOLEAN | NO | false | Read status |
| createdBy | VARCHAR | YES | - | Creator ID |
| createdAt | TIMESTAMP | NO | CURRENT_TIMESTAMP | Created timestamp |
| readAt | TIMESTAMP | YES | - | Read timestamp |

### Indexes Created

1. **IDX_notifications_recipientId** - For fetching notifications by recipient
2. **IDX_notifications_recipientId_isRead** - For fetching unread notifications efficiently
3. **IDX_notifications_recipientId_createdAt** - For sorting notifications by date

## How to Run the Migration

### Method 1: Using TypeORM CLI (Recommended)

```bash
# If you have TypeORM CLI configured
npm run typeorm migration:run

# Or run directly
npx typeorm-ts-node-commonjs migration:run -d src/config/typeorm.config.ts
```

### Method 2: Manual SQL Execution

Connect to your PostgreSQL database and run:

```sql
-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  "recipientType" VARCHAR NOT NULL,
  "recipientId" VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  "isRead" BOOLEAN DEFAULT false,
  "createdBy" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP
);

-- Create indexes
CREATE INDEX "IDX_notifications_recipientId" ON notifications("recipientId");
CREATE INDEX "IDX_notifications_recipientId_isRead" ON notifications("recipientId", "isRead");
CREATE INDEX "IDX_notifications_recipientId_createdAt" ON notifications("recipientId", "createdAt");
```

### Method 3: Via Docker/Database Tool

If using Docker Compose with PostgreSQL:

```bash
# Access the database container
docker-compose exec postgres psql -U your_username -d your_database_name

# Then run the SQL commands above
```

## Verification

After running the migration, verify the table was created:

```sql
-- Check if table exists
\dt notifications

-- Check table structure
\d+ notifications

-- Check indexes
\di notifications*
```

## Rollback

If you need to roll back the migration:

```bash
npm run typeorm migration:revert
```

Or manually:

```sql
DROP INDEX IF EXISTS "IDX_notifications_recipientId_createdAt";
DROP INDEX IF EXISTS "IDX_notifications_recipientId_isRead";
DROP INDEX IF EXISTS "IDX_notifications_recipientId";
DROP TABLE IF EXISTS notifications;
```

## Important Notes

1. **UUID Extension**: The table uses `uuid_generate_v4()`, ensure the `uuid-ossp` extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. **JSONB Support**: Requires PostgreSQL 9.4 or later

3. **Column Names**: Using camelCase for entity compatibility (TypeORM will handle the mapping)

4. **Performance**: The three indexes ensure efficient queries for:
   - Fetching all notifications by recipient
   - Fetching unread notifications
   - Sorting by creation date

5. **Await Calls**: All calls to `notificationsService.createNotification()` must now use `await`:
   ```typescript
   // Before (in-memory)
   this.notificationsService.createNotification(payload);

   // After (database)
   await this.notificationsService.createNotification(payload);
   ```

## Next Steps

After migration:

1. ✅ Run the migration
2. ✅ Restart your NestJS backend
3. ✅ Test creating a notification
4. ✅ Verify data persists after restart
5. ✅ Test real-time Socket.IO delivery

The notification system will now persist data to the database while maintaining real-time Socket.IO functionality!
