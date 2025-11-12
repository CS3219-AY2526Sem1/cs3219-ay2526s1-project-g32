import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';

const repoEnvPath = path.resolve(__dirname, '../../..', '.env');
if (existsSync(repoEnvPath)) {
  loadEnv({ path: repoEnvPath });
}

const serviceEnvPath = path.resolve(__dirname, '../../.env');
if (existsSync(serviceEnvPath)) {
  loadEnv({ path: serviceEnvPath, override: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  HOST: z.string().optional(),
  REDIS_URL: z.string().url(),
  QUESTION_SERVICE_URL: z.string().url(),
  USER_SERVICE_URL: z.string().url(),
  USER_SERVICE_INTERNAL_KEY: z.string().min(1, 'USER_SERVICE_INTERNAL_KEY is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  SESSION_TOKEN_TTL_SECONDS: z.string().optional(),
  SESSION_GRACE_PERIOD_SECONDS: z.string().optional(),
  COLLAB_WS_BASE_URL: z.string().url(),
  LOG_LEVEL: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
