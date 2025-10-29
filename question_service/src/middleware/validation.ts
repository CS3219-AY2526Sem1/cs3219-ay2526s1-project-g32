import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Middleware factory for validating request data using Zod schemas
export function validateRequest<T extends ZodSchema>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];
      const validatedData = schema.parse(dataToValidate);
      
      // Only replace if it's body or params (query is read-only in Express 5)
      if (source === 'body' || source === 'params') {
        req[source] = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
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
      console.error('[Validation Error] Unexpected error:', error);
      console.error('[Validation Error] Request:', {
        method: req.method,
        path: req.path,
        source,
        data: req[source]
      });
      
      return res.status(500).json({
        error: 'Internal server error during validation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// Specific validation middlewares for common use cases
export const validateCreateQuestion = validateRequest(
  z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters').trim(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard'], { message: 'Difficulty must be one of: Easy, Medium, Hard' }),
    topics: z.array(z.string().min(1, 'Topic cannot be empty').max(50, 'Topic too long')).min(1, 'At least one topic is required').max(10, 'Maximum 10 topics allowed'),
    image_url: z.union([z.string().url('Invalid URL format'), z.literal(''), z.undefined()]).transform(val => val === '' || val === undefined ? undefined : val),
  }),
  'body'
);

export const validateUpdateQuestion = validateRequest(
  z.object({
    title: z.string().min(1, 'Title cannot be empty').max(200, 'Title must be less than 200 characters').trim().optional(),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters').trim().optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard'], { message: 'Difficulty must be one of: Easy, Medium, Hard' }).optional(),
    topics: z.array(z.string().min(1, 'Topic cannot be empty').max(50, 'Topic too long')).min(1, 'At least one topic is required').max(10, 'Maximum 10 topics allowed').optional(),
    image_url: z.union([z.string().url('Invalid URL format'), z.literal(''), z.undefined()]).transform(val => val === '' || val === undefined ? undefined : val),
  }).refine(
    (data) => Object.values(data).some(value => value !== undefined),
    { message: 'At least one field must be provided for update' }
  ),
  'body'
);

export const validateQuestionId = validateRequest(
  z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a positive number').transform(Number),
  }),
  'params'
);

export const validateQuestionsQuery = validateRequest(
  z.object({
    title: z.string().optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    topic: z.string().optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
    offset: z.string().regex(/^\d+$/, 'Offset must be a non-negative number').transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional(),
  }),
  'query'
);

export const validateRandomQuestionQuery = validateRequest(
  z.object({
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    topic: z.string().optional(),
  }).partial(),
  'query'
);