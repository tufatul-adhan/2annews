import type { Request, Response } from 'express';
import { CommentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { fail, ok, pagination } from '../utils/api.js';
import { activity } from '../utils/activity.js';
import { slugify } from '../utils/slug.js';
import { notifyCmsUsers } from '../services/notifications.js';
import bcrypt from 'bcrypt';

const taxonomy = z.object({ name: z.string().min(2).max(80), slug: z.string().optional(), description: z.string().max(500).optional().nullable(), image: z.string().optional().nullable() });
const commentSchema = z.object({ articleId: z.coerce.number().int().positive(), parentId: z.coerce.number().int().positive().optional().nullable(), content: z.string().min(2).max(2000), name: z.string().min(2).max(80).optional(), email: z.string().email().optional() });
const chatMessageSchema = z.object({ content: z.string().trim().min(1).max(500), name: z.string().trim().min(2).max(40).optional() });
export const listCategories = async (_req: Request, res: Response) => ok(res, await prisma.category.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, include: { _count: { select: { articles: true } } } }));
export const listTags = async (_req: Request, res: Response) => ok(res, await prisma.tag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { articles: true } } } }));
export async function createCategory(req: Request, res: Response) { const data = taxonomy.parse(req.body); return ok(res, await prisma.category.create({ data: { ...data, slug: slugify(data.slug || data.name) } }), 'Category created', 201); }
export async function updateCategory(req: Request, res: Response) { const data = taxonomy.partial().parse(req.body); return ok(res, await prisma.category.update({ where: { id: Number(req.params.id) }, data: { ...data, ...(data.name || data.slug ? { slug: slugify(data.slug || data.name || '') } : {}) } }), 'Category updated'); }
export const deleteCategory = async (req: Request, res: Response) => { await prisma.category.delete({ where: { id: Number(req.params.id) } }); return ok(res, null, 'Category deleted'); };
export async function createTag(req: Request, res: Response) { const data = taxonomy.pick({ name: true, slug: true }).parse(req.body); return ok(res, await prisma.tag.create({ data: { ...data, slug: slugify(data.slug || data.name) } }), 'Tag created', 201); }
export const deleteTag = async (req: Request, res: Response) => { await prisma.tag.delete({ where: { id: Number(req.params.id) } }); return ok(res, null, 'Tag deleted'); };
export async function listComments(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page ?? 1)); const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const articleId = typeof req.query.articleId === 'string' ? Number(req.query.articleId) : undefined;
  if (articleId !== undefined && (!Number.isInteger(articleId) || articleId < 1)) return fail(res, 'Invalid article id', 422);
  const canModerate = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(req.user?.role ?? '');
  const requestedStatus = typeof req.query.status === 'string' && Object.values(CommentStatus).includes(req.query.status as CommentStatus) ? req.query.status as CommentStatus : undefined;
  if (!canModerate && requestedStatus && requestedStatus !== 'APPROVED') return fail(res, 'Comment moderation permission is required', 403);
  const where = { ...(articleId ? { articleId } : {}), ...(!canModerate || requestedStatus ? { status: requestedStatus ?? 'APPROVED' } : {}) };
  const replies = { where: canModerate ? {} : { status: 'APPROVED' as const }, select: { id: true, content: true, createdAt: true, user: { select: { name: true } } } };
  const [data, total] = await Promise.all([prisma.comment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, select: { id: true, articleId: true, userId: true, parentId: true, name: true, content: true, status: true, createdAt: true, updatedAt: true, user: { select: { name: true, avatar: true } }, article: { select: { title: true, slug: true } }, replies } }), prisma.comment.count({ where })]);
  return res.json({ success: true, message: 'Operation successful', data, pagination: pagination(page, limit, total) });
}
export async function createComment(req: Request, res: Response) {
  const data = commentSchema.parse(req.body);
  if (!req.user && (!data.name || !data.email)) return fail(res, 'Name and email are required for guest comments', 422);
  const article = await prisma.article.findUnique({ where: { id: data.articleId }, select: { id: true, title: true, slug: true, authorId: true } });
  if (!article) return fail(res, 'Article not found', 404);
  const comment = await prisma.comment.create({
    data: { ...data, userId: req.user?.id, status: 'APPROVED' },
    include: { user: { select: { name: true, avatar: true } } },
  });
  const commenter = comment.user?.name ?? comment.name ?? 'Pembaca';
  await notifyCmsUsers({
    type: 'COMMENT',
    title: 'Komentar baru',
    message: `${commenter} mengomentari “${article.title}”.`,
    data: { articleId: article.id, articleSlug: article.slug, commentId: comment.id },
    articleAuthorId: article.authorId,
  });
  return ok(res, comment, 'Comment submitted', 201);
}
export async function listChatMessages(_req: Request, res: Response) {
  const messages = await prisma.chatMessage.findMany({ take: 60, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, content: true, createdAt: true, userId: true } });
  return ok(res, messages.reverse());
}
export async function createChatMessage(req: Request, res: Response) {
  const data = chatMessageSchema.parse(req.body);
  if (!req.user && !data.name) return fail(res, 'Nama diperlukan untuk mengirim pesan', 422);
  const message = await prisma.chatMessage.create({ data: { content: data.content, name: req.user?.name ?? data.name!, userId: req.user?.id }, select: { id: true, name: true, content: true, createdAt: true, userId: true } });
  return ok(res, message, 'Pesan terkirim', 201);
}
export async function moderateComment(req: Request, res: Response) { const statusByAction = { approve: 'APPROVED', reject: 'REJECTED', spam: 'SPAM' } as const; const status = statusByAction[String(req.params.action) as keyof typeof statusByAction]; if (!status) return fail(res, 'Aksi moderasi tidak valid', 422); const comment = await prisma.comment.update({ where: { id: Number(req.params.id) }, data: { status } }); await activity(req, 'MODERATE_COMMENT', 'Comment', `${status} comment ${comment.id}`); return ok(res, comment, 'Comment moderated'); }
export const deleteComment = async (req: Request, res: Response) => { await prisma.comment.delete({ where: { id: Number(req.params.id) } }); return ok(res, null, 'Comment deleted'); };
export async function notifications(req: Request, res: Response) { const data = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 30 }); const unreadCount = data.filter(n => !n.readAt).length; return ok(res, { items: data, unreadCount }); }
export async function readNotification(req: Request, res: Response) { const notification = await prisma.notification.findFirst({ where: { id: Number(req.params.id), userId: req.user!.id } }); if (!notification) return fail(res, 'Notification not found', 404); return ok(res, await prisma.notification.update({ where: { id: notification.id }, data: { readAt: new Date() } }), 'Notification read'); }
export const readAllNotifications = async (req: Request, res: Response) => { await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } }); return ok(res, null, 'Notifications marked read'); };
export async function overview(_req: Request, res: Response) { const [articles, published, review, users, views, comments, likes, transfers, clubs, players, matches] = await prisma.$transaction([prisma.article.count(), prisma.article.count({ where: { status: 'PUBLISHED' } }), prisma.article.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }), prisma.user.count(), prisma.articleView.count(), prisma.comment.count(), prisma.like.count(), prisma.transfer.count(), prisma.club.count(), prisma.player.count(), prisma.match.count()]); return ok(res, { articles, published, review, users, views, comments, likes, transfers, clubs, players, matches }); }
export async function analytics(_req: Request, res: Response) { const [daily, categories, popular] = await Promise.all([prisma.articleView.groupBy({ by: ['viewedAt'], _count: true, orderBy: { viewedAt: 'desc' }, take: 30 }), prisma.category.findMany({ include: { _count: { select: { articles: true } } }, take: 10 }), prisma.article.findMany({ where: { status: 'PUBLISHED' }, take: 8, orderBy: { viewsCount: 'desc' }, select: { title: true, viewsCount: true } })]); const byDay = new Map<string, number>(); for (const item of daily) { const day = item.viewedAt.toISOString().slice(0, 10); byDay.set(day, (byDay.get(day) ?? 0) + item._count); } return ok(res, { views: [...byDay].map(([date, count]) => ({ date, count })).reverse(), categories: categories.map(category => ({ name: category.name, value: category._count.articles })), popular }); }
const settingKeys = ['siteName', 'tagline', 'description', 'logo', 'favicon', 'contactEmail', 'facebookUrl', 'instagramUrl', 'youtubeUrl', 'xUrl', 'articlesPerPage', 'commentsEnabled', 'maintenanceMode'];
export async function settings(_req: Request, res: Response) { const rows = await prisma.setting.findMany(); return ok(res, Object.fromEntries(rows.map(row => [row.key, row.value]))); }
export async function updateSettings(req: Request, res: Response) { const values = z.record(z.string(), z.string().max(2000)).parse(req.body); const data = Object.entries(values).filter(([key]) => settingKeys.includes(key)); await prisma.$transaction(data.map(([key, value]) => prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }))); await activity(req, 'UPDATE_SETTINGS', 'Setting', 'Updated site settings'); return settings(req, res); }
export const activityLogs = async (_req: Request, res: Response) => ok(res, await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
const userSelect = { id: true, name: true, email: true, avatar: true, bio: true, status: true, createdAt: true, updatedAt: true, roleId: true, role: true } as const;
export async function listUsers(req: Request, res: Response) { const q = typeof req.query.search === 'string' ? req.query.search : ''; return ok(res, await prisma.user.findMany({ where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}, select: userSelect, orderBy: { createdAt: 'desc' }, take: 50 })); }
export const listRoles = async (_req: Request, res: Response) => ok(res, await prisma.role.findMany({ select: { id: true, name: true }, orderBy: { id: 'asc' } }));
export async function createUser(req: Request, res: Response) { const data = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), roleId: z.coerce.number().int().positive(), status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).default('ACTIVE') }).parse(req.body); const user = await prisma.user.create({ data: { ...data, password: await bcrypt.hash(data.password, 12) }, select: userSelect }); await activity(req, 'CREATE_USER', 'User', `Created ${user.email}`); return ok(res, user, 'User created', 201); }
export async function updateUser(req: Request, res: Response) { const data = z.object({ name: z.string().min(2).optional(), roleId: z.coerce.number().int().positive().optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'BANNED']).optional() }).parse(req.body); const target = await prisma.user.findUniqueOrThrow({ where: { id: Number(req.params.id) }, include: { role: true } }); if (target.role.name === 'SUPER_ADMIN' && req.user!.role !== 'SUPER_ADMIN') return fail(res, 'Administrators cannot modify Super Admins', 403); return ok(res, await prisma.user.update({ where: { id: target.id }, data, select: userSelect }), 'User updated'); }
export const deleteUser = async (req: Request, res: Response) => { const target = await prisma.user.findUniqueOrThrow({ where: { id: Number(req.params.id) }, include: { role: true } }); if (target.role.name === 'SUPER_ADMIN') return fail(res, 'Super Admin cannot be deleted', 403); await prisma.user.delete({ where: { id: target.id } }); return ok(res, null, 'User deleted'); };
