import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5431,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'trading_db',
});

async function seedBasePermissions() {
  await AppDataSource.query(`
    INSERT INTO permissions (id, name, description)
    VALUES
      (gen_random_uuid(), 'READ_NEWS', 'Read news content'),
      (gen_random_uuid(), 'SEARCH_STOCKS', 'Search and view stocks'),
      (gen_random_uuid(), 'ACCESS_PREMIUM_PICKS', 'Access premium stock picks'),
      (gen_random_uuid(), 'BUY_STOCKS', 'Buy stocks'),
      (gen_random_uuid(), 'SELL_STOCKS', 'Sell stocks'),
      (gen_random_uuid(), 'GUARANTEED_RETURNS', 'Participate in guaranteed return programs')
    ON CONFLICT (name) DO NOTHING;
  `);
}

async function seedTestCustomersAndServices() {
  const customers = await AppDataSource.query<
    {
      id: string;
      username: string;
    }[]
  >(`
    WITH inserted AS (
      INSERT INTO customers (id, first_name, username, password, email, status, "isVerify", created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'CustA', 'cust_a', 'placeholder', 'cust_a@example.com', 'active', false, NOW(), NOW()),
        (gen_random_uuid(), 'CustB', 'cust_b', 'placeholder', 'cust_b@example.com', 'active', false, NOW(), NOW()),
        (gen_random_uuid(), 'CustC', 'cust_c', 'placeholder', 'cust_c@example.com', 'active', false, NOW(), NOW()),
        (gen_random_uuid(), 'CustD', 'cust_d', 'placeholder', 'cust_d@example.com', 'active', false, NOW(), NOW()),
        (gen_random_uuid(), 'CustE', 'cust_e', 'placeholder', 'cust_e@example.com', 'active', false, NOW(), NOW()),
        (gen_random_uuid(), 'CustF', 'cust_f', 'placeholder', 'cust_f@example.com', 'active', false, NOW(), NOW()),
        (gen_random_uuid(), 'CustG', 'cust_g', 'placeholder', 'cust_g@example.com', 'active', false, NOW(), NOW())
      ON CONFLICT (username) DO NOTHING
      RETURNING id, username
    )
    SELECT id, username FROM inserted
    UNION
    SELECT id, username FROM customers WHERE username IN ('cust_a','cust_b','cust_c','cust_d','cust_e','cust_f','cust_g');
  `);

  const idByUsername: Record<string, string> = {};
  for (const row of customers) {
    idByUsername[row.username] = row.id;
  }

  async function addService(username: string, service: string) {
    await AppDataSource.query(
      `INSERT INTO customer_services (id, customer_id, service_type, active, applied_at)
       VALUES (gen_random_uuid(), $1, $2, true, NOW())
       ON CONFLICT DO NOTHING;`,
      [idByUsername[username], service],
    );
  }

  // Service combinations
  await addService('cust_a', 'premium_membership');
  await addService('cust_b', 'premium_membership');
  await addService('cust_b', 'premium_stock_picks');
  await addService('cust_c', 'international_stock_account');
  await addService('cust_d', 'guaranteed_returns');
  await addService('cust_e', 'international_stock_account');
  await addService('cust_e', 'guaranteed_returns');
  await addService('cust_f', 'premium_membership');
  await addService('cust_f', 'international_stock_account');
  await addService('cust_f', 'premium_stock_picks');
  await addService('cust_g', 'premium_membership');
  await addService('cust_g', 'guaranteed_returns');
  await addService('cust_g', 'premium_stock_picks');
}

async function seedDynamicServicePermissions() {
  await AppDataSource.query(`
    INSERT INTO service_permissions (id, service_type, permission_name)
    VALUES
      (gen_random_uuid(), 'premium_stock_picks', 'SELL_STOCKS')
    ON CONFLICT DO NOTHING;
  `);
}

// ------------------------------------------------------------
// Laos geo hierarchy seed (country -> provinces -> districts)
// ------------------------------------------------------------
interface ProvinceSeed {
  name: string;
  districts: string[];
}

const LAOS_PROVINCES: ProvinceSeed[] = [
  {
    name: 'Attapeu',
    districts: ['Samakkixay', 'Xaysetha', 'Sanamxay', 'Sanxay', 'Phouvong'],
  },
  {
    name: 'Bokeo',
    districts: ['Houayxay', 'Ton Pheung', 'Meung', 'Pha Oudom', 'Paktha'],
  },
  {
    name: 'Bolikhamsai',
    districts: [
      'Pakxan',
      'Thaphabat',
      'Pakkading',
      'Borikhane',
      'Khamkeut',
      'Viengthong',
      'Xaychamphone',
    ],
  },
  {
    name: 'Champasak',
    districts: [
      'Pakse',
      'Sanasomboun',
      'Bachiengchaleunsouk',
      'Paksong',
      'Phonthong',
      'Champasak',
      'Sukhuma',
      'Mounlapamok',
      'Khong',
    ],
  },
  {
    name: 'Houaphanh',
    districts: [
      'Sam Neua',
      'Viengxay',
      'Viengthong',
      'Xam Tai',
      'Sop Bao',
      'Et',
      'Xone',
      'Houamuang',
      'Nonghed',
    ],
  },
  {
    name: 'Khammouane',
    districts: [
      'Thakhek',
      'Mahaxay',
      'Nongbok',
      'Hinboun',
      'Yommalath',
      'Bualapha',
      'Nakai',
      'Xe Bang Fai',
      'Khounkham',
    ],
  },
  {
    name: 'Luang Namtha',
    districts: ['Namtha', 'Sing', 'Long', 'Viengphoukha', 'Nalae'],
  },
  {
    name: 'Luang Prabang',
    districts: [
      'Luang Prabang',
      'Xiengngeun',
      'Nan',
      'Pak Ou',
      'Nambak',
      'Ngoi',
      'Pakxeng',
      'Phonxay',
      'Chomphet',
      'Phoukhoune',
    ],
  },
  {
    name: 'Oudomxay',
    districts: ['Xay', 'La', 'Namor', 'Beng', 'Houn', 'Pak Beng', 'Nam Bak'],
  },
  {
    name: 'Phongsaly',
    districts: [
      'Phongsaly',
      'May',
      'Khoua',
      'Samphan',
      'Boun Neua',
      'Boun Tay',
      'Yot Ou',
      'Gnot Ou',
    ],
  },
  {
    name: 'Salavan',
    districts: [
      'Salavan',
      'Ta Oy',
      'Toumlan',
      'Lao Ngam',
      'Vapi',
      'Khongxedon',
      'Samuoi',
    ],
  },
  {
    name: 'Savannakhet',
    districts: [
      'Kaysone Phomvihane',
      'Outhoumphone',
      'Atsaphangthong',
      'Phine',
      'Sepone',
      'Nong',
      'Thapangthong',
      'Songkhone',
      'Champone',
      'Xonbouli',
      'Vilabouly',
      'Atsaphone',
      'Xaybouly',
    ],
  },
  { name: 'Sekong', districts: ['Lamam', 'Thateng', 'Dakcheung', 'Kaleum'] },
  {
    name: 'Vientiane Province',
    districts: [
      'Phonhong',
      'Thoulakhom',
      'Hinheup',
      'Vang Vieng',
      'Keo-Oudom',
      'Kasy',
      'Viengkham',
      'Feuang',
      'Mad',
      'Hom',
    ],
  },
  {
    name: 'Vientiane Prefecture',
    districts: [
      'Chanthabuly',
      'Sikhottabong',
      'Xaysettha',
      'Sisattanak',
      'Naxaythong',
      'Hadxayfong',
      'Sangthong',
      'Pakngum',
    ],
  },
  {
    name: 'Xaisomboun',
    districts: ['Anouvong', 'Longxan', 'Longchaeng', 'Hom', 'Thathom'],
  },
  {
    name: 'Xayaburi',
    districts: [
      'Xayaburi',
      'Phiang',
      'Hongsa',
      'Khop',
      'Ngeun',
      'Xienghone',
      'Parklai',
      'Kenthao',
      'Boten',
      'Thongmixay',
    ],
  },
  {
    name: 'Xiangkhouang',
    districts: ['Pek', 'Kham', 'Nonghet', 'Phaxay', 'Phoukout', 'Mok May'],
  },
];

async function seedLaosGeography() {
  // Insert country (Lao PDR) if not exists
  const countryRows = await AppDataSource.query<
    {
      id: string;
    }[]
  >(
    `INSERT INTO country (id, name, status)
     VALUES (gen_random_uuid(), 'Lao PDR', 'active')
     ON CONFLICT (id) DO NOTHING
     RETURNING id;`,
  );

  // If RETURNING empty (country already exists) fetch its id by name
  let laosId: string | undefined = countryRows[0]?.id;
  if (!laosId) {
    const existing = await AppDataSource.query<{ id: string }[]>(
      `SELECT id FROM country WHERE name = $1 LIMIT 1;`,
      ['Lao PDR'],
    );
    laosId = existing[0]?.id;
  }
  if (!laosId) {
    throw new Error('Failed to resolve Lao PDR country id');
  }

  for (const prov of LAOS_PROVINCES) {
    // Upsert province (by name + country) - since no unique constraint, perform manual lookup
    let provId: string | undefined;
    const existingProv = await AppDataSource.query<{ id: string }[]>(
      `SELECT id FROM province WHERE name = $1 AND country_id = $2 LIMIT 1;`,
      [prov.name, laosId],
    );
    if (existingProv.length) {
      provId = existingProv[0].id;
    } else {
      const inserted = await AppDataSource.query<{ id: string }[]>(
        `INSERT INTO province (id, name, country_id, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), NOW())
         RETURNING id;`,
        [prov.name, laosId],
      );
      provId = inserted[0].id;
    }
    if (!provId) continue;

    for (const distName of prov.districts) {
      const existingDist = await AppDataSource.query<{ id: string }[]>(
        `SELECT id FROM district WHERE name = $1 AND province_id = $2 LIMIT 1;`,
        [distName, provId],
      );
      if (existingDist.length) continue;
      await AppDataSource.query(
        `INSERT INTO district (id, name, postcode, province_id, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, NULL, $2, 'active', NOW(), NOW());`,
        [distName, provId],
      );
    }
  }
  console.log('Laos geography seed completed');
}

// ------------------------------------------------------------
// Thailand geo hierarchy seed (country -> provinces -> districts subset)
// NOTE: For brevity most provinces list only their capital (Mueang <Province>) district.
// Bangkok includes full districts. Expand as needed with authoritative data.
// ------------------------------------------------------------
interface ThailandProvinceSeed {
  name: string;
  districts: string[];
}

const THAILAND_PROVINCES: ThailandProvinceSeed[] = [
  {
    name: 'Bangkok',
    districts: [
      'Phra Nakhon',
      'Dusit',
      'Nong Chok',
      'Bang Rak',
      'Bang Khen',
      'Bang Kapi',
      'Pathum Wan',
      'Pom Prap Sattru Phai',
      'Phra Khanong',
      'Min Buri',
      'Lat Krabang',
      'Yan Nawa',
      'Samphanthawong',
      'Phaya Thai',
      'Thon Buri',
      'Bangkok Yai',
      'Huai Khwang',
      'Khlong San',
      'Taling Chan',
      'Bangkok Noi',
      'Bang Khun Thian',
      'Phasi Charoen',
      'Nong Khaem',
      'Rat Burana',
      'Bang Phlat',
      'Din Daeng',
      'Bueng Kum',
      'Sathon',
      'Bang Sue',
      'Chatuchak',
      'Bang Kho Laem',
      'Prawet',
      'Khlong Toei',
      'Suan Luang',
      'Chom Thong',
      'Don Mueang',
      'Ratchathewi',
      'Lat Phrao',
      'Watthana',
      'Bang Khae',
      'Lak Si',
      'Sai Mai',
      'Khan Na Yao',
      'Saphan Sung',
      'Wang Thonglang',
      'Khlong Sam Wa',
      'Bang Na',
      'Thawi Watthana',
      'Thung Khru',
      'Bang Bon',
    ],
  },
  { name: 'Amnat Charoen', districts: ['Mueang Amnat Charoen'] },
  { name: 'Ang Thong', districts: ['Mueang Ang Thong'] },
  { name: 'Bueng Kan', districts: ['Mueang Bueng Kan'] },
  { name: 'Buri Ram', districts: ['Mueang Buri Ram'] },
  { name: 'Chachoengsao', districts: ['Mueang Chachoengsao'] },
  { name: 'Chai Nat', districts: ['Mueang Chai Nat'] },
  { name: 'Chaiyaphum', districts: ['Mueang Chaiyaphum'] },
  { name: 'Chanthaburi', districts: ['Mueang Chanthaburi'] },
  { name: 'Chiang Mai', districts: ['Mueang Chiang Mai'] },
  { name: 'Chiang Rai', districts: ['Mueang Chiang Rai'] },
  { name: 'Chon Buri', districts: ['Mueang Chon Buri'] },
  { name: 'Chumphon', districts: ['Mueang Chumphon'] },
  { name: 'Kalasin', districts: ['Mueang Kalasin'] },
  { name: 'Kamphaeng Phet', districts: ['Mueang Kamphaeng Phet'] },
  { name: 'Kanchanaburi', districts: ['Mueang Kanchanaburi'] },
  { name: 'Khon Kaen', districts: ['Mueang Khon Kaen'] },
  { name: 'Krabi', districts: ['Mueang Krabi'] },
  { name: 'Lampang', districts: ['Mueang Lampang'] },
  { name: 'Lamphun', districts: ['Mueang Lamphun'] },
  { name: 'Loei', districts: ['Mueang Loei'] },
  { name: 'Lopburi', districts: ['Mueang Lopburi'] },
  { name: 'Mae Hong Son', districts: ['Mueang Mae Hong Son'] },
  { name: 'Maha Sarakham', districts: ['Mueang Maha Sarakham'] },
  { name: 'Mukdahan', districts: ['Mueang Mukdahan'] },
  { name: 'Nakhon Nayok', districts: ['Mueang Nakhon Nayok'] },
  { name: 'Nakhon Pathom', districts: ['Mueang Nakhon Pathom'] },
  { name: 'Nakhon Phanom', districts: ['Mueang Nakhon Phanom'] },
  { name: 'Nakhon Ratchasima', districts: ['Mueang Nakhon Ratchasima'] },
  { name: 'Nakhon Sawan', districts: ['Mueang Nakhon Sawan'] },
  { name: 'Nakhon Si Thammarat', districts: ['Mueang Nakhon Si Thammarat'] },
  { name: 'Nan', districts: ['Mueang Nan'] },
  { name: 'Narathiwat', districts: ['Mueang Narathiwat'] },
  { name: 'Nong Bua Lamphu', districts: ['Mueang Nong Bua Lamphu'] },
  { name: 'Nong Khai', districts: ['Mueang Nong Khai'] },
  { name: 'Nonthaburi', districts: ['Mueang Nonthaburi'] },
  { name: 'Pathum Thani', districts: ['Mueang Pathum Thani'] },
  { name: 'Pattani', districts: ['Mueang Pattani'] },
  { name: 'Phang Nga', districts: ['Mueang Phang Nga'] },
  { name: 'Phatthalung', districts: ['Mueang Phatthalung'] },
  { name: 'Phayao', districts: ['Mueang Phayao'] },
  { name: 'Phetchabun', districts: ['Mueang Phetchabun'] },
  { name: 'Phetchaburi', districts: ['Mueang Phetchaburi'] },
  { name: 'Phichit', districts: ['Mueang Phichit'] },
  { name: 'Phitsanulok', districts: ['Mueang Phitsanulok'] },
  { name: 'Phrae', districts: ['Mueang Phrae'] },
  { name: 'Phuket', districts: ['Mueang Phuket'] },
  { name: 'Prachinburi', districts: ['Mueang Prachinburi'] },
  { name: 'Prachuap Khiri Khan', districts: ['Mueang Prachuap Khiri Khan'] },
  { name: 'Ranong', districts: ['Mueang Ranong'] },
  { name: 'Ratchaburi', districts: ['Mueang Ratchaburi'] },
  { name: 'Rayong', districts: ['Mueang Rayong'] },
  { name: 'Roi Et', districts: ['Mueang Roi Et'] },
  { name: 'Sa Kaeo', districts: ['Mueang Sa Kaeo'] },
  { name: 'Sakon Nakhon', districts: ['Mueang Sakon Nakhon'] },
  { name: 'Samut Prakan', districts: ['Mueang Samut Prakan'] },
  { name: 'Samut Sakhon', districts: ['Mueang Samut Sakhon'] },
  { name: 'Samut Songkhram', districts: ['Mueang Samut Songkhram'] },
  { name: 'Saraburi', districts: ['Mueang Saraburi'] },
  { name: 'Satun', districts: ['Mueang Satun'] },
  { name: 'Sing Buri', districts: ['Mueang Sing Buri'] },
  { name: 'Sisaket', districts: ['Mueang Sisaket'] },
  { name: 'Songkhla', districts: ['Mueang Songkhla'] },
  { name: 'Sukhothai', districts: ['Mueang Sukhothai'] },
  { name: 'Suphan Buri', districts: ['Mueang Suphan Buri'] },
  { name: 'Surat Thani', districts: ['Mueang Surat Thani'] },
  { name: 'Surin', districts: ['Mueang Surin'] },
  { name: 'Tak', districts: ['Mueang Tak'] },
  { name: 'Trang', districts: ['Mueang Trang'] },
  { name: 'Trat', districts: ['Mueang Trat'] },
  { name: 'Ubon Ratchathani', districts: ['Mueang Ubon Ratchathani'] },
  { name: 'Udon Thani', districts: ['Mueang Udon Thani'] },
  { name: 'Uthai Thani', districts: ['Mueang Uthai Thani'] },
  { name: 'Uttaradit', districts: ['Mueang Uttaradit'] },
  { name: 'Yala', districts: ['Mueang Yala'] },
  { name: 'Yasothon', districts: ['Mueang Yasothon'] },
];

async function seedThailandGeography() {
  // Insert country Thailand if not exists
  const countryRows = await AppDataSource.query<{ id: string }[]>(
    `INSERT INTO country (id, name, status)
     VALUES (gen_random_uuid(), 'Thailand', 'active')
     ON CONFLICT (id) DO NOTHING
     RETURNING id;`,
  );
  let thId: string | undefined = countryRows[0]?.id;
  if (!thId) {
    const existing = await AppDataSource.query<{ id: string }[]>(
      `SELECT id FROM country WHERE name = $1 LIMIT 1;`,
      ['Thailand'],
    );
    thId = existing[0]?.id;
  }
  if (!thId) throw new Error('Failed to resolve Thailand country id');

  for (const prov of THAILAND_PROVINCES) {
    let provId: string | undefined;
    const existingProv = await AppDataSource.query<{ id: string }[]>(
      `SELECT id FROM province WHERE name = $1 AND country_id = $2 LIMIT 1;`,
      [prov.name, thId],
    );
    if (existingProv.length) {
      provId = existingProv[0].id;
    } else {
      const inserted = await AppDataSource.query<{ id: string }[]>(
        `INSERT INTO province (id, name, country_id, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'active', NOW(), NOW())
         RETURNING id;`,
        [prov.name, thId],
      );
      provId = inserted[0].id;
    }
    if (!provId) continue;
    for (const distName of prov.districts) {
      const existingDist = await AppDataSource.query<{ id: string }[]>(
        `SELECT id FROM district WHERE name = $1 AND province_id = $2 LIMIT 1;`,
        [distName, provId],
      );
      if (existingDist.length) continue;
      await AppDataSource.query(
        `INSERT INTO district (id, name, postcode, province_id, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, NULL, $2, 'active', NOW(), NOW());`,
        [distName, provId],
      );
    }
  }
  console.log('Thailand geography seed completed');
}

async function seed() {
  await AppDataSource.initialize();
  // await seedBasePermissions();
  // await seedTestCustomersAndServices();
  // await seedDynamicServicePermissions();
  // await seedLaosGeography();
  await seedThailandGeography();
  console.log('Seed data inserted successfully');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
