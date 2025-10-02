import type { AuthResponse, User } from '@supabase/supabase-js';

import { HttpError } from '../utils/httpError';
import { supabaseAdminClient, supabaseAnonClient } from './supabaseClient';

type RegisterInput = {
  email: string;
  password: string;
  username: string;
  redirectTo?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type SendMagicLinkInput = {
  email: string;
  redirectTo?: string;
};

export type PublicUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  createdAt: string;
  userMetadata: Record<string, unknown>;
};

const toPublicUser = (user: User | null): PublicUser | null => {
  if (!user) return null;

  const metadata =
    typeof user.user_metadata === 'object' && user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    userMetadata: metadata,
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

export const sendMagicLink = async ({ email, redirectTo }: SendMagicLinkInput) => {
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

  return { magicLinkSent: true };
};

export const registerUser = async ({
  email,
  password,
  username,
  redirectTo,
}: RegisterInput) => {
  const { data, error } = await supabaseAdminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      username,
    },
  });

  if (error) {
    throw new HttpError(error.status ?? 400, error.message, error);
  }

  await sendMagicLink({ email, redirectTo });

  return {
    user: toPublicUser(data.user),
    magicLinkSent: true,
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

export const getUserById = async (userId: string) => {
  const { data, error } = await supabaseAdminClient.auth.admin.getUserById(userId);

  if (error) {
    throw new HttpError(error.status ?? 400, error.message, error);
  }

  return toPublicUser(data.user);
};
