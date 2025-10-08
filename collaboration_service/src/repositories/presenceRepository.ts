import type { Redis } from 'ioredis';

import type { PresenceRecord } from '../types';
import { NotImplementedError } from '../errors/notImplementedError';

export interface PresenceRepository {
  setPresence(sessionId: string, record: PresenceRecord): Promise<void>;
  getPresence(sessionId: string): Promise<PresenceRecord[]>;
  clearPresence(sessionId: string): Promise<void>;
  removeParticipant(sessionId: string, userId: string): Promise<void>;
}

export class RedisPresenceRepository implements PresenceRepository {
  constructor(private readonly client: Redis) {}

  async setPresence(_sessionId: string, _record: PresenceRecord): Promise<void> {
    throw new NotImplementedError('PresenceRepository.setPresence');
  }

  async getPresence(_sessionId: string): Promise<PresenceRecord[]> {
    throw new NotImplementedError('PresenceRepository.getPresence');
  }

  async clearPresence(_sessionId: string): Promise<void> {
    throw new NotImplementedError('PresenceRepository.clearPresence');
  }

  async removeParticipant(_sessionId: string, _userId: string): Promise<void> {
    throw new NotImplementedError('PresenceRepository.removeParticipant');
  }
}
