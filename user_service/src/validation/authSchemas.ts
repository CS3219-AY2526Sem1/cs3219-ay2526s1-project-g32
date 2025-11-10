import { z } from 'zod';

const emailField = z.string().email('Valid email required');
const passwordComplexityField = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
    'Password must include uppercase, lowercase, numeric, and symbol characters',
  );

export const registerSchema = {
  body: z.object({
    email: emailField,
    password: passwordComplexityField,
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

export const setAdminStatusSchema = {
  params: z.object({
    userId: z.string().min(1, 'userId is required'),
  }),
  body: z.object({
    isAdmin: z.boolean({
      invalid_type_error: 'isAdmin must be a boolean',
      required_error: 'isAdmin is required',
    }),
  }),
};

export const setAdminStatusByEmailSchema = {
  body: z.object({
    email: z.string().email('Valid email is required'),
    isAdmin: z.boolean({
      invalid_type_error: 'isAdmin must be a boolean',
      required_error: 'isAdmin is required',
    }),
  }),
};
