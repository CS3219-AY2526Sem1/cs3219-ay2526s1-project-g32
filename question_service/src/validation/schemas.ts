/* AI Assistance Disclosure:
Scope: Generation of validation schemas with predefined constraints.
Author Review: Validated for style and accuracy.
*/

import { z } from 'zod';

// Difficulty enum schema
export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard'], {
  message: 'Difficulty must be one of: Easy, Medium, Hard',
});

// Topic schema - string with minimum length
export const TopicSchema = z.string().min(1, 'Topic cannot be empty').max(50, 'Topic too long');

// Topics array schema
export const TopicsArraySchema = z.array(TopicSchema)
  .min(1, 'At least one topic is required')
  .max(10, 'Maximum 10 topics allowed');

// Question creation schema
export const CreateQuestionSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .trim(),
  slug: z.string()
    .min(1, 'Slug is required')
    .trim(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .trim(),
  difficulty: DifficultySchema,
  topics: TopicsArraySchema,
  starter_python: z.string().optional(),
  starter_c: z.string().optional(),
  starter_cpp: z.string().optional(),
  starter_java: z.string().optional(),
  starter_javascript: z.string().optional(),
});

// Question update schema (all fields optional except at least one must be provided)
export const UpdateQuestionSchema = z.object({
  title: z.string()
    .min(1, 'Title cannot be empty')
    .trim()
    .optional(),
  slug: z.string()
    .min(1, 'Slug cannot be empty')
    .trim()
    .optional(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .trim()
    .optional(),
  difficulty: DifficultySchema.optional(),
  topics: TopicsArraySchema.optional(),
  starter_python: z.string().optional(),
  starter_c: z.string().optional(),
  starter_cpp: z.string().optional(),
  starter_java: z.string().optional(),
  starter_javascript: z.string().optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  { message: 'At least one field must be provided for update' }
);

// Query parameters schema for filtering questions
export const GetQuestionsQuerySchema = z.object({
  title: z.string().optional(),
  difficulty: DifficultySchema.optional(),
  topic: z.string().optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  offset: z.string().regex(/^\d+$/, 'Offset must be a non-negative number').transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional(),
});

// Random question query schema
export const GetRandomQuestionQuerySchema = z.object({
  difficulty: DifficultySchema.optional(),
  topic: z.string().optional(),
});

// ID parameter schema
export const QuestionIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive number').transform(Number),
});

// Slug parameter schema
export const QuestionSlugParamSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only (e.g., two-sum, reverse-linked-list)')
    .max(100, 'Slug cannot exceed 100 characters'),
});

// Environment variables schema
export const EnvSchema = z.object({
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  PORT: z.coerce.number().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

// Type exports for use in controllers
export type CreateQuestionInput = z.infer<typeof CreateQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionSchema>;
export type GetQuestionsQuery = z.infer<typeof GetQuestionsQuerySchema>;
export type GetRandomQuestionQuery = z.infer<typeof GetRandomQuestionQuerySchema>;
export type QuestionIdParam = z.infer<typeof QuestionIdParamSchema>;
export type QuestionSlugParam = z.infer<typeof QuestionSlugParamSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;