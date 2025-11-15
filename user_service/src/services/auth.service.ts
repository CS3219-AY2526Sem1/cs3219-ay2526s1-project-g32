/* AI Assistance Disclosure:
Scope: Implementation of authentication service logic and integration with Supabase library.
Author Review: Validated for style and accuracy.
*/

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
  isAdmin: boolean;
};

const toPublicUser = (user: User | null): PublicUser | null => {
  if (!user) return null;

  const metadata =
    typeof user.user_metadata === 'object' && user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const isAdmin = Boolean(metadata.isAdmin);

  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
    userMetadata: metadata,
    isAdmin,
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
      isAdmin: false,
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

export const updateUserAdminStatus = async (userId: string, isAdmin: boolean) => {
  const { data: existing, error: fetchError } = await supabaseAdminClient.auth.admin.getUserById(userId);

  if (fetchError) {
    throw new HttpError(fetchError.status ?? 400, fetchError.message, fetchError);
  }

  const currentMetadata =
    existing?.user?.user_metadata && typeof existing.user.user_metadata === 'object'
      ? (existing.user.user_metadata as Record<string, unknown>)
      : {};

  const { data, error } = await supabaseAdminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      isAdmin,
    },
  });

  if (error) {
    throw new HttpError(error.status ?? 400, error.message, error);
  }

  const updated = toPublicUser(data.user);
  if (!updated) {
    throw new HttpError(500, 'Failed to read updated user metadata');
  }

  return updated;
};

export const getUserByEmail = async (email: string) => {
  // Supabase Auth API doesn't provide a direct getUserByEmail method
  // We need to list users and filter. Loop through all pages to ensure we check all users.
  let page = 1;
  const perPage = 1000; // Maximum allowed per page
  
  while (true) {
    const { data, error } = await supabaseAdminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new HttpError(error.status ?? 400, error.message, error);
    }

    const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      const publicUser = toPublicUser(user);
      
      if (!publicUser) {
        throw new HttpError(500, 'Failed to convert user to public format');
      }

      return publicUser;
    }

    // If we've received fewer users than perPage, we've reached the last page
    if (data.users.length < perPage) {
      break;
    }

    page++;
  }

  throw new HttpError(404, `User with email ${email} not found`);
};

export const updateUserAdminStatusByEmail = async (email: string, isAdmin: boolean) => {
  const user = await getUserByEmail(email);
  
  return updateUserAdminStatus(user.id, isAdmin);
};

export const updateUserPassword = async (userId: string, password: string) => {
  const { data, error } = await supabaseAdminClient.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    throw new HttpError(error.status ?? 400, error.message, error);
  }

  const updated = toPublicUser(data.user);
  if (!updated) {
    throw new HttpError(500, 'Failed to update user password');
  }

  return updated;
};
