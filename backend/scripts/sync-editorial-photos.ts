import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { recentNews } from '../prisma/seed.js';
import { slugify } from '../src/utils/slug.js';

const prisma = new PrismaClient();
const photoFiles = new Set([
  'indonesia-bangladesh-9-2.jpg',
  'thailand-philippines-asean-cup.jpg',
  'japan-ecuador-friendly.jpg',
  'premier-league-international-players.jpg',
]);

async function main() {
  let synced = 0;
  for (const news of recentNews.filter(item => item.imageFile && photoFiles.has(item.imageFile))) {
    const slug = slugify(news.title);
    const article = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (!article || !news.imageFile) {
      console.log(`Lewati ${slug}: artikel belum ada di database.`);
      continue;
    }

    const data = Uint8Array.from(await readFile(resolve(process.cwd(), 'prisma', 'assets', 'news', news.imageFile)));
    await prisma.$transaction([
      prisma.article.update({ where: { id: article.id }, data: { thumbnail: `/api/articles/${slug}/image` } }),
      prisma.articleImage.upsert({
        where: { articleId: article.id },
        create: { articleId: article.id, mimeType: 'image/jpeg', data, altText: news.imageAlt ?? news.title, credit: news.imageCredit, sourceUrl: news.imageSourceUrl },
        update: { mimeType: 'image/jpeg', data, altText: news.imageAlt ?? news.title, credit: news.imageCredit, sourceUrl: news.imageSourceUrl },
      }),
    ]);
    synced += 1;
    console.log(`Foto berita disinkronkan: ${news.title}`);
  }
  console.log(`Selesai: ${synced} foto diperbarui.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
