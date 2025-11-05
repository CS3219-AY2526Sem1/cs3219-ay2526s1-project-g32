import { z } from 'zod';

// Define valid difficulty levels
const difficultyEnum = z.enum(['Easy', 'Medium', 'Hard'], {
  message: 'Difficulty must be Easy, Medium, or Hard'
});

// Define valid topics (kept in sync with Question Service topics)
const topicEnum = z.enum([
  'Array',
  'Backtracking',
  'Binary Search',
  'Binary Tree',
  'Bit Manipulation',
  'Bitmask',
  'Breadth-First Search',
  'Counting',
  'Concurrency',
  'Design',
  'Divide and Conquer',
  'Dynamic Programming',
  'Enumeration',
  'Game Theory',
  'Geometry',
  'Greedy',
  'Graph',
  'Hash Table',
  'Heap (Priority Queue)',
  'Linked List',
  'Matrix',
  'Math',
  'Monotonic Stack',
  'Ordered Set',
  'Prefix Sum',
  'Recursion',
  'Segment Tree',
  'Shell',
  'Simulation',
  'Sliding Window',
  'Sorting',
  'Stack',
  'String',
  'Topological Sort',
  'Tree',
  'Two Pointers',
  'Union Find'
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
 * Note: userId comes from authentication, not request body
 */
export const createMatchRequestSchema = {
  body: z.object({
    difficulty: difficultyEnum,
    topic: topicEnum,
  }),
};

/**
 * Schema for canceling a match request
 * DELETE /api/v1/matching/requests
 * Note: userId comes from authentication, not request body
 */
export const deleteMatchRequestSchema = {
  body: z.object({
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

/**
 * Schema for accepting expand prompt
 * POST /api/v1/matching/requests/expand
 */
export const expandMatchSchema = {
  body: z.object({
    topic: topicEnum,
  }),
};

// Export types for TypeScript integration
export type CreateMatchRequest = z.infer<typeof createMatchRequestSchema.body>;
export type DeleteMatchRequest = z.infer<typeof deleteMatchRequestSchema.body>;
export type GetMatchStatusParams = z.infer<typeof getMatchStatusSchema.params>;
export type HandleRequeueRequest = z.infer<typeof handleRequeueSchema.body>;