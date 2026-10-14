import type { Request, Response } from 'express';
import path from 'node:path';
import { prisma } from '../config/prisma.js';
import { fail, ok } from '../utils/api.js';
import { activity } from '../utils/activity.js';
import { normalizeImageMimeType } from '../utils/image.js';
export const listMedia = async (req: Request, res: Response) => ok(res, await prisma.media.findMany({ where: typeof req.query.search === 'string' ? { originalName: { contains: req.query.search } } : {}, orderBy: { createdAt: 'desc' }, take: 50 }));
export async function uploadMedia(req: Request, res: Response) { if (!req.file) return fail(res, 'An image file is required', 422); const media = await prisma.media.create({ data: { userId: req.user!.id, filename: req.file.filename, originalName: req.file.originalname, filepath: `/uploads/${req.file.filename}`, mimeType: normalizeImageMimeType(req.file.mimetype), size: req.file.size, altText: typeof req.body.altText === 'string' ? req.body.altText : null } }); await activity(req, 'UPLOAD_MEDIA', 'Media', `Uploaded ${media.originalName}`); return ok(res, media, 'Media uploaded', 201); }
export async function deleteMedia(req: Request, res: Response) { const media = await prisma.media.delete({ where: { id: Number(req.params.id) } }); const fs = await import('node:fs/promises'); await fs.unlink(path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads', media.filename)).catch(() => undefined); return ok(res, null, 'Media deleted'); }
