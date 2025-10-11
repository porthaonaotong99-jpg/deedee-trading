import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddSubscriptionExpiryToPayments1739500000000
  implements MigrationInterface
{
  name = 'AddSubscriptionExpiryToPayments1739500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'payments',
      new TableColumn({
        name: 'subscription_expires_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Ensure the FK exists for subscription_package_id to subscription_packages(id)
    const hasFk = await queryRunner
      .getTable('payments')
      .then((table) =>
        table?.foreignKeys.find((fk) =>
          fk.columnNames.includes('subscription_package_id'),
        ),
      );
    if (!hasFk) {
      await queryRunner.createForeignKey(
        'payments',
        new TableForeignKey({
          columnNames: ['subscription_package_id'],
          referencedTableName: 'subscription_packages',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK if we added it here
    const table = await queryRunner.getTable('payments');
    const fk = table?.foreignKeys.find((f) =>
      f.columnNames.includes('subscription_package_id'),
    );
    if (fk) {
      await queryRunner.dropForeignKey('payments', fk);
    }

    await queryRunner.dropColumn('payments', 'subscription_expires_at');
  }
}
