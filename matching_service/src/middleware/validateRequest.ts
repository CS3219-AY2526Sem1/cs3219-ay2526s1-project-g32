import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Generic request validation middleware
 * Validates request body, params, and query against provided schemas
 */
export const validateRequest = (schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        const bodyResult = schema.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            message: 'Invalid request body',
            errors: bodyResult.error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        // Attach validated data to request
        req.body = bodyResult.data;
      }

      // Validate request params
      if (schema.params) {
        const paramsResult = schema.params.safeParse(req.params);
        if (!paramsResult.success) {
          return res.status(400).json({
            message: 'Invalid request parameters',
            errors: paramsResult.error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        // Type assertion since we know the validation passed
        req.params = paramsResult.data as any;
      }

      // Validate query parameters
      if (schema.query) {
        const queryResult = schema.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            message: 'Invalid query parameters',
            errors: queryResult.error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          });
        }
        // Type assertion since we know the validation passed
        req.query = queryResult.data as any;
      }

      next();
    } catch (error) {
      console.error('[Validation] Unexpected error during validation:', error);
      return res.status(500).json({
        message: 'Internal server error during validation'
      });
    }
  };
};