import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'] as const;
for (const name of required) {
  if (!process.env[name] && process.env.NODE_ENV === 'production') throw new Error(`Missing ${name}`);
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
};
