import 'dotenv/config';
import 'tsconfig-paths/register';
import { DataSource } from 'typeorm';
import { SubscriptionPackage } from '../src/modules/subscription-packages/entities/subscription-package.entity';
import { CustomerServiceType } from '../src/modules/customers/entities/customer-service.entity';

// Basic TypeORM DataSource creation leveraging existing config shape
// Adjust if your database config exports differently.

async function bootstrap() {
  // Prefer DATABASE_* (matches main app), then fallback to DB_* then defaults
  const host = process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost';
  const port = +(process.env.DATABASE_PORT || process.env.DB_PORT || 5432);
  const username =
    process.env.DATABASE_USERNAME || process.env.DB_USERNAME || 'postgres';
  const password =
    process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'postgres';
  const database =
    process.env.DATABASE_NAME || process.env.DB_NAME || 'trading_db';

  const url = process.env.DATABASE_URL;

  console.log('[subscription-packages:seed] Using connection params:', {
    host,
    port,
    database,
    username,
    hasPassword: password ? 'yes' : 'no',
    viaUrl: !!url,
  });

  const ds = new DataSource(
    url
      ? {
          type: 'postgres',
          url,
          entities: [SubscriptionPackage],
          synchronize: false,
          migrationsRun: false,
          logging: false,
        }
      : {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities: [SubscriptionPackage],
          synchronize: false,
          migrationsRun: false,
          logging: false,
        },
  );

  await ds.initialize();
  const repo = ds.getRepository(SubscriptionPackage);

  const packages: Array<Partial<SubscriptionPackage>> = [
    {
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      duration_months: 3,
      price: '299.99',
      currency: 'USD',
      description: '3-month premium membership',
      features: [
        'Membership: 3 months',
        'Advanced stock analysis tools',
        'Unlimited stock picks',
        'Portfolio tracking',
        'Priority support',
      ],
      active: true,
    },
    {
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      duration_months: 6,
      price: '549.99',
      currency: 'USD',
      description: '6-month premium membership',
      features: [
        'Membership: 6 months (save 10%)',
        'Advanced stock analysis tools',
        'Unlimited stock picks',
        'Portfolio tracking',
        'Priority support',
        'Cheaper monthly rate than Basic',
      ],
      active: true,
    },
    {
      service_type: CustomerServiceType.PREMIUM_MEMBERSHIP,
      duration_months: 12,
      price: '999.99',
      currency: 'USD',
      description: '12-month premium membership',
      features: [
        'Membership: 12 months (save 20%)',
        'Advanced stock analysis tools',
        'Unlimited stock picks',
        'Portfolio tracking',
        'Priority support',
        'Best monthly rate',
      ],
      active: true,
    },
  ];

  for (const pkg of packages) {
    const exists = await repo.findOne({
      where: {
        service_type: pkg.service_type!,
        duration_months: pkg.duration_months!,
      },
    });
    if (exists) {
      console.log(
        `Skip: package ${pkg.service_type} ${pkg.duration_months} months already exists (id=${exists.id})`,
      );
      continue;
    }
    const created = repo.create(pkg);
    await repo.save(created);
    console.log(
      `Inserted package ${pkg.service_type} ${pkg.duration_months}m (id=${created.id})`,
    );
  }

  await ds.destroy();
  console.log('Subscription package seeding complete');
}

bootstrap().catch((err: unknown) => {
  console.error(
    '[subscription-packages:seed] Failed to seed subscription packages',
  );
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, unknown>;
    console.error('Name:', anyErr.name);
    console.error('Code:', anyErr.code);
    console.error('Message:', anyErr.message);
    const stack = typeof anyErr.stack === 'string' ? anyErr.stack : '';
    console.error('Stack:', stack.split('\n').slice(0, 5).join('\n'));
  } else {
    console.error(err);
  }
  console.error(
    'Troubleshooting tips:\n 1. Verify credentials in .env (DATABASE_*).\n 2. Ensure Postgres is reachable (docker-compose up).\n 3. psql test: psql -h HOST -p PORT -U USER -d DB.\n 4. If using a cloud DB, set DATABASE_URL.',
  );
  process.exit(1);
});
