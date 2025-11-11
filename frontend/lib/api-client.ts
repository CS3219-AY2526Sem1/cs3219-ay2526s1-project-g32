const API_BASE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL ?? 'http://localhost:4001/api/v1';
const MATCHING_SERVICE_URL = process.env.NEXT_PUBLIC_MATCHING_SERVICE_URL ?? 'http://localhost:3002/api/v1/matching';
const QUESTION_SERVICE_URL = process.env.NEXT_PUBLIC_QUESTION_SERVICE_URL ?? 'http://localhost:4003/api/v1/questions';
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
  isAdmin: boolean;
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

export type UserAttemptRecord = {
  user_id: string;
  session_attempt_id: string;
};

export type HistoryListResponse = {
  attempts: UserAttemptRecord[];
};

export type SessionAttemptRecord = {
  id: string;
  match_id: string | null;
  question_id: number | null;
  question_title: string | null;
  started_at: string | null;
  ended_at: string | null;
  code_python: string | null;
  code_c: string | null;
  code_cpp: string | null;
  code_java: string | null;
  code_javascript: string | null;
  participants?: Record<string, unknown> | null;
};

export type SessionAttemptDetailResponse = {
  attempt: SessionAttemptRecord;
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

export const setAdminStatus = async (userId: string, isAdmin: boolean, accessToken: string) =>
  handleResponse<{ user: PublicUser }>(
    await fetch(withBaseUrl(`/auth/users/${userId}/admin`), {
      method: 'PATCH',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ isAdmin }),
    }),
  );

export const setAdminStatusByEmail = async (email: string, isAdmin: boolean, accessToken: string) =>
  handleResponse<{ user: PublicUser }>(
    await fetch(withBaseUrl('/auth/admin/set-by-email'), {
      method: 'PATCH',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, isAdmin }),
    }),
  );

export const fetchUserHistory = async (accessToken: string) =>
  handleResponse<HistoryListResponse>(
    await fetch(withBaseUrl('/history'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );

export const fetchSessionAttemptDetail = async (sessionAttemptId: string, accessToken: string) =>
  handleResponse<SessionAttemptDetailResponse>(
    await fetch(withBaseUrl(`/history/${sessionAttemptId}`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );

// Matching Service API Types
export type CreateMatchRequest = {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  displayName: string;
};

export type MatchResponse = {
  status: 'success' | 'pending';
  message: string;
  sessionId?: string;
  matchedWith?: string;
};

export type MatchStatusResponse = {
  status: 'pending' | 'success' | 'not_found';
  sessionId?: string;
  // prompt indicates backend is asking user whether to expand search to other difficulties
  prompt?: boolean;
};

export type CancelMatchRequest = {
  topic: string;
};

// Matching Service API Functions
const withMatchingUrl = (path: string) => `${MATCHING_SERVICE_URL}${path}`;

export const startMatchmaking = async (
  topic: string,
  difficulty: string,
  accessToken: string,
  displayName: string,
) =>
  handleResponse<MatchResponse>(
    await fetch(withMatchingUrl('/requests'), {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ topic, difficulty, displayName }),
    }),
  );

export const getMatchStatus = async (userId: string, accessToken: string) =>
  handleResponse<MatchStatusResponse>(
    await fetch(withMatchingUrl(`/requests/${userId}/status`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );

export const cancelMatch = async (topic: string, accessToken: string) =>
  handleResponse<{ message: string }>(
    await fetch(withMatchingUrl('/requests'), {
      method: 'DELETE',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ topic }),
    }),
  );

export const acceptExpand = async (topic: string, accessToken: string) =>
  handleResponse<{ message: string }>(
    await fetch(withMatchingUrl('/requests/expand'), {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ topic }),
    }),
  );

// Question Service API Types
export type CreateQuestionPayload = {
  title: string;
  slug: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  starter_python?: string;
  starter_c?: string;
  starter_cpp?: string;
  starter_java?: string;
  starter_javascript?: string;
};

export type Question = {
  id: number;
  title: string;
  slug: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  starterCode?: {
    python?: string;
    c?: string;
    cpp?: string;
    java?: string;
    javascript?: string;
  };
};

export type QuestionResponse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  topics: string[];
  starterCode: {
    python: string | null;
    c: string | null;
    cpp: string | null;
    java: string | null;
    javascript: string | null;
  };
};

export type QuestionsListResponse = {
  questions: QuestionResponse[];
  total: number;
  limit: number;
  offset: number;
};

// Question Service API Functions
const withQuestionUrl = (path: string) => `${QUESTION_SERVICE_URL}${path}`;

export const createQuestion = async (payload: CreateQuestionPayload) =>
  handleResponse<QuestionResponse>(
    await fetch(withQuestionUrl(''), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );

export const getQuestions = async (params?: {
  title?: string;
  difficulty?: string;
  topic?: string;
  limit?: number;
  offset?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.title) queryParams.append('title', params.title);
  if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
  if (params?.topic) queryParams.append('topic', params.topic);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const url = queryParams.toString() 
    ? `${withQuestionUrl('')}?${queryParams.toString()}`
    : withQuestionUrl('');

  return handleResponse<QuestionsListResponse>(
    await fetch(url, {
      method: 'GET',
      headers: jsonHeaders,
    }),
  );
};

export const getQuestionById = async (id: number) =>
  handleResponse<QuestionResponse>(
    await fetch(withQuestionUrl(`/${id}`), {
      method: 'GET',
      headers: jsonHeaders,
    }),
  );

export const getQuestionBySlug = async (slug: string) =>
  handleResponse<QuestionResponse>(
    await fetch(withQuestionUrl(`/slug/${slug}`), {
      method: 'GET',
      headers: jsonHeaders,
    }),
  );

export const updateQuestion = async (id: number, payload: Partial<CreateQuestionPayload>) =>
  handleResponse<QuestionResponse>(
    await fetch(withQuestionUrl(`/${id}`), {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );

export const deleteQuestion = async (id: number) =>
  handleResponse<{ message: string }>(
    await fetch(withQuestionUrl(`/${id}`), {
      method: 'DELETE',
      headers: jsonHeaders,
    }),
  );

export const getRandomQuestion = async (params?: {
  difficulty?: string;
  topic?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
  if (params?.topic) queryParams.append('topic', params.topic);

  const url = queryParams.toString()
    ? `${withQuestionUrl('/random')}?${queryParams.toString()}`
    : withQuestionUrl('/random');

  return handleResponse<QuestionResponse>(
    await fetch(url, {
      method: 'GET',
      headers: jsonHeaders,
    }),
  );
};


