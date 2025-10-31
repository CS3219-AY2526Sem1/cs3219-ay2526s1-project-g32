import type { Request, Response, NextFunction } from 'express';

import {
  SessionCreateResponseSchema,
  SessionCreateSchema,
  SessionIdParamsSchema,
  SessionTokenRequestSchema,
} from '../schemas';
import type { SessionManager } from '../services/sessionManager';
import { diff } from 'util';

export class SessionController {
  constructor(
    private readonly sessionManager: SessionManager,
    private readonly questionServiceBaseUrl: string,
    private readonly userServiceBaseUrl: string,
    private readonly websocketBaseUrl: string,
  ) {}

  createSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = SessionCreateSchema.parse(req.body);

      const question = await this.fetchQuestion(payload.topic, payload.difficulty);
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

  private async fetchQuestion(topic: string, difficulty: string) {
    const url = new URL('questions/random', this.questionServiceBaseUrl);
    difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    url.searchParams.set('topic', topic);
    url.searchParams.set('difficulty', difficulty);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Question service responded with status ${response.status}`);
    }

    const data = (await response.json()) as {
      id: number;
      title: string;
      description: string;
      difficulty: string;
      topics?: string[];
    };

    const normalizedDifficulty = (data.difficulty ?? difficulty).toString().toLowerCase() as
      | 'easy'
      | 'medium'
      | 'hard';

    return {
      questionId: String(data.id),
      title: data.title,
      prompt: data.description,
      starterCode: {},
      metadata: {
        difficulty: normalizedDifficulty,
        topics: data.topics ?? [],
      },
    };
  }

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

      const isValid = await this.validateAccessToken(body.accessToken, body.userId);

      if (!isValid) {
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

  private async validateAccessToken(accessToken: string, userId: string): Promise<boolean> {
    const endpoint = this.buildUserServiceUrl('auth/token/validate');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken, userId }),
    });

    if (!response.ok) {
      throw new Error(`User service validation failed with status ${response.status}`);
    }

    const data = (await response.json()) as { isValid: boolean };
    return Boolean(data.isValid);
  }

  private buildUserServiceUrl(path: string): string {
    const normalizedBase = this.userServiceBaseUrl.endsWith('/')
      ? this.userServiceBaseUrl
      : `${this.userServiceBaseUrl}/`;
    return new URL(path.replace(/^\//, ''), normalizedBase).toString();
  }
}
