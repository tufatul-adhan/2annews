import { z } from 'zod';
export const registerSchema = z.object({ name: z.string().min(2).max(100), email: z.string().email(), password: z.string().min(8).max(100) });
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const profileSchema = z.object({ name: z.string().min(2).max(100), avatar: z.string().url().optional().nullable(), bio: z.string().max(1000).optional().nullable() });
