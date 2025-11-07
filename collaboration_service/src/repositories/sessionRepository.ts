import type { Redis } from 'ioredis';

import type { SessionSnapshot } from '../types';
import { SessionSnapshotSchema } from '../schemas';
import { sessionMetaKey } from './keys';

export interface SessionRepository {
  create(session: SessionSnapshot): Promise<void>;
  getById(sessionId: string): Promise<SessionSnapshot | null>;
  findActiveByUserId(userId: string): Promise<SessionSnapshot | null>;
  update(session: SessionSnapshot): Promise<void>;
  markEnded(sessionId: string, endedAtIso: string): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export class RedisSessionRepository implements SessionRepository {
  constructor(private readonly client: Redis) {}

  async create(session: SessionSnapshot): Promise<void> {
    const key = sessionMetaKey(session.sessionId);
    const payload = JSON.stringify(session);

    const result = await this.client.set(key, payload, 'NX');
    if (result !== 'OK') {
      throw new Error(`Session ${session.sessionId} already exists`);
    }
  }

  async getById(sessionId: string): Promise<SessionSnapshot | null> {
    const key = sessionMetaKey(sessionId);
    const raw = await this.client.get(key);

    if (!raw) {
      return null;
    }

    return this.parseSnapshot(raw);
  }

  async findActiveByUserId(userId: string): Promise<SessionSnapshot | null> {
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        'session:*:meta',
        'COUNT',
        100,
      );

      if (keys.length > 0) {
        const values = await this.client.mget(keys);
        for (const raw of values) {
          if (!raw) continue;
          let session: SessionSnapshot | null = null;
          try {
            session = this.parseSnapshot(raw);
          } catch {
            continue;
          }

          if (session.status === 'ended') {
            continue;
          }

          const expiresAtMs = new Date(session.expiresAt).getTime();
          if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
            continue;
          }

          const isParticipant = session.participants.some(
            (participant) => participant.userId === userId,
          );

          if (isParticipant) {
            return session;
          }
        }
      }

      cursor = nextCursor;
    } while (cursor !== '0');

    return null;
  }

  async update(session: SessionSnapshot): Promise<void> {
    const key = sessionMetaKey(session.sessionId);
    const payload = JSON.stringify(session);

    const result = await this.client.set(key, payload, 'XX');
    if (result !== 'OK') {
      throw new Error(`Unable to update missing session ${session.sessionId}`);
    }
  }

  async markEnded(sessionId: string, endedAtIso: string): Promise<void> {
    const current = await this.getById(sessionId);
    if (!current) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated: SessionSnapshot = {
      ...current,
      status: 'ended',
      endedAt: endedAtIso,
      updatedAt: endedAtIso,
    };

    await this.update(updated);
  }

  async delete(sessionId: string): Promise<void> {
    const key = sessionMetaKey(sessionId);
    await this.client.del(key);
  }

  private parseSnapshot(raw: string): SessionSnapshot {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return SessionSnapshotSchema.parse(parsed);
    } catch (error) {
      throw new Error('Failed to parse session payload from Redis', { cause: error });
    }
  }
}
