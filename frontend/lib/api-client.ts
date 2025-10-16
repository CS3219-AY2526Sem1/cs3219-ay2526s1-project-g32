const API_BASE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL ?? 'http://localhost:4001/api/v1';
const DEFAULT_VERIFY_REDIRECT =
  process.env.NEXT_PUBLIC_VERIFY_REDIRECT ?? 'http://localhost:3000/verify-success';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : 'Request failed';
    throw new Error(message);
  }

  return data as T;
};

export type RegisterPayload = {
  email: string;
  password: string;
  username: string;
  redirectTo?: string;
};

export type RegisterResponse = {
  user: PublicUser | null;
  verificationEmailSent: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type PublicUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  createdAt: string;
  userMetadata: Record<string, unknown>;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  user: PublicUser | null;
};

export type SendMagicLinkPayload = {
  email: string;
  redirectTo?: string;
};

export type SendMagicLinkResponse = {
  verificationEmailSent: boolean;
};

export type MeResponse = {
  user: PublicUser | null;
};

const withBaseUrl = (path: string) => `${API_BASE_URL}${path}`;

export const register = async (payload: RegisterPayload) =>
  handleResponse<RegisterResponse>(
    await fetch(withBaseUrl('/auth/register'), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        ...payload,
        redirectTo: payload.redirectTo ?? DEFAULT_VERIFY_REDIRECT,
      }),
    }),
  );

export const login = async (payload: LoginPayload) =>
  handleResponse<LoginResponse>(
    await fetch(withBaseUrl('/auth/login'), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );

export const resendMagicLink = async (payload: SendMagicLinkPayload) =>
  handleResponse<SendMagicLinkResponse>(
    await fetch(withBaseUrl('/auth/verification/resend'), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        ...payload,
        redirectTo: payload.redirectTo ?? DEFAULT_VERIFY_REDIRECT,
      }),
    }),
  );

export const fetchMe = async (accessToken: string) =>
  handleResponse<MeResponse>(
    await fetch(withBaseUrl('/auth/me'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );


