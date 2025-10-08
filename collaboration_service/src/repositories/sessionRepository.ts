import type { Redis } from 'ioredis';

import type { SessionSnapshot } from '../types';
import { NotImplementedError } from '../errors/notImplementedError';

export interface SessionRepository {
  create(session: SessionSnapshot): Promise<void>;
  getById(sessionId: string): Promise<SessionSnapshot | null>;
  update(session: SessionSnapshot): Promise<void>;
  markEnded(sessionId: string, endedAtIso: string): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export class RedisSessionRepository implements SessionRepository {
  constructor(private readonly client: Redis) {}

  async create(_session: SessionSnapshot): Promise<void> {
    throw new NotImplementedError('SessionRepository.create');
  }

  async getById(_sessionId: string): Promise<SessionSnapshot | null> {
    throw new NotImplementedError('SessionRepository.getById');
  }

  async update(_session: SessionSnapshot): Promise<void> {
    throw new NotImplementedError('SessionRepository.update');
  }

  async markEnded(_sessionId: string, _endedAtIso: string): Promise<void> {
    throw new NotImplementedError('SessionRepository.markEnded');
  }

  async delete(_sessionId: string): Promise<void> {
    throw new NotImplementedError('SessionRepository.delete');
  }
}
