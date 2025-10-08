import { env } from './env';

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return 4010;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4010;
};

const parseHost = (value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    return '0.0.0.0';
  }

  return value;
};

const parseTtl = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  nodeEnv: env.NODE_ENV,
  http: {
    port: parsePort(env.PORT),
    host: parseHost(env.HOST),
  },
  redis: {
    url: env.REDIS_URL,
  },
  services: {
    question: {
      baseUrl: env.QUESTION_SERVICE_URL,
    },
    user: {
      baseUrl: env.USER_SERVICE_URL,
    },
  },
  jwt: {
    secret: env.JWT_SECRET,
    sessionTokenTtlSeconds: parseTtl(env.SESSION_TOKEN_TTL_SECONDS, 300),
  },
  logger: {
    level: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
};
