import { ArticleStatus, PrismaClient } from '@prisma/client';
import { transferNews } from '../prisma/transfer-news.js';
import { slugify } from '../src/utils/slug.js';

const prisma = new PrismaClient();

async function main() {
  const author = await prisma.user.findUnique({ where: { email: 'reporter@2annews.test' } });
  if (!author) throw new Error('Akun reporter@2annews.test belum ada. Siapkan database demo sebelum mengimpor berita.');

  const tag = await prisma.tag.upsert({
    where: { slug: 'transfer' },
    create: { name: 'Transfer', slug: 'transfer' },
    update: {},
  });

  for (const news of transferNews) {
    const continentSlug = slugify(news.continent);
    const categorySlug = `transfer-${continentSlug}`;
    const category = await prisma.category.upsert({
      where: { slug: categorySlug },
      create: { name: `Transfer ${news.continent}`, slug: categorySlug, description: `Berita transfer klub sepak bola dari ${news.continent}.` },
      update: {},
    });
    const slug = slugify(news.title);
    const content = `<p>${news.summary}</p><p><strong>Sumber:</strong> <a href="${news.source}" target="_blank" rel="noreferrer">baca laporan sumber</a>.</p>`;
    const data = {
      authorId: author.id,
      categoryId: category.id,
      title: news.title,
      excerpt: news.excerpt,
      content,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(news.date),
    };

    await prisma.article.upsert({
      where: { slug },
      create: { ...data, slug, viewsCount: 0, tags: { create: [{ tagId: tag.id }] } },
      update: { ...data, tags: { deleteMany: {}, create: [{ tagId: tag.id }] } },
    });
  }

  console.log(`Berhasil menambahkan/memperbarui ${transferNews.length} berita transfer.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
