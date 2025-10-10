import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCardFieldsToStockPicks1739140000000
  implements MigrationInterface
{
  name = 'AddCardFieldsToStockPicks1739140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to stock_picks
    await queryRunner.query(`
      ALTER TABLE "stock_picks"
      ADD COLUMN IF NOT EXISTS "sale_price" numeric(10,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "risk_level" character varying,
      ADD COLUMN IF NOT EXISTS "expected_return_min_percent" numeric(5,2),
      ADD COLUMN IF NOT EXISTS "expected_return_max_percent" numeric(5,2),
      ADD COLUMN IF NOT EXISTS "time_horizon_min_months" integer,
      ADD COLUMN IF NOT EXISTS "time_horizon_max_months" integer,
      ADD COLUMN IF NOT EXISTS "sector" character varying(50),
      ADD COLUMN IF NOT EXISTS "analyst_name" character varying(100),
      ADD COLUMN IF NOT EXISTS "tier_label" character varying,
      ADD COLUMN IF NOT EXISTS "key_points" text[],
      ADD COLUMN IF NOT EXISTS "email_delivery" boolean NOT NULL DEFAULT true
    `);

    // Optional: basic indexes for filtering on UI
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_picks_risk_level" ON "stock_picks" ("risk_level")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_picks_tier_label" ON "stock_picks" ("tier_label")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_picks_sector" ON "stock_picks" ("sector")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_picks_sector"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_picks_tier_label"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_picks_risk_level"`,
    );

    await queryRunner.query(`
      ALTER TABLE "stock_picks"
      DROP COLUMN IF EXISTS "email_delivery",
      DROP COLUMN IF EXISTS "key_points",
      DROP COLUMN IF EXISTS "tier_label",
      DROP COLUMN IF EXISTS "analyst_name",
      DROP COLUMN IF EXISTS "sector",
      DROP COLUMN IF EXISTS "time_horizon_max_months",
      DROP COLUMN IF EXISTS "time_horizon_min_months",
      DROP COLUMN IF EXISTS "expected_return_max_percent",
      DROP COLUMN IF EXISTS "expected_return_min_percent",
      DROP COLUMN IF EXISTS "risk_level",
      DROP COLUMN IF EXISTS "sale_price"
    `);
  }
}
