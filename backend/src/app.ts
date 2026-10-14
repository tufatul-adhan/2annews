import express from 'express';
import cors from 'cors';
import * as helmetModule from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';

const helmet = helmetModule.default;

export const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.json({ limit: '1mb' }));

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), env.uploadDir), {
    index: false,
    fallthrough: false
  })
);

app.get('/health', (_req, res) =>
  res.json({
    success: true,
    data: { status: 'ok' }
  })
);

app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);