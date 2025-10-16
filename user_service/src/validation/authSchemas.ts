import { z } from 'zod';

const emailField = z.string().email('Valid email required');

export const registerSchema = {
  body: z.object({
    email: emailField,
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    username: z.string().min(1, 'Username is required'),
    redirectTo: z.string().url('redirectTo must be a valid URL').optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: emailField,
    password: z.string().min(1, 'Password required'),
  }),
};

export const sendMagicLinkSchema = {
  body: z.object({
    email: emailField,
    redirectTo: z.string().url('redirectTo must be a valid URL').optional(),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    email: emailField,
    token: z
      .string()
      .length(6, 'OTP token must be 6 digits')
      .regex(/^[0-9]+$/, 'OTP token must be numeric'),
  }),
};

export const validateTokenSchema = {
  body: z.object({
    accessToken: z.string().min(1, 'accessToken is required'),
    userId: z.string().min(1, 'userId is required'),
  }),
};
