import dotenv from 'dotenv';

dotenv.config({ override: true });

if (process.env['NODE_ENV'] !== 'production') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

import { PrismaClient } from '@prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sslDisabled = /[?&]sslmode=disable(?:&|$)/i.test(connectionString);
const shouldUseInsecureSsl = !sslDisabled;

const poolConnectionString = (() => {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return connectionString;
  }
})();

const schema = (() => {
  try {
    const u = new URL(connectionString);
    return u.searchParams.get('schema') ?? undefined;
  } catch {
    return undefined;
  }
})();

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({
      connectionString: poolConnectionString,
      ...(schema ? { options: `-c search_path=${schema}` } : {}),
      ...(shouldUseInsecureSsl
        ? {
            ssl: {
              rejectUnauthorized: false,
            },
          }
        : {}),
    }),
  ),
});

async function main() {
  const club = await prisma.club.create({
    data: {
      name: 'Club Caribe',
      location: 'Punta Cana',
      isResort: false,
    },
  });

  await prisma.court.createMany({
    data: [
      { name: 'Court 1', price: 4000, clubId: club.id },
      { name: 'Court 2', price: 4000, clubId: club.id },
      { name: 'Court 3', price: 4500, clubId: club.id },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('Seed OK:', club.id);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
