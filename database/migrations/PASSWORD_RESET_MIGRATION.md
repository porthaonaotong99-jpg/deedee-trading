# Password Reset Migration

This document outlines the database migration needed for the password reset functionality.

## Table: password_resets

```sql
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  reset_type VARCHAR NOT NULL CHECK (reset_type IN ('email_link', 'email_otp')),
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'revoked')),
  token_hash VARCHAR NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  user_agent VARCHAR NULL,
  ip_address INET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_password_resets_email_status ON password_resets(email, status);
CREATE UNIQUE INDEX idx_password_resets_token_hash ON password_resets(token_hash);
CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);
```

## TypeORM Migration Command

To generate the migration file:

```bash
npm run typeorm:generate-migration -- AddPasswordResetTable
```

Or manually create the migration file:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTable1728000000000 implements MigrationInterface {
  name = 'AddPasswordResetTable1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_resets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "reset_type" character varying NOT NULL DEFAULT 'email_otp',
        "status" character varying NOT NULL DEFAULT 'pending',
        "token_hash" character varying NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT '0',
        "max_attempts" integer NOT NULL DEFAULT '3',
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "user_agent" character varying,
        "ip_address" inet,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_resets" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_password_resets_email_status" ON "password_resets" ("email", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_password_resets_token_hash" ON "password_resets" ("token_hash")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_password_resets_expires_at" ON "password_resets" ("expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "password_resets" ADD CONSTRAINT "FK_password_resets_customer_id" 
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "password_resets" DROP CONSTRAINT "FK_password_resets_customer_id"
    `);
    await queryRunner.query(`DROP INDEX "idx_password_resets_expires_at"`);
    await queryRunner.query(`DROP INDEX "idx_password_resets_token_hash"`);
    await queryRunner.query(`DROP INDEX "idx_password_resets_email_status"`);
    await queryRunner.query(`DROP TABLE "password_resets"`);
  }
}
```

## Post-Migration Steps

1. Run the migration: `npm run typeorm:run-migrations`
2. Verify the table exists and has proper constraints
3. Test the password reset functionality
4. Set up proper environment variables for email service