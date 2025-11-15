/* AI Assistance Disclosure:
Scope: Implement RedisPresenceRepository.
Author Review: Validated for style and accuracy.
*/

import type { Redis } from 'ioredis';

import type { PresenceRecord } from '../types';
import { PresenceRecordSchema } from '../schemas';
import { sessionPresenceKey } from './keys';

export interface PresenceRepository {
  setPresence(sessionId: string, record: PresenceRecord): Promise<void>;
  getPresence(sessionId: string): Promise<PresenceRecord[]>;
  clearPresence(sessionId: string): Promise<void>;
  removeParticipant(sessionId: string, userId: string): Promise<void>;
}

export class RedisPresenceRepository implements PresenceRepository {
  constructor(private readonly client: Redis, private readonly ttlSeconds: number | null = null) {}

  async setPresence(sessionId: string, record: PresenceRecord): Promise<void> {
    const key = sessionPresenceKey(sessionId);
    await this.client.hset(key, record.userId, JSON.stringify(record));

    if (this.ttlSeconds && this.ttlSeconds > 0) {
      await this.client.expire(key, this.ttlSeconds);
    }
  }

  async getPresence(sessionId: string): Promise<PresenceRecord[]> {
    const key = sessionPresenceKey(sessionId);
    const entries = await this.client.hgetall(key);

    return Object.values(entries).map((value) => this.parseRecord(value));
  }

  async clearPresence(sessionId: string): Promise<void> {
    const key = sessionPresenceKey(sessionId);
    await this.client.del(key);
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    const key = sessionPresenceKey(sessionId);
    await this.client.hdel(key, userId);
  }

  private parseRecord(value: string): PresenceRecord {
    try {
      const parsed = JSON.parse(value) as unknown;
      return PresenceRecordSchema.parse(parsed);
    } catch (error) {
      const err = new Error('Failed to parse presence record from Redis');
      (err as Error & { cause?: unknown }).cause = error;
      throw err;
    }
  }
}
