import type { QuestionSnapshot, SessionCreatePayload, SessionSnapshot, SessionTokenRequest } from '../types';
import { NotImplementedError } from '../errors/notImplementedError';
import type { PresenceRepository, SessionRepository } from '../repositories';

export interface SessionManagerOptions {
  defaultExpiresInMs: number;
}

export class SessionManager {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly presence: PresenceRepository,
    private readonly options: SessionManagerOptions,
  ) {}

  async createSession(_payload: SessionCreatePayload, _question: QuestionSnapshot): Promise<SessionSnapshot> {
    throw new NotImplementedError('SessionManager.createSession');
  }

  async getSession(_sessionId: string): Promise<SessionSnapshot | null> {
    throw new NotImplementedError('SessionManager.getSession');
  }

  async issueSessionToken(_sessionId: string, _request: SessionTokenRequest): Promise<{ token: string; expiresIn: number }> {
    throw new NotImplementedError('SessionManager.issueSessionToken');
  }

  async recordPresence(
    _sessionId: string,
    _userId: string,
    _connected: boolean,
    _timestampMs: number,
  ): Promise<void> {
    throw new NotImplementedError('SessionManager.recordPresence');
  }

  async endSession(_sessionId: string, _reason?: string): Promise<void> {
    throw new NotImplementedError('SessionManager.endSession');
  }
}
