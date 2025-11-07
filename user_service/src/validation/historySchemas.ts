import { z } from 'zod';

export const historyDetailSchema = {
  params: z.object({
    sessionAttemptId: z.string().uuid('sessionAttemptId must be a valid UUID'),
  }),
};
