import type { AuthResponse, User } from '@supabase/supabase-js';

import { HttpError } from '../utils/httpError';
import { supabaseAdminClient, supabaseAnonClient } from './supabaseClient';

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  redirectTo?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type SendOtpInput = {
  email: string;
  redirectTo?: string;
};

type VerifyOtpInput = {
  email: string;
  token: string;
};

const toPublicUser = (user: User | null) => {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    userMetadata: user.user_metadata ?? {},
  };
};

const handleAuthResponse = (response: AuthResponse, defaultStatus = 400) => {
  if (response.error) {
    throw new HttpError(
      response.error.status ?? defaultStatus,
      response.error.message,
      response.error,
    );
  }

  return response.data;
};

export const registerUser = async ({
  email,
  password,
  firstName,
  lastName,
  redirectTo,
}: RegisterInput) => {
  const { data, error } = await supabaseAdminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      firstName,
      lastName,
    },
  });

  if (error) {
    throw new HttpError(error.status ?? 400, error.message, error);
  }

  const otpResponse = await supabaseAdminClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (otpResponse.error) {
    throw new HttpError(
      otpResponse.error.status ?? 400,
      otpResponse.error.message,
      otpResponse.error,
    );
  }

  return {
    user: toPublicUser(data.user),
    verificationEmailSent: true,
  };
};

export const loginUser = async ({ email, password }: LoginInput) => {
  const response = await supabaseAnonClient.auth.signInWithPassword({
    email,
    password,
  });

  const data = handleAuthResponse(response, 401);

  if (!data.session) {
    throw new HttpError(500, 'Session missing from Supabase response');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    tokenType: data.session.token_type,
    user: toPublicUser(data.user),
  };
};

export const sendOtp = async ({ email, redirectTo }: SendOtpInput) => {
  const response = await supabaseAdminClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (response.error) {
    throw new HttpError(
      response.error.status ?? 400,
      response.error.message,
      response.error,
    );
  }

  return { verificationEmailSent: true };
};

export const verifyOtp = async ({ email, token }: VerifyOtpInput) => {
  const response = await supabaseAdminClient.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  const data = handleAuthResponse(response);
  const session = data.session;

  return {
    user: toPublicUser(data.user),
    session: session
      ? {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
          tokenType: session.token_type,
        }
      : null,
  };
};
