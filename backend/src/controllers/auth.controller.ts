import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { fail, ok } from '../utils/api.js';
import { activity } from '../utils/activity.js';
import { loginSchema, profileSchema, registerSchema } from '../validators/auth.js';
import { z } from 'zod';
const safe = (user: { id: number; name: string; email: string; avatar: string | null; bio: string | null; status: string; role: { name: string } }) => ({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, status: user.status, role: user.role.name });
const tokenFor = (id: number) => jwt.sign({ userId: id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: input.email } })) return fail(res, 'Email is already registered', 409);
  const reader = await prisma.role.findUniqueOrThrow({ where: { name: 'READER' } });
  const user = await prisma.user.create({ data: { ...input, password: await bcrypt.hash(input.password, 12), roleId: reader.id }, include: { role: true } });
  return ok(res, { user: safe(user), token: tokenFor(user.id) }, 'Account created', 201);
}
export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body); const user = await prisma.user.findUnique({ where: { email: input.email }, include: { role: true } });
  if (!user || !(await bcrypt.compare(input.password, user.password))) return fail(res, 'Invalid email or password', 401);
  if (user.status !== 'ACTIVE') return fail(res, 'Account is not active', 403);
  await activity(req, 'LOGIN', 'User', `${user.email} logged in`);
  return ok(res, { user: safe(user), token: tokenFor(user.id) }, 'Login successful');
}
export async function me(req: Request, res: Response) { const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, include: { role: true } }); return ok(res, safe(user)); }
export async function updateProfile(req: Request, res: Response) { const input = profileSchema.parse(req.body); const user = await prisma.user.update({ where: { id: req.user!.id }, data: input, include: { role: true } }); return ok(res, safe(user), 'Profile updated'); }
export async function updatePassword(req: Request, res: Response) {
  const input = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(100) }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(input.currentPassword, user.password))) return fail(res, 'Current password is incorrect', 422);
  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(input.newPassword, 12) } });
  return ok(res, null, 'Password updated');
}
