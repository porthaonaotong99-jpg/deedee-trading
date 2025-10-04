import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSubscriptionPackages1733330000000
  implements MigrationInterface
{
  name = 'CreateSubscriptionPackages1733330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscription_packages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'service_type',
            type: 'enum',
            enum: [
              'premium_membership',
              'premium_stock_picks',
              'international_stock_account',
              'guaranteed_returns',
            ],
          },
          { name: 'duration_months', type: 'int' },
          { name: 'price', type: 'numeric', precision: 10, scale: 2 },
          { name: 'currency', type: 'varchar', length: '8', default: "'USD'" },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'active', type: 'boolean', default: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'subscription_packages',
      new TableIndex({
        name: 'idx_subscription_packages_active',
        columnNames: ['active'],
      }),
    );

    await queryRunner.createIndex(
      'subscription_packages',
      new TableIndex({
        name: 'idx_subscription_packages_service_type',
        columnNames: ['service_type'],
      }),
    );

    // Seed initial packages (idempotent: rely on unique combination via WHERE NOT EXISTS constructs)
    await queryRunner.query(`
      INSERT INTO subscription_packages (id, service_type, duration_months, price, currency, description, active)
      SELECT gen_random_uuid(), 'premium_membership', 3, 299.99, 'USD', '3-month premium membership', true
      WHERE NOT EXISTS (SELECT 1 FROM subscription_packages WHERE service_type='premium_membership' AND duration_months=3);
    `);
    await queryRunner.query(`
      INSERT INTO subscription_packages (id, service_type, duration_months, price, currency, description, active)
      SELECT gen_random_uuid(), 'premium_membership', 6, 549.99, 'USD', '6-month premium membership', true
      WHERE NOT EXISTS (SELECT 1 FROM subscription_packages WHERE service_type='premium_membership' AND duration_months=6);
    `);
    await queryRunner.query(`
      INSERT INTO subscription_packages (id, service_type, duration_months, price, currency, description, active)
      SELECT gen_random_uuid(), 'premium_membership', 12, 999.99, 'USD', '12-month premium membership', true
      WHERE NOT EXISTS (SELECT 1 FROM subscription_packages WHERE service_type='premium_membership' AND duration_months=12);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'subscription_packages',
      'idx_subscription_packages_active',
    );
    await queryRunner.dropIndex(
      'subscription_packages',
      'idx_subscription_packages_service_type',
    );
    await queryRunner.dropTable('subscription_packages');
  }
}
