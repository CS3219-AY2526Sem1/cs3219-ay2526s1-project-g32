import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../middleware/authenticate';
import { SessionAttemptRepository } from '../repositories/sessionAttemptRepository';
import { HttpError } from '../utils/httpError';

const sessionAttemptRepository = new SessionAttemptRepository();

export const listHistoryHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      throw new HttpError(401, 'Authentication required');
    }

    const attempts = await sessionAttemptRepository.listUserAttempts(req.auth.userId);
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
};

export const getHistoryDetailHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.auth) {
      throw new HttpError(401, 'Authentication required');
    }

    const { sessionAttemptId } = req.params as { sessionAttemptId: string };

    const attempt = await sessionAttemptRepository.getSessionAttempt(sessionAttemptId);
    if (!attempt) {
      res.status(404).json({ error: 'NotFound', message: 'Attempt not found' });
      return;
    }

    const userAttempts = await sessionAttemptRepository.listUserAttempts(req.auth.userId);
    const ownsAttempt = userAttempts.some(
      (record) => record.session_attempt_id === sessionAttemptId,
    );

    if (!ownsAttempt) {
      throw new HttpError(403, 'You do not have access to this attempt');
    }

    res.json({ attempt });
  } catch (error) {
    next(error);
  }
};
