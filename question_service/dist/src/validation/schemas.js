"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = exports.QuestionIdParamSchema = exports.GetRandomQuestionQuerySchema = exports.GetQuestionsQuerySchema = exports.UpdateQuestionSchema = exports.CreateQuestionSchema = exports.TopicsArraySchema = exports.TopicSchema = exports.DifficultySchema = void 0;
const zod_1 = require("zod");
// Difficulty enum schema
exports.DifficultySchema = zod_1.z.enum(['Easy', 'Medium', 'Hard'], {
    message: 'Difficulty must be one of: Easy, Medium, Hard',
});
// Topic schema - string with minimum length
exports.TopicSchema = zod_1.z.string().min(1, 'Topic cannot be empty').max(50, 'Topic too long');
// Topics array schema
exports.TopicsArraySchema = zod_1.z.array(exports.TopicSchema)
    .min(1, 'At least one topic is required')
    .max(10, 'Maximum 10 topics allowed');
// Question creation schema
exports.CreateQuestionSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(1, 'Title is required')
        .max(200, 'Title must be less than 200 characters')
        .trim(),
    description: zod_1.z.string()
        .min(10, 'Description must be at least 10 characters')
        .max(5000, 'Description must be less than 5000 characters')
        .trim(),
    difficulty: exports.DifficultySchema,
    topics: exports.TopicsArraySchema,
    image_url: zod_1.z.string().url('Invalid URL format').optional().or(zod_1.z.literal('')).transform(val => val === '' ? undefined : val),
});
// Question update schema (all fields optional except at least one must be provided)
exports.UpdateQuestionSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(1, 'Title cannot be empty')
        .max(200, 'Title must be less than 200 characters')
        .trim()
        .optional(),
    description: zod_1.z.string()
        .min(10, 'Description must be at least 10 characters')
        .max(5000, 'Description must be less than 5000 characters')
        .trim()
        .optional(),
    difficulty: exports.DifficultySchema.optional(),
    topics: exports.TopicsArraySchema.optional(),
    image_url: zod_1.z.string().url('Invalid URL format').optional().or(zod_1.z.literal('')).transform(val => val === '' ? undefined : val),
}).refine((data) => Object.values(data).some(value => value !== undefined), { message: 'At least one field must be provided for update' });
// Query parameters schema for filtering questions
exports.GetQuestionsQuerySchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    difficulty: exports.DifficultySchema.optional(),
    topic: zod_1.z.string().optional(),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
    offset: zod_1.z.string().regex(/^\d+$/, 'Offset must be a non-negative number').transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional(),
});
// Random question query schema
exports.GetRandomQuestionQuerySchema = zod_1.z.object({
    difficulty: exports.DifficultySchema.optional(),
    topic: zod_1.z.string().optional(),
});
// ID parameter schema
exports.QuestionIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, 'ID must be a positive number').transform(Number),
});
// Environment variables schema
exports.EnvSchema = zod_1.z.object({
    SUPABASE_URL: zod_1.z.string().url('Invalid Supabase URL'),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1, 'Supabase service role key is required'),
    PORT: zod_1.z.coerce.number().positive().default(3001),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).optional().default('development'),
});
