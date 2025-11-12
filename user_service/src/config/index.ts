import { env } from './env';

const parsePort = (value: string | undefined): number => {
  if (!value) return 4001;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4001;
};

const parseAllowedOrigins = (origins: string | undefined): string[] => {
  if (!origins) return [];
  return origins
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

export const config = {
  nodeEnv: env.NODE_ENV,
  port: parsePort(env.PORT),
  baseApiPath: '/api/v1',
  cors: {
    allowedOrigins: parseAllowedOrigins(env.CORS_ALLOWED_ORIGINS),
  },
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: env.SUPABASE_JWT_SECRET,
  },
  internalServiceKey: env.INTERNAL_SERVICE_KEY,
};
