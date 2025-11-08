import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';
import {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  QuestionIdParamSchema,
  QuestionSlugParamSchema,
  GetQuestionsQuerySchema,
  GetRandomQuestionQuerySchema
} from '../validation/schemas';

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
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        method: req.method,
        path: req.path,
        source,
        data: req[source]
      }, '[Validation Error] Unexpected error');
      
      return res.status(500).json({
        error: 'Internal server error during validation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

// Specific validation middlewares for common use cases
export const validateCreateQuestion = validateRequest(
  CreateQuestionSchema,
  'body'
);

export const validateUpdateQuestion = validateRequest(
  UpdateQuestionSchema,
  'body'
);

export const validateQuestionId = validateRequest(
  QuestionIdParamSchema,
  'params'
);

export const validateQuestionSlug = validateRequest(
  QuestionSlugParamSchema,
  'params'
);

export const validateQuestionsQuery = validateRequest(
  GetQuestionsQuerySchema,
  'query'
);

export const validateRandomQuestionQuery = validateRequest(
  GetRandomQuestionQuerySchema,
  'query'
);