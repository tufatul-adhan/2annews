import fs from 'node:fs';
import cron from 'node-cron';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
fs.mkdirSync(env.uploadDir, { recursive: true });
cron.schedule('* * * * *', async () => { const now = new Date(); await prisma.article.updateMany({ where: { status: 'SCHEDULED', scheduledAt: { lte: now } }, data: { status: 'PUBLISHED', publishedAt: now } }); });
app.listen(env.port, () => console.log(`2anNews API on http://localhost:${env.port}`));
