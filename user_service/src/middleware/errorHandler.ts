import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

// Central error handler
export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status = err.status ?? 500;
  const payload: Record<string, unknown> = {
    error: err.name || 'Error',
    message: err.message || 'Unexpected error occurred.',
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (status >= 500) {
    logger.error('Unhandled error', err);
  }

  res.status(status).json(payload);
};
