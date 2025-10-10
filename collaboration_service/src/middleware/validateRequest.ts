import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject } from 'zod';
import { ZodError } from 'zod';

export const validateBody = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Request body validation failed',
        details: error.flatten().fieldErrors,
      });
      return;
    }

    next(error);
  }
};

export const validateParams = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Request params validation failed',
        details: error.flatten().fieldErrors,
      });
      return;
    }

    next(error);
  }
};
