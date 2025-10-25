import 'dotenv/config';
import { EnvSchema, type EnvConfig } from './env';

const parsePositiveNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return parsed > 0 ? parsed : defaultValue;
};

const env: EnvConfig = EnvSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV ?? 'development',
  
  http: {
    port: parsePositiveNumber(env.PORT, 4003),
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) ?? ['http://localhost:3000'],
  },
  
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: env.SUPABASE_JWT_SECRET,
  },
  
  logger: {
    level: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
};