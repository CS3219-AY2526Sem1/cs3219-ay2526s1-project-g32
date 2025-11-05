import type { Request, Response, NextFunction } from 'express';

import { SessionCreateResponseSchema, SessionCreateSchema, SessionIdParamsSchema, SessionTokenRequestSchema } from '../schemas';
import type { SessionManager } from '../services/sessionManager';

type QuestionServiceResponse = {
  id: number;
  title: string;
  slug?: string;
  description: string;
  difficulty?: string;
  topic?: string;
  topics?: string[];
  starterCode?: Record<string, string | null | undefined>;
};

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
        documents: session.documents,
        expiresAt: session.expiresAt,
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  private async fetchQuestion(topic: string, difficulty: string) {
    const normalizedDifficultyParam = `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;

    const url = new URL('questions/random', this.ensureTrailingSlash(this.questionServiceBaseUrl));
    url.searchParams.set('topic', topic);
    url.searchParams.set('difficulty', normalizedDifficultyParam);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Question service responded with status ${response.status}`);
    }

    const data = (await response.json()) as QuestionServiceResponse;

    const lowerDifficulty = (data.difficulty ?? normalizedDifficultyParam).toLowerCase();
    const normalizedDifficulty = ['easy', 'medium', 'hard'].includes(lowerDifficulty)
      ? (lowerDifficulty as 'easy' | 'medium' | 'hard')
      : (difficulty as 'easy' | 'medium' | 'hard');

    const topics =
      Array.isArray(data.topics) && data.topics.length > 0
        ? data.topics
        : data.topic
        ? [data.topic]
        : [];

    const starterCodeEntries = Object.entries(data.starterCode ?? {}).filter(
      ([, value]) => typeof value === 'string' && value.trim().length > 0,
    );
    const starterCode = starterCodeEntries.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value as string;
      return acc;
    }, {});

    return {
      questionId: String(data.id),
      title: data.title,
      prompt: data.description,
      starterCode,
      metadata: {
        difficulty: normalizedDifficulty,
        topics,
      },
    };
  }

  private ensureTrailingSlash(baseUrl: string): string {
    return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
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
