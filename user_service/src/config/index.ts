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
  nodeEnv: process.env.NODE_ENV ?? 'development', // set to 'development' for now
  port: parsePort(process.env.PORT),
  baseApiPath: '/api/v1',
  cors: {
    allowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  },
};
