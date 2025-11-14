/* AI Assistance Disclosure:
Scope: Implement API client functions for lightweight wrapper to pass to pages.
Author Review: Validated for style and accuracy.
*/

const QUESTION_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_QUESTION_SERVICE_URL ?? 'http://localhost:4003/api/v1/questions';

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');
const questionBase = normalizeBaseUrl(QUESTION_SERVICE_BASE_URL);

export type QuestionDetail = {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  topics: string[];
  starterCode?: {
    python?: string | null;
    c?: string | null;
    cpp?: string | null;
    java?: string | null;
    javascript?: string | null;
  };
};

const handleQuestionResponse = async (response: Response): Promise<QuestionDetail> => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : typeof data?.message === 'string'
          ? data.message
          : 'Failed to fetch question';
    throw new Error(message);
  }

  return data as QuestionDetail;
};

export const fetchQuestionById = async (questionId: number): Promise<QuestionDetail> => {
  const response = await fetch(`${questionBase}/${questionId}`);
  return handleQuestionResponse(response);
};
