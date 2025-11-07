import { z } from 'zod';

export const historyDetailSchema = {
  params: z.object({
    sessionAttemptId: z.string().uuid('sessionAttemptId must be a valid UUID'),
  }),
};

export const createHistoryAttemptSchema = {
  body: z.object({
    sessionId: z.string().uuid(),
    matchId: z.string().optional().nullable(),
    questionId: z.number().int().optional().nullable(),
    startedAt: z.string().datetime().optional().nullable(),
    endedAt: z.string().datetime().optional().nullable(),
    participants: z
      .array(
        z.object({
          userId: z.string().min(1, 'participant.userId is required'),
          displayName: z.string().optional(),
        }),
      )
      .min(1, 'At least one participant is required'),
    code: z
      .object({
        python: z.string().optional().nullable(),
        c: z.string().optional().nullable(),
        cpp: z.string().optional().nullable(),
        java: z.string().optional().nullable(),
        javascript: z.string().optional().nullable(),
      })
      .optional(),
  }),
};
