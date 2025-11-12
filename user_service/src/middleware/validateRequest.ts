import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject } from 'zod';

import { HttpError } from '../utils/httpError';

type SchemaGroup = {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
};

export const validateRequest = (schemas: SchemaGroup) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.flatten();
        const primaryMessage = error.issues[0]?.message ?? 'Validation failed';
        next(new HttpError(400, primaryMessage, formatted.fieldErrors));
        return;
      }

      next(error);
    }
  };

