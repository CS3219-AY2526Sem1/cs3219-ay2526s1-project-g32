import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from '../middleware/authenticate';
import { SessionAttemptRepository, type SessionAttemptInsert } from '../repositories/sessionAttemptRepository';
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

    const ownsAttempt = await sessionAttemptRepository.userOwnsAttempt(
      req.auth.userId,
      sessionAttemptId,
    );
    if (!ownsAttempt) {
      throw new HttpError(403, 'You do not have access to this attempt');
    }

    res.json({ attempt });
  } catch (error) {
    next(error);
  }
};

type CreateHistoryAttemptBody = {
  sessionId: string;
  matchId?: string | null;
  questionId?: number | null;
  questionTitle?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  participants: Array<{ userId: string; displayName?: string }>;
  code?: {
    python?: string | null;
    c?: string | null;
    cpp?: string | null;
    java?: string | null;
    javascript?: string | null;
  };
};

export const createHistoryAttemptHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const body = req.body as CreateHistoryAttemptBody;

    const record: SessionAttemptInsert = {
      id: body.sessionId,
      match_id: body.matchId ?? null,
      question_id: typeof body.questionId === 'number' ? body.questionId : null,
      question_title: body.questionTitle ?? null,
      started_at: body.startedAt ?? null,
      ended_at: body.endedAt ?? null,
      code_python: body.code?.python ?? null,
      code_c: body.code?.c ?? null,
      code_cpp: body.code?.cpp ?? null,
      code_java: body.code?.java ?? null,
      code_javascript: body.code?.javascript ?? null,
      participants: body.participants.map((participant) => ({
        userId: participant.userId,
        displayName: participant.displayName,
      })),
    };

    await sessionAttemptRepository.createSessionAttempt(record);
    await sessionAttemptRepository.addUserAttempts(
      body.sessionId,
      body.participants.map((participant) => participant.userId),
    );

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
};
