import { z } from 'zod';

export const EnvSchema = z.object({
  // Server Configuration
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'Supabase JWT secret is required'),
  
  // Logging Configuration
  LOG_LEVEL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;