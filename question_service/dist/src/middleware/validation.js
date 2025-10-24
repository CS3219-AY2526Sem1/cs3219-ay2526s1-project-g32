"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRandomQuestionQuery = exports.validateQuestionsQuery = exports.validateQuestionId = exports.validateUpdateQuestion = exports.validateCreateQuestion = void 0;
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
// Middleware factory for validating request data using Zod schemas
function validateRequest(schema, source = 'body') {
    return (req, res, next) => {
        try {
            const dataToValidate = req[source];
            const validatedData = schema.parse(dataToValidate);
            // Replace the original data with validated data
            req[source] = validatedData;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorMessages = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errorMessages,
                });
            }
            // Handle unexpected errors
            return res.status(500).json({
                error: 'Internal server error during validation',
            });
        }
    };
}
// Specific validation middlewares for common use cases
exports.validateCreateQuestion = validateRequest(zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters').trim(),
    difficulty: zod_1.z.enum(['Easy', 'Medium', 'Hard'], { message: 'Difficulty must be one of: Easy, Medium, Hard' }),
    topics: zod_1.z.array(zod_1.z.string().min(1, 'Topic cannot be empty').max(50, 'Topic too long')).min(1, 'At least one topic is required').max(10, 'Maximum 10 topics allowed'),
    image_url: zod_1.z.string().url('Invalid URL format').optional().or(zod_1.z.literal('')).transform(val => val === '' ? undefined : val),
}), 'body');
exports.validateUpdateQuestion = validateRequest(zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title cannot be empty').max(200, 'Title must be less than 200 characters').trim().optional(),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters').trim().optional(),
    difficulty: zod_1.z.enum(['Easy', 'Medium', 'Hard'], { message: 'Difficulty must be one of: Easy, Medium, Hard' }).optional(),
    topics: zod_1.z.array(zod_1.z.string().min(1, 'Topic cannot be empty').max(50, 'Topic too long')).min(1, 'At least one topic is required').max(10, 'Maximum 10 topics allowed').optional(),
    image_url: zod_1.z.string().url('Invalid URL format').optional().or(zod_1.z.literal('')).transform(val => val === '' ? undefined : val),
}).refine((data) => Object.values(data).some(value => value !== undefined), { message: 'At least one field must be provided for update' }), 'body');
exports.validateQuestionId = validateRequest(zod_1.z.object({
    id: zod_1.z.string().regex(/^\d+$/, 'ID must be a positive number').transform(Number),
}), 'params');
exports.validateQuestionsQuery = validateRequest(zod_1.z.object({
    title: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(['Easy', 'Medium', 'Hard']).optional(),
    topic: zod_1.z.string().optional(),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
    offset: zod_1.z.string().regex(/^\d+$/, 'Offset must be a non-negative number').transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional(),
}), 'query');
exports.validateRandomQuestionQuery = validateRequest(zod_1.z.object({
    difficulty: zod_1.z.enum(['Easy', 'Medium', 'Hard']).optional(),
    topic: zod_1.z.string().optional(),
}), 'query');
