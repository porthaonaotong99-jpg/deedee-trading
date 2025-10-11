import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeaturesToSubscriptionPackages1734048000000
  implements MigrationInterface
{
  name = 'AddFeaturesToSubscriptionPackages1734048000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add features text[] column, nullable
    await queryRunner.query(
      `ALTER TABLE "subscription_packages" ADD COLUMN "features" text[] NULL`,
    );
    // Optional: create GIN index if you plan to search features
    // await queryRunner.query(
    //   `CREATE INDEX IF NOT EXISTS "idx_subscription_packages_features" ON "subscription_packages" USING GIN (features)`,
    // );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(`DROP INDEX IF EXISTS "idx_subscription_packages_features"`);
    await queryRunner.query(
      `ALTER TABLE "subscription_packages" DROP COLUMN "features"`,
    );
  }
}
