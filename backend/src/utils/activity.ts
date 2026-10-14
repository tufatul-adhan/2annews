import type { Request } from 'express';
import { prisma } from '../config/prisma.js';
export async function activity(req: Request, action: string, entity: string, description: string) {
  await prisma.activityLog.create({ data: { userId: req.user?.id, action, entity, description, ipAddress: req.ip, userAgent: req.get('user-agent') } });
}
