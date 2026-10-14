import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { fail } from '../utils/api.js';
export function notFound(_req: Request, res: Response) { return fail(res, 'Rute tidak ditemukan', 404); }
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) return fail(res, 'Validasi gagal', 422, error.flatten());
  if (error instanceof multer.MulterError) return fail(res, error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran gambar maksimal 5 MB' : 'Format gambar harus JPG, JFIF, PNG, atau WebP', 422);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return fail(res, 'Data dengan nilai tersebut sudah ada', 409);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return fail(res, 'Data tidak ditemukan', 404);
  console.error(error);
  return fail(res, 'Terjadi kesalahan pada server', 500);
}
