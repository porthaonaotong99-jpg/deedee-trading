import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockPicksTables1696320000000 implements MigrationInterface {
  name = 'CreateStockPicksTables1696320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stock_picks table
    await queryRunner.query(`
      CREATE TABLE "stock_picks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stock_symbol" character varying(20) NOT NULL,
        "description" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "availability" character varying NOT NULL DEFAULT 'available',
        "service_type" character varying NOT NULL,
        "created_by_admin_id" uuid NOT NULL,
        "admin_notes" text,
        "target_price" numeric(10,2),
        "current_price" numeric(10,2),
        "expires_at" TIMESTAMP,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_picks" PRIMARY KEY ("id")
      )
    `);

    // Create customer_stock_picks table
    await queryRunner.query(`
      CREATE TABLE "customer_stock_picks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "stock_pick_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'selected',
        "customer_notes" text,
        "admin_response" text,
        "approved_by_admin_id" uuid,
        "approved_at" TIMESTAMP,
        "email_sent_at" TIMESTAMP,
        "selected_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_stock_picks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_stock_picks_customer_stock" UNIQUE ("customer_id", "stock_pick_id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "customer_stock_picks" 
      ADD CONSTRAINT "FK_customer_stock_picks_customer_id" 
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "customer_stock_picks" 
      ADD CONSTRAINT "FK_customer_stock_picks_stock_pick_id" 
      FOREIGN KEY ("stock_pick_id") REFERENCES "stock_picks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_stock_picks_service_type" ON "stock_picks" ("service_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_picks_status" ON "stock_picks" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_picks_availability" ON "stock_picks" ("availability")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_picks_created_by_admin_id" ON "stock_picks" ("created_by_admin_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_picks_expires_at" ON "stock_picks" ("expires_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_stock_picks_customer_id" ON "customer_stock_picks" ("customer_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_stock_picks_stock_pick_id" ON "customer_stock_picks" ("stock_pick_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_stock_picks_status" ON "customer_stock_picks" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_customer_stock_picks_approved_by_admin_id" ON "customer_stock_picks" ("approved_by_admin_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_customer_stock_picks_approved_by_admin_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_customer_stock_picks_status"`);
    await queryRunner.query(
      `DROP INDEX "IDX_customer_stock_picks_stock_pick_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_customer_stock_picks_customer_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_stock_picks_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_picks_created_by_admin_id"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_picks_availability"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_picks_status"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_picks_service_type"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "customer_stock_picks" DROP CONSTRAINT "FK_customer_stock_picks_stock_pick_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_stock_picks" DROP CONSTRAINT "FK_customer_stock_picks_customer_id"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "customer_stock_picks"`);
    await queryRunner.query(`DROP TABLE "stock_picks"`);
  }
}
