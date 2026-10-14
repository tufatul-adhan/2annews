import type { Request, Response } from 'express';
import { ArticleStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { fail, ok, pagination } from '../utils/api.js';
import { activity } from '../utils/activity.js';
import { slugify } from '../utils/slug.js';
import { normalizeImageMimeType } from '../utils/image.js';
import { notify, notifyCmsUsers } from '../services/notifications.js';

const articleInput = z.object({ title: z.string().min(8).max(180), slug: z.string().optional(), excerpt: z.string().min(10).max(500), content: z.string().min(30), thumbnail: z.string().max(500).refine(value => !/^https?:\/\//i.test(value) && !value.startsWith('//'), 'Gambar artikel harus disimpan di server').optional().nullable(), categoryId: z.coerce.number().int().positive(), tagIds: z.array(z.coerce.number().int().positive()).default([]), clubId: z.coerce.number().int().positive().optional().nullable(), playerId: z.coerce.number().int().positive().optional().nullable(), leagueId: z.coerce.number().int().positive().optional().nullable(), seoTitle: z.string().max(180).optional().nullable(), seoDescription: z.string().max(300).optional().nullable() });
const include = { author: { select: { id: true, name: true, avatar: true } }, category: true, tags: { include: { tag: true } }, club: true, player: true, league: true, image: { select: { altText: true, credit: true, sourceUrl: true } }, _count: { select: { likes: true, comments: { where: { status: 'APPROVED' } }, ratings: true, bookmarks: true } } } satisfies Prisma.ArticleInclude;
const roleCanReview = (role: string) => ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(role);

export async function listArticles(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1)); const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const requestedStatus = typeof req.query.status === 'string' && Object.values(ArticleStatus).includes(req.query.status as ArticleStatus) ? req.query.status as ArticleStatus : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const league = typeof req.query.league === 'string' ? req.query.league : undefined;
  const club = typeof req.query.club === 'string' ? req.query.club : undefined;
  const orderBy = req.query.sort === 'oldest' ? { publishedAt: 'asc' as const } : req.query.sort === 'views' ? { viewsCount: 'desc' as const } : { publishedAt: 'desc' as const };
  const reviewer = roleCanReview(req.user?.role ?? '');
  const visibility: Prisma.ArticleWhereInput = reviewer
    ? (requestedStatus ? { status: requestedStatus } : {})
    : req.user
      ? (requestedStatus ? { status: requestedStatus, authorId: req.user.id } : { OR: [{ status: 'PUBLISHED' }, { authorId: req.user.id }] })
      : { status: 'PUBLISHED' };
  const where: Prisma.ArticleWhereInput = { AND: [visibility, ...(category ? [{ category: { slug: category } }] : []), ...(league ? [{ league: { slug: league } }] : []), ...(club ? [{ club: { slug: club } }] : []), ...(search ? [{ OR: [{ title: { contains: search } }, { content: { contains: search } }, { category: { name: { contains: search } } }, { club: { name: { contains: search } } }, { player: { name: { contains: search } } }, { league: { name: { contains: search } } }, { tags: { some: { tag: { name: { contains: search } } } } }] }] : [])] };
  const [data, total] = await prisma.$transaction([prisma.article.findMany({ where, include, orderBy, skip: (page - 1) * limit, take: limit }), prisma.article.count({ where })]);
  return res.json({ success: true, message: 'Operation successful', data, pagination: pagination(page, limit, total) });
}
export async function trending(_req: Request, res: Response) {
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const data = await prisma.article.findMany({ where: { status: 'PUBLISHED', publishedAt: { gte: cutoff } }, include, take: 50, orderBy: { publishedAt: 'desc' } });
  const ranked = data.map(article => {
    const ageDays = article.publishedAt ? Math.max(0, (Date.now() - article.publishedAt.getTime()) / 86400000) : 30;
    return { ...article, trendingScore: Math.round(article.viewsCount + article._count.likes * 3 + article._count.comments * 4 + Math.max(0, 30 - ageDays) * 2) };
  }).sort((a, b) => b.trendingScore - a.trendingScore);
  return ok(res, ranked);
}
export async function getArticle(req: Request, res: Response) {
  const key = String(req.params.id); const where = /^\d+$/.test(key) ? { id: Number(key) } : { slug: key };
  const article = await prisma.article.findUnique({ where, include: { ...include, revisions: roleCanReview(req.user?.role ?? '') ? { orderBy: { createdAt: 'desc' } } : false } });
  if (!article || (article.status !== 'PUBLISHED' && article.authorId !== req.user?.id && !roleCanReview(req.user?.role ?? ''))) return fail(res, 'Article not found', 404);
  const last = await prisma.articleView.findFirst({ where: { articleId: article.id, ipAddress: req.ip, viewedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } } });
  const countedView = !last;
  if (countedView) { await prisma.$transaction([prisma.articleView.create({ data: { articleId: article.id, userId: req.user?.id, ipAddress: req.ip, userAgent: req.get('user-agent') } }), prisma.article.update({ where: { id: article.id }, data: { viewsCount: { increment: 1 } } })]); }
  const related = await prisma.article.findMany({
    where: { status: 'PUBLISHED', id: { not: article.id }, OR: [{ categoryId: article.categoryId }, ...(article.clubId ? [{ clubId: article.clubId }] : []), ...(article.playerId ? [{ playerId: article.playerId }] : []), ...(article.leagueId ? [{ leagueId: article.leagueId }] : []), ...(article.tags.length ? [{ tags: { some: { tagId: { in: article.tags.map(({ tagId }) => tagId) } } } }] : [])] },
    include,
    orderBy: { publishedAt: 'desc' },
    take: 30,
  });
  const relatedArticles = related.map(candidate => ({ ...candidate, relevance: (article.clubId && candidate.clubId === article.clubId ? 16 : 0) + (article.playerId && candidate.playerId === article.playerId ? 8 : 0) + (article.leagueId && candidate.leagueId === article.leagueId ? 4 : 0) + (candidate.categoryId === article.categoryId ? 2 : 0) + candidate.tags.filter(({ tagId }) => article.tags.some(tag => tag.tagId === tagId)).length })).sort((a, b) => b.relevance - a.relevance || (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)).slice(0, 6);
  const [ratingStats, viewerRating] = await Promise.all([
    prisma.rating.aggregate({ where: { articleId: article.id }, _avg: { value: true }, _count: { _all: true } }),
    req.user ? prisma.rating.findUnique({ where: { articleId_userId: { articleId: article.id, userId: req.user.id } }, select: { value: true } }) : null,
  ]);
  const viewer = req.user ? await Promise.all([prisma.like.count({ where: { articleId: article.id, userId: req.user.id } }), prisma.bookmark.count({ where: { articleId: article.id, userId: req.user.id } })]) : [0, 0];
  return ok(res, { ...article, viewsCount: article.viewsCount + (countedView ? 1 : 0), rating: { average: ratingStats._avg.value ?? 0, count: ratingStats._count._all, viewer: viewerRating?.value ?? null }, viewer: { liked: viewer[0] > 0, bookmarked: viewer[1] > 0 }, relatedArticles });
}
export async function getArticleImage(req: Request, res: Response) {
  const key = String(req.params.id);
  const where = /^\d+$/.test(key) ? { id: Number(key) } : { slug: key };
  const article = await prisma.article.findUnique({ where, select: { id: true, status: true } });
  if (!article || article.status !== 'PUBLISHED') return fail(res, 'Article image not found', 404);
  const image = await prisma.articleImage.findUnique({ where: { articleId: article.id }, select: { data: true, mimeType: true } });
  if (!image) return fail(res, 'Article image not found', 404);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.type(image.mimeType).send(Buffer.from(image.data));
}
export async function saveArticleImage(req: Request, res: Response) {
  const articleId = Number(req.params.id);
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true, authorId: true, title: true, slug: true } });
  if (!article) return fail(res, 'Article not found', 404);
  if (article.authorId !== req.user!.id && !roleCanReview(req.user!.role)) return fail(res, 'You cannot edit this article', 403);
  if (!req.file) return fail(res, 'Pilih berkas gambar terlebih dahulu', 422);
  await prisma.articleImage.upsert({
    where: { articleId },
    create: { articleId, mimeType: normalizeImageMimeType(req.file.mimetype), data: Uint8Array.from(req.file.buffer), altText: article.title },
    update: { mimeType: normalizeImageMimeType(req.file.mimetype), data: Uint8Array.from(req.file.buffer), altText: article.title },
  });
  const thumbnail = `/api/articles/${article.slug}/image?v=${Date.now()}`;
  await prisma.article.update({ where: { id: articleId }, data: { thumbnail } });
  return ok(res, { articleId, thumbnail }, 'Gambar tersimpan di database');
}
export async function createArticle(req: Request, res: Response) {
  const input = articleInput.parse(req.body); const { tagIds, ...data } = input; const slug = slugify(input.slug || input.title);
  const uploadedImage = req.file;
  const article = await prisma.article.create({
    data: {
      ...data,
      ...(uploadedImage ? { thumbnail: `/api/articles/${slug}/image`, image: { create: { mimeType: normalizeImageMimeType(uploadedImage.mimetype), data: Uint8Array.from(uploadedImage.buffer), altText: input.title } } } : {}),
      slug,
      authorId: req.user!.id,
      tags: { create: tagIds.map(tagId => ({ tagId })) },
    },
    include,
  });
  await activity(req, 'CREATE_ARTICLE', 'Article', `Created ${article.title}`); return ok(res, article, 'Article draft created', 201);
}
export async function updateArticle(req: Request, res: Response) {
  const article = await prisma.article.findUnique({ where: { id: Number(req.params.id) } }); if (!article) return fail(res, 'Article not found', 404);
  if (article.authorId !== req.user!.id && !roleCanReview(req.user!.role)) return fail(res, 'You cannot edit this article', 403);
  if (!['DRAFT', 'REVISION'].includes(article.status) && !roleCanReview(req.user!.role)) return fail(res, 'Only drafts and revisions can be edited', 422);
  const input = articleInput.partial().parse(req.body); const { tagIds, ...data } = input;
  const updated = await prisma.article.update({ where: { id: article.id }, data: { ...data, ...(input.title || input.slug ? { slug: slugify(input.slug || input.title || article.title) } : {}), ...(tagIds ? { tags: { deleteMany: {}, create: tagIds.map(tagId => ({ tagId })) } } : {}), revisions: { create: { userId: req.user!.id, title: input.title ?? article.title, content: input.content ?? article.content, revisionNote: 'Article updated' } } }, include });
  await activity(req, 'UPDATE_ARTICLE', 'Article', `Updated ${updated.title}`); return ok(res, updated, 'Article updated');
}
export async function transition(req: Request, res: Response) {
  const article = await prisma.article.findUnique({ where: { id: Number(req.params.id) } }); if (!article) return fail(res, 'Article not found', 404);
  const action = String(req.params.action); const isReviewer = roleCanReview(req.user!.role);
  const transitions: Record<string, ArticleStatus> = { submit: 'SUBMITTED', approve: 'APPROVED', reject: 'REJECTED', revision: 'REVISION', publish: 'PUBLISHED', schedule: 'SCHEDULED', archive: 'ARCHIVED' };
  const next = transitions[action]; if (!next) return fail(res, 'Invalid workflow action', 404);
  if (action === 'submit' && (article.authorId !== req.user!.id || !['DRAFT', 'REVISION'].includes(article.status))) return fail(res, 'Article cannot be submitted in its current state', 422);
  if (action !== 'submit' && !isReviewer) return fail(res, 'Editor permission is required', 403);
  if (['approve', 'reject', 'revision'].includes(action) && !['SUBMITTED', 'UNDER_REVIEW'].includes(article.status)) return fail(res, 'Only submitted articles can be reviewed', 422);
  if (action === 'publish' && article.status !== 'APPROVED') return fail(res, 'Only approved articles can be published', 422);
  const body = z.object({ reason: z.string().max(500).optional(), scheduledAt: z.coerce.date().optional() }).parse(req.body);
  if (action === 'schedule' && (!body.scheduledAt || body.scheduledAt <= new Date() || article.status !== 'APPROVED')) return fail(res, 'An approved article needs a future schedule date', 422);
  const updated = await prisma.article.update({ where: { id: article.id }, data: { status: next, rejectionReason: action === 'reject' || action === 'revision' ? body.reason : null, publishedAt: action === 'publish' ? new Date() : undefined, scheduledAt: action === 'schedule' ? body.scheduledAt : undefined } });
  await activity(req, `${action.toUpperCase()}_ARTICLE`, 'Article', `${action} ${article.title}`);
  if (article.authorId !== req.user!.id) await notify(article.authorId, `ARTICLE_${action.toUpperCase()}`, `Article ${action}`, `Your article “${article.title}” was ${action}${body.reason ? `: ${body.reason}` : '.'}`);
  return ok(res, updated, `Article ${action}d`);
}
export async function deleteArticle(req: Request, res: Response) { const article = await prisma.article.findUnique({ where: { id: Number(req.params.id) } }); if (!article) return fail(res, 'Article not found', 404); if (article.authorId !== req.user!.id && !roleCanReview(req.user!.role)) return fail(res, 'You cannot delete this article', 403); await prisma.article.delete({ where: { id: article.id } }); await activity(req, 'DELETE_ARTICLE', 'Article', `Deleted ${article.title}`); return ok(res, null, 'Article deleted'); }
export async function toggleLike(req: Request, res: Response) { const articleId = Number(req.params.id); const key = { articleId_userId: { articleId, userId: req.user!.id } }; const existing = await prisma.like.findUnique({ where: key }); if (existing) { await prisma.like.delete({ where: key }); return ok(res, { liked: false }, 'Article unliked'); } await prisma.like.create({ data: { articleId, userId: req.user!.id } }); return ok(res, { liked: true }, 'Article liked'); }
export async function rateArticle(req: Request, res: Response) {
  const articleId = Number(req.params.id);
  if (!Number.isInteger(articleId) || articleId < 1) return fail(res, 'Invalid article id', 422);
  const { value } = z.object({ value: z.number().int().min(1).max(5) }).parse(req.body);
  const article = await prisma.article.findFirst({ where: { id: articleId, status: 'PUBLISHED' }, select: { id: true, title: true, slug: true, authorId: true } });
  if (!article) return fail(res, 'Article not found', 404);
  const ratingKey = { articleId_userId: { articleId, userId: req.user!.id } };
  const existingRating = await prisma.rating.findUnique({ where: ratingKey, select: { value: true } });
  const rating = await prisma.rating.upsert({
    where: ratingKey,
    create: { articleId, userId: req.user!.id, value },
    update: { value },
    select: { value: true },
  });
  if (!existingRating) {
    await notifyCmsUsers({
      type: 'RATING',
      title: 'Rating baru',
      message: `Pembaca memberi rating ${value}/5 untuk “${article.title}”.`,
      data: { articleId: article.id, articleSlug: article.slug, rating: value, ratingUserId: req.user!.id },
      articleAuthorId: article.authorId,
    });
  }
  return ok(res, rating, 'Rating saved');
}
export async function toggleBookmark(req: Request, res: Response) { const articleId = Number(req.params.id); const key = { articleId_userId: { articleId, userId: req.user!.id } }; const existing = await prisma.bookmark.findUnique({ where: key }); if (existing) { await prisma.bookmark.delete({ where: key }); return ok(res, { bookmarked: false }, 'Bookmark removed'); } await prisma.bookmark.create({ data: { articleId, userId: req.user!.id } }); return ok(res, { bookmarked: true }, 'Article bookmarked'); }
export async function bookmarks(req: Request, res: Response) { return ok(res, await prisma.bookmark.findMany({ where: { userId: req.user!.id }, include: { article: { include } }, orderBy: { createdAt: 'desc' } })); }
