import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';

// Minimal DataSource just for seeding users
const ds = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5431,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'trading_db',
});

interface SeedUserDef {
  username: string;
  password: string; // plain, will be hashed
  first_name: string;
  last_name?: string;
  gender: string; // matches enum Gender values expected in DB
  number: string; // employee number or internal code
  tel?: string;
  role_id?: string; // optional if roles table has pre-seeded ids
}

// You can map role names to role IDs if you maintain them; placeholder left blank
const USERS: SeedUserDef[] = [
  {
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
    first_name: 'System',
    last_name: 'Administrator',
    gender: 'male',
    number: 'EMP-0001',
    tel: '0000000000',
  },
  {
    username: 'ops_manager',
    password: 'Admin@123',
    first_name: 'Ops',
    last_name: 'Manager',
    gender: 'female',
    number: 'EMP-0002',
  },
  {
    username: 'auditor',
    password: 'Audit@123',
    first_name: 'Audit',
    last_name: 'User',
    gender: 'female',
    number: 'EMP-0003',
  },
];

async function upsertUser(u: SeedUserDef) {
  // Check existing by username
  const existing = await ds.query<{ id: string; password: string }[]>(
    'SELECT id, password FROM users WHERE username = $1 LIMIT 1',
    [u.username],
  );
  const desiredHash = await argon2.hash(u.password, { type: argon2.argon2id });
  if (existing.length) {
    const current = existing[0];
    const forceUpdate = process.env.SEED_UPDATE_EXISTING === 'true';
    const looksHashed =
      current.password?.startsWith('$argon2') ||
      current.password?.startsWith('$2'); // bcrypt
    if (forceUpdate || !looksHashed) {
      await ds.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [desiredHash, current.id],
      );
      console.log(
        `User '${u.username}' existed -> password ${forceUpdate ? 'force-updated' : 'normalized (was plain)'}'`,
      );
    } else {
      console.log(`User '${u.username}' already exists -> skipping`);
    }
    return;
  }
  await ds.query(
    `INSERT INTO users (id, number, first_name, last_name, username, password, gender, tel, address, status, profile, role_id, admin_role_id, created_by, deleted_by, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NULL, 'active', NULL, $8, NULL, NULL, NULL, NOW(), NOW())`,
    [
      u.number,
      u.first_name,
      u.last_name || null,
      u.username,
      desiredHash,
      u.gender,
      u.tel || null,
      u.role_id || null,
    ],
  );
  console.log(`Inserted user '${u.username}'`);
}

async function seedUsers() {
  await ds.initialize();
  try {
    for (const u of USERS) {
      await upsertUser(u);
    }
    console.log('User seed complete');
  } catch (err) {
    console.error('User seed failed', err);
    process.exitCode = 1;
  } finally {
    await ds.destroy();
  }
}

seedUsers().catch((e) => {
  console.error('Unhandled error during user seed', e);
  process.exit(1);
});
