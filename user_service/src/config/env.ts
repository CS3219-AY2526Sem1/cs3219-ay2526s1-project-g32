import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';

// validate and parse environment variables with Zod
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  SUPABASE_URL: z.string().url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),
  INTERNAL_SERVICE_KEY: z.string().min(1, 'INTERNAL_SERVICE_KEY is required'),
});

const repoEnvPath = path.resolve(__dirname, '../../..', '.env');
if (existsSync(repoEnvPath)) {
  loadEnv({ path: repoEnvPath });
}

const serviceEnvPath = path.resolve(__dirname, '../../.env');
if (existsSync(serviceEnvPath)) {
  loadEnv({ path: serviceEnvPath, override: true });
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsedEnv.data;
