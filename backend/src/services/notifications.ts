import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
export const notify = (userId: number, type: string, title: string, message: string, data?: object) => prisma.notification.create({ data: { userId, type, title, message, data } });

export async function notifyCmsUsers(input: {
  type: 'COMMENT' | 'RATING';
  title: string;
  message: string;
  data: Record<string, string | number>;
  articleAuthorId: number;
}) {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        OR: [
          { role: { is: { name: { in: ['SUPER_ADMIN', 'ADMIN', 'EDITOR'] } } } },
          { id: input.articleAuthorId },
        ],
      },
      select: { id: true },
    });
    if (!recipients.length) return;
    await prisma.notification.createMany({
      data: recipients.map(({ id }) => ({
        userId: id,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data as Prisma.InputJsonValue,
      })),
    });
  } catch (error) {
    console.error('Gagal menyimpan notifikasi CMS:', error);
  }
}
