import { Position, PrismaClient, TransferStatus, TransferType } from '@prisma/client';
import { slugify } from '../src/utils/slug.js';

const prisma = new PrismaClient();

const recentTransfers = [
  {
    name: 'Ajara Nchout Njoya', nationality: 'Cameroon', position: Position.FORWARD,
    date: '2026-10-08', toClub: { name: 'Lekie FF', slug: 'lekie-ff', shortName: 'Lekie FF', country: 'Cameroon', continent: 'Africa' },
    type: TransferType.PERMANENT, status: TransferStatus.CONFIRMED,
    description: 'Announced 8 October 2026 by CAF. Cameroon international returns to the domestic league to join Lekie FF. Source: https://www.cafonline.com/womens-football/news/ajara-nchout-njoya-returns-to-cameroon-with-lekie-ff/',
  },
  {
    name: 'Uche Agbo', nationality: 'Nigeria', position: Position.MIDFIELDER,
    date: '2026-10-08', toClub: { name: 'Hapoel Rishon LeZion FC', slug: 'hapoel-rishon-lezion-fc', shortName: 'Hapoel Rishon', country: 'Israel', continent: 'Asia' },
    type: TransferType.FREE_TRANSFER, status: TransferStatus.CONFIRMED,
    description: 'Introduced by the club on 6 October and reported on 8 October 2026. The Nigerian midfielder joined as a free agent on a reported two-year contract. Source: https://footy-africa.com/uche-agbo-joins-israeli-side-rishon-on-two-year-deal/',
  },
  {
    name: 'Rabbi Matondo', nationality: 'Wales', position: Position.FORWARD,
    date: '2026-10-07', toClub: { name: 'Hibernian FC', slug: 'hibernian-fc', shortName: 'Hibernian', country: 'Scotland', continent: 'Europe' },
    type: TransferType.FREE_TRANSFER, status: TransferStatus.CONFIRMED,
    description: 'Signed a permanent deal through the end of the 2026/27 campaign, subject to standard clearance checks. Source: https://www.hibernianfc.co.uk/news/2026/october/07/rabbi-matondo-signs-for-hibs/',
  },
  {
    name: 'Abdoulaye Doucouré', nationality: 'Mali', position: Position.MIDFIELDER,
    date: '2026-10-09', toClub: { name: 'Charlotte FC', slug: 'charlotte-fc', shortName: 'Charlotte FC', country: 'United States', continent: 'North America' },
    type: TransferType.FREE_TRANSFER, status: TransferStatus.CONFIRMED,
    description: 'Signed through the end of the 2026 MLS season as a free agent. Source: https://www.charlottefootballclub.com/news/charlotte-fc-signs-three-players-prior-to-mls-roster-freeze-deadline',
  },
  {
    name: 'Marcos Rojo', nationality: 'Argentina', position: Position.DEFENDER,
    date: '2026-10-09', fromClub: { slug: 'racing-club' }, toClub: { slug: 'estudiantes-lp' },
    type: TransferType.FREE_TRANSFER, status: TransferStatus.COMPLETED,
    description: 'Signed his contract with Estudiantes on 9 October 2026 after arriving from Racing as a free agent. Source: https://estudiantesdelaplata.com/marcos-rojo-vuelve-a-estudiantes/',
  },
  {
    name: 'Taiyo Hisamatsu', nationality: 'Japan', position: Position.MIDFIELDER,
    date: '2026-10-13', toClub: { slug: 'central-coast-mariners' },
    type: TransferType.PERMANENT, status: TransferStatus.CONFIRMED,
    description: 'Signed with Central Coast Mariners on 13 October 2026; joining the squad is subject to the required work visa and permit. Previously played for SKN St. Pölten Amateure. Source: https://ccmariners.com.au/news/mariners-add-japanese-attacking-talent-taiyo-hisamatsu/',
  },
];

async function getOrCreateClub(club: { slug: string; name?: string; shortName?: string; country?: string; continent?: string }) {
  const existing = await prisma.club.findUnique({ where: { slug: club.slug } });
  if (existing) return existing;
  if (!club.name || !club.shortName || !club.country || !club.continent) {
    throw new Error(`Club ${club.slug} is missing and has no creation details.`);
  }
  return prisma.club.create({ data: {
    slug: club.slug,
    name: club.name,
    shortName: club.shortName,
    country: club.country,
    continent: club.continent,
    status: 'ACTIVE',
  } });
}

async function main() {
  for (const item of recentTransfers) {
    const destination = await getOrCreateClub(item.toClub);
    const source = item.fromClub ? await getOrCreateClub(item.fromClub) : null;
    const playerSlug = slugify(item.name);
    const player = await prisma.player.upsert({
      where: { slug: playerSlug },
      create: { name: item.name, slug: playerSlug, nationality: item.nationality, position: item.position, clubId: destination.id },
      update: { name: item.name, nationality: item.nationality, position: item.position, clubId: destination.id },
    });
    const transferDate = new Date(`${item.date}T12:00:00.000Z`);
    const existingTransfer = await prisma.transfer.findFirst({
      where: { playerId: player.id, transferDate: { gte: new Date(`${item.date}T00:00:00.000Z`), lt: new Date(`${item.date}T23:59:59.999Z`) } },
    });
    const data = {
      playerId: player.id,
      fromClubId: source?.id ?? null,
      toClubId: destination.id,
      transferDate,
      transferType: item.type,
      status: item.status,
      currency: 'EUR',
      description: item.description,
    };
    if (existingTransfer) await prisma.transfer.update({ where: { id: existingTransfer.id }, data });
    else await prisma.transfer.create({ data });
  }

  console.log(`Berhasil menambahkan/memperbarui ${recentTransfers.length} transfer pemain.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
