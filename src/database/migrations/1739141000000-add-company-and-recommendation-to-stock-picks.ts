import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyAndRecommendationToStockPicks1739141000000
  implements MigrationInterface
{
  name = 'AddCompanyAndRecommendationToStockPicks1739141000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "company" character varying(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "recommendation" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stock_picks_recommendation" ON "stock_picks" ("recommendation")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_stock_picks_recommendation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_picks" DROP COLUMN IF EXISTS "recommendation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_picks" DROP COLUMN IF EXISTS "company"`,
    );
  }
}
