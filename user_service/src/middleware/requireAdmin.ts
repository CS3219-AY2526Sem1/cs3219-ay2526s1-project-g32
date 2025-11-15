import type { Response, NextFunction } from 'express';

import type { AuthenticatedRequest } from './authenticate';
import { HttpError } from '../utils/httpError';

export const requireAdmin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.auth) {
    next(new HttpError(401, 'Authentication context missing'));
    return;
  }

  if (!req.auth.isAdmin) {
    next(new HttpError(403, 'Administrator privileges required'));
    return;
  }

  next();
};
