import { ArticleStatus, PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { recentNews } from '../prisma/seed.js';
import { slugify } from '../src/utils/slug.js';

const prisma = new PrismaClient();
const cutoff = new Date('2026-10-07T00:00:00Z');
const continents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];

async function main() {
  const newsItems = recentNews.filter(news => new Date(news.date) >= cutoff);
  const author = await prisma.user.findUnique({ where: { email: 'reporter@2annews.test' } });
  if (!author) throw new Error('Akun reporter@2annews.test belum ada. Siapkan database demo sebelum mengimpor berita.');

  for (const name of continents) {
    await prisma.category.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name), description: `Football news from ${name}.` }, update: {} });
    await prisma.tag.upsert({ where: { slug: slugify(name) }, create: { name, slug: slugify(name) }, update: {} });
  }

  for (const news of newsItems) {
    const category = await prisma.category.findUnique({ where: { name: news.category ?? 'Champions League' } });
    if (!category) throw new Error(`Kategori tidak ditemukan: ${news.category ?? 'Champions League'}`);
    const tagRows = await prisma.tag.findMany({ where: { name: { in: [...news.tags] } }, select: { id: true } });
    const club = news.club ? await prisma.club.findUnique({ where: { name: news.club }, select: { id: true } }) : null;
    const slug = slugify(news.title);
    const hasScore = Boolean(news.home && news.away && news.score);
    const headline = hasScore ? `<strong>${news.home} ${news.score} ${news.away}</strong>` : `<strong>${news.title}</strong>`;
    const content = `<p>${headline} merupakan pembaruan sepak bola terbaru yang masuk dalam rangkuman 2anNews.</p><p>${news.summary ?? ''}</p><p><strong>Sumber:</strong> <a href="${news.source}" target="_blank" rel="noreferrer">baca laporan sumber</a>.</p>`;
    const data = {
      authorId: author.id,
      categoryId: category.id,
      title: news.title,
      excerpt: news.excerpt ?? news.title,
      content,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(news.date),
      ...(club ? { clubId: club.id } : {}),
      ...(news.imageFile ? { thumbnail: `/api/articles/${slug}/image` } : {}),
    };

    const article = await prisma.article.upsert({
      where: { slug },
      create: { ...data, slug, viewsCount: 0, tags: { create: tagRows.map(({ id }) => ({ tagId: id })) } },
      update: { ...data, tags: { deleteMany: {}, create: tagRows.map(({ id }) => ({ tagId: id })) } },
    });
    if (news.imageFile) {
      const imageBytes = await readFile(resolve(process.cwd(), 'prisma', 'assets', 'news', news.imageFile));
      const mimeType = news.imageFile.toLowerCase().endsWith('.png') ? 'image/png' : news.imageFile.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      await prisma.articleImage.upsert({
        where: { articleId: article.id },
        create: { articleId: article.id, mimeType, data: Uint8Array.from(imageBytes), altText: news.imageAlt ?? news.title, credit: news.imageCredit, sourceUrl: news.imageSourceUrl },
        update: { mimeType, data: Uint8Array.from(imageBytes), altText: news.imageAlt ?? news.title, credit: news.imageCredit, sourceUrl: news.imageSourceUrl },
      });
    }
  }

  console.log(`Berhasil menambahkan/memperbarui ${newsItems.length} berita terbaru.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
