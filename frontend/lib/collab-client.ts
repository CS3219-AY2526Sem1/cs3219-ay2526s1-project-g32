export type SessionParticipant = {
  userId: string;
  displayName?: string;
  connected: boolean;
};

export type QuestionSnapshot = {
  questionId: string;
  title: string;
  prompt: string;
  starterCode: Record<string, string>;
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    topics?: string[];
  };
};

export type SessionDocuments = {
  state: string;
  languages: Record<string, string>;
};

export type SessionSnapshot = {
  sessionId: string;
  matchId: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'pending' | 'active' | 'ended';
  question: QuestionSnapshot;
  documents: SessionDocuments;
  participants: SessionParticipant[];
  createdAt?: string;
  updatedAt?: string;
  endedAt?: string | null;
  expiresAt: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_COLLAB_SERVICE_URL ?? 'http://localhost:4010/api/v1';

const toUrl = (path: string) => `${BASE_URL.replace(/\/$/, '')}${path}`;

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (data as { message?: string }).message === 'string' ? (data as { message: string }).message : 'Request failed';
    throw new Error(message);
  }
  return data as T;
};

export const fetchSession = async (sessionId: string) =>
  handleResponse<SessionSnapshot>(await fetch(toUrl(`/sessions/${sessionId}`)));

export type SessionTokenResponse = {
  wsUrl: string;
  sessionToken: string;
  expiresIn: number;
};

export const requestSessionToken = async (sessionId: string, payload: { userId: string; accessToken: string }) =>
  handleResponse<SessionTokenResponse>(
    await fetch(toUrl(`/sessions/${sessionId}/token`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
  );

export type ActiveSessionResponse = {
  sessionId: string;
  expiresAt: string;
  question: {
    id: string;
    title: string;
  };
};

export const fetchActiveSessionForUser = async (
  payload: { userId: string; accessToken: string },
): Promise<ActiveSessionResponse | null> => {
  const response = await fetch(toUrl('/sessions/active'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<ActiveSessionResponse>(response);
};
