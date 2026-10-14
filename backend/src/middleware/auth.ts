import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { fail } from '../utils/api.js';

type Token = { userId: number };
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return fail(res, 'Authentication required', 401);
  try {
    const { userId } = jwt.verify(token, env.jwtSecret) as Token;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user || user.status !== 'ACTIVE') return fail(res, 'Account is not active', 401);
    req.user = { id: user.id, name: user.name, email: user.email, roleId: user.roleId, status: user.status, role: user.role.name };
    return next();
  } catch { return fail(res, 'Invalid or expired token', 401); }
}

/** Identifies a token-bearing visitor while keeping public endpoints available. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next();
  try {
    const { userId } = jwt.verify(token, env.jwtSecret) as Token;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (user?.status === 'ACTIVE') req.user = { id: user.id, name: user.name, email: user.email, roleId: user.roleId, status: user.status, role: user.role.name };
  } catch { /* Invalid stale tokens must not block public content. */ }
  return next();
}
export function authorize(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return fail(res, 'Authentication required', 401);
    if (req.user.role === 'SUPER_ADMIN') return next();
    const allowed = await prisma.rolePermission.count({ where: { roleId: req.user.roleId, permission: { name: { in: permissions } } } });
    return allowed ? next() : fail(res, 'You do not have permission for this action', 403);
  };
}
