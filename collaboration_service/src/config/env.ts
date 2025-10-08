import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  HOST: z.string().optional(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  QUESTION_SERVICE_URL: z.string().url().default('http://localhost:4003/api/v1'),
  USER_SERVICE_URL: z.string().url().default('http://localhost:4001/api/v1'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required').default('dev-change-me'),
  SESSION_TOKEN_TTL_SECONDS: z.string().optional(),
  LOG_LEVEL: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
