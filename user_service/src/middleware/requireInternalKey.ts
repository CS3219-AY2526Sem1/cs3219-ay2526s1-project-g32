import type { NextFunction, Request, Response } from 'express';

import { config } from '../config';
import { HttpError } from '../utils/httpError';

export const requireInternalKey = (req: Request, _res: Response, next: NextFunction) => {
  const provided = req.header('x-internal-key');

  if (!provided || provided !== config.internalServiceKey) {
    next(new HttpError(403, 'Invalid internal access key'));
    return;
  }

  next();
};
