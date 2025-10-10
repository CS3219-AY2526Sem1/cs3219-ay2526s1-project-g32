import type { Request, Response, NextFunction } from 'express';

import {
  SessionCreateResponseSchema,
  SessionCreateSchema,
  SessionIdParamsSchema,
  SessionTokenRequestSchema,
} from '../schemas';
import type { QuestionServiceClient, UserServiceClient } from '../services';
import type { SessionManager } from '../services/sessionManager';

export class SessionController {
  constructor(
    private readonly sessionManager: SessionManager,
    private readonly questionService: QuestionServiceClient,
    private readonly userService: UserServiceClient,
    private readonly websocketBaseUrl: string,
  ) {}

  createSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = SessionCreateSchema.parse(req.body);

      const question = await this.questionService.selectQuestion(payload.topic, payload.difficulty);
      const session = await this.sessionManager.createSession(payload, question);

      const response = SessionCreateResponseSchema.parse({
        sessionId: session.sessionId,
        question: session.question,
        expiresAt: session.expiresAt,
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = SessionIdParamsSchema.parse(req.params);

      const session = await this.sessionManager.getSession(params.sessionId);

      if (!session) {
        res.status(404).json({ error: 'NotFoundError', message: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      next(error);
    }
  };

  issueToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = SessionIdParamsSchema.parse(req.params);
      const body = SessionTokenRequestSchema.parse(req.body);

      const validation = await this.userService.validateAccessToken(body.accessToken, body.userId);

      if (!validation.isActive) {
        res.status(403).json({ error: 'Forbidden', message: 'User is inactive' });
        return;
      }

      const { token, expiresIn } = await this.sessionManager.issueSessionToken(params.sessionId, body);

      res.json({
        wsUrl: this.websocketBaseUrl,
        sessionToken: token,
        expiresIn,
      });
    } catch (error) {
      next(error);
    }
  };
}
