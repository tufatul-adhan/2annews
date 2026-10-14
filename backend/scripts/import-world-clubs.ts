import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '../src/utils/slug.js';

type WorldClub = { name: string; shortName: string; country: string; continent: string };
const prisma = new PrismaClient();

async function main() {
  const rows = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../prisma/world-clubs.json'), 'utf8')) as WorldClub[];
  const result = await prisma.club.createMany({
    data: rows.map(club => ({
      ...club,
      slug: slugify(club.name),
      description: 'Listed in the OpenFootball public club directory; current active status and academy classification have not been verified.',
    })),
    skipDuplicates: true,
  });
  const continents = [...new Set(rows.map(club => club.continent))];
  let updated = 0;
  for (const continent of continents) {
    const names = rows.filter(club => club.continent === continent).map(club => club.name);
    const result = await prisma.club.updateMany({
      where: { name: { in: names }, continent: null },
      data: { continent },
    });
    updated += result.count;
  }
  console.log(`Imported ${result.count} clubs and added continent labels to ${updated} existing clubs from ${rows.length} directory records.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
