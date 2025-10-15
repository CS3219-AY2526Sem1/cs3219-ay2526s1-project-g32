import { z } from 'zod';

// Define valid difficulty levels
const difficultyEnum = z.enum(['Easy', 'Medium', 'Hard'], {
  message: 'Difficulty must be Easy, Medium, or Hard'
});

// Define valid topics (you can expand this list)
const topicEnum = z.enum([
  'Arrays', 
  'Strings', 
  'Linked Lists', 
  'Trees', 
  'Graphs', 
  'Dynamic Programming',
  'Sorting',
  'Searching',
  'Hash Tables',
  'Stacks and Queues'
], {
  message: 'Invalid topic selected'
});

// User ID validation
const userIdField = z.string()
  .min(1, 'User ID is required')
  .max(50, 'User ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'User ID can only contain letters, numbers, hyphens, and underscores');

/**
 * Schema for creating a match request
 * POST /api/v1/matching/requests
 */
export const createMatchRequestSchema = {
  body: z.object({
    userId: userIdField,
    difficulty: difficultyEnum,
    topic: topicEnum,
  }),
};

/**
 * Schema for canceling a match request
 * DELETE /api/v1/matching/requests
 */
export const deleteMatchRequestSchema = {
  body: z.object({
    userId: userIdField,
    topic: topicEnum,
  }),
};

/**
 * Schema for checking match status
 * GET /api/v1/matching/requests/:userId/status
 */
export const getMatchStatusSchema = {
  params: z.object({
    userId: userIdField,
  }),
};

/**
 * Schema for re-queuing a user (internal service call)
 * POST /api/v1/matching/requeue
 */
export const handleRequeueSchema = {
  body: z.object({
    userId: userIdField,
    difficulty: difficultyEnum,
    topic: topicEnum,
  }),
};

// Export types for TypeScript integration
export type CreateMatchRequest = z.infer<typeof createMatchRequestSchema.body>;
export type DeleteMatchRequest = z.infer<typeof deleteMatchRequestSchema.body>;
export type GetMatchStatusParams = z.infer<typeof getMatchStatusSchema.params>;
export type HandleRequeueRequest = z.infer<typeof handleRequeueSchema.body>;