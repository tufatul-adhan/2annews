import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
const cmsRoles = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'];

async function main() {
  const [cmsUsers, comments, ratings, existing] = await Promise.all([
    prisma.user.findMany({ where: { role: { is: { name: { in: cmsRoles } } } }, select: { id: true } }),
    prisma.comment.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      include: { article: { select: { id: true, title: true, slug: true, authorId: true } }, user: { select: { id: true, name: true } } },
    }),
    prisma.rating.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      include: { article: { select: { id: true, title: true, slug: true, authorId: true } } },
    }),
    prisma.notification.findMany({
      where: { type: { in: ['COMMENT', 'RATING'] }, createdAt: { gte: cutoff } },
      select: { userId: true, type: true, title: true, message: true, data: true },
    }),
  ]);

  const commentKeys = new Set<string>();
  const ratingKeys = new Set<string>();
  const legacyRatingKeys = new Set<string>();
  const commentTemplates = new Map<number, { title: string; message: string; data: Record<string, unknown> }>();
  for (const notification of existing) {
    const data = notification.data && typeof notification.data === 'object' ? notification.data as Record<string, unknown> : {};
    if (notification.type === 'COMMENT' && typeof data.commentId === 'number') {
      commentKeys.add(`${notification.userId}:${data.commentId}`);
      commentTemplates.set(data.commentId, { title: notification.title, message: notification.message, data });
    }
    if (notification.type === 'RATING' && typeof data.articleId === 'number') {
      if (typeof data.ratingUserId === 'number') ratingKeys.add(`${notification.userId}:${data.articleId}:${data.ratingUserId}`);
      else if (typeof data.rating === 'number') legacyRatingKeys.add(`${notification.userId}:${data.articleId}:${data.rating}`);
    }
  }

  const messages: Prisma.NotificationCreateManyInput[] = [];
  for (const [commentId, template] of commentTemplates) {
    for (const user of cmsUsers) {
      const key = `${user.id}:${commentId}`;
      if (commentKeys.has(key)) continue;
      commentKeys.add(key);
      messages.push({
        userId: user.id,
        type: 'COMMENT',
        title: template.title,
        message: template.message,
        data: template.data as Prisma.InputJsonValue,
      });
    }
  }

  for (const comment of comments) {
    const recipients = new Set([...cmsUsers.map(user => user.id), comment.article.authorId]);
    const commenter = comment.user?.name ?? comment.name ?? 'Pembaca';
    for (const userId of recipients) {
      const key = `${userId}:${comment.id}`;
      if (commentKeys.has(key)) continue;
      commentKeys.add(key);
      messages.push({
        userId,
        type: 'COMMENT',
        title: 'Komentar baru',
        message: `${commenter} mengomentari "${comment.article.title}".`,
        data: { articleId: comment.article.id, articleSlug: comment.article.slug, commentId: comment.id },
      });
    }
  }

  for (const rating of ratings) {
    const recipients = new Set([...cmsUsers.map(user => user.id), rating.article.authorId]);
    for (const userId of recipients) {
      const key = `${userId}:${rating.articleId}:${rating.userId}`;
      if (ratingKeys.has(key)) continue;
      const legacyKey = `${userId}:${rating.articleId}:${rating.value}`;
      if (legacyRatingKeys.has(legacyKey)) {
        legacyRatingKeys.delete(legacyKey);
        ratingKeys.add(key);
        continue;
      }
      ratingKeys.add(key);
      messages.push({
        userId,
        type: 'RATING',
        title: 'Rating baru',
        message: `Pembaca memberi rating ${rating.value}/5 untuk "${rating.article.title}".`,
        data: { articleId: rating.article.id, articleSlug: rating.article.slug, rating: rating.value, ratingUserId: rating.userId },
      });
    }
  }

  if (messages.length) await prisma.notification.createMany({ data: messages });
  console.log(`Notifikasi lama diselaraskan: ${messages.length} notifikasi dibuat.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
