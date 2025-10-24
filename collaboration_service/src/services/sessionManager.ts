import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import type { QuestionSnapshot, SessionCreatePayload, SessionSnapshot, SessionTokenRequest } from '../types';
import { SessionSnapshotSchema } from '../schemas';
import type { PresenceRepository, SessionRepository } from '../repositories';

export interface SessionManagerOptions {
  gracePeriodMs: number;
  sessionTokenTtlSeconds: number;
  jwtSecret: string;
}

export class SessionManager {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly presence: PresenceRepository,
    private readonly options: SessionManagerOptions,
  ) {}

  async createSession(payload: SessionCreatePayload, question: QuestionSnapshot): Promise<SessionSnapshot> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.options.gracePeriodMs);

    const snapshot: SessionSnapshot = {
      sessionId,
      matchId: payload.matchId,
      topic: payload.topic,
      difficulty: payload.difficulty,
      status: 'pending',
      question,
      participants: payload.participants.map((participant) => ({
        userId: participant.userId,
        displayName: participant.displayName,
        connected: false,
      })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.sessions.create(snapshot);

    await Promise.all(
      snapshot.participants.map((participant) =>
        this.presence.setPresence(sessionId, {
          userId: participant.userId,
          sessionId,
          connected: participant.connected,
          lastSeenAt: now.getTime(),
        }),
      ),
    );

    return snapshot;
  }

  async getSession(sessionId: string): Promise<SessionSnapshot | null> {
    return this.sessions.getById(sessionId);
  }

  async issueSessionToken(
    sessionId: string,
    request: SessionTokenRequest,
  ): Promise<{ token: string; expiresIn: number }> {
    const session = await this.sessions.getById(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status === 'ended') {
      throw new Error('Session already ended');
    }

    const participant = session.participants.find((item) => item.userId === request.userId);
    if (!participant) {
      throw new Error('User is not a participant of this session');
    }

    const expiresIn = Math.max(30, this.options.sessionTokenTtlSeconds);
    const token = jwt.sign(
      {
        sessionId,
        userId: request.userId,
        scope: 'collaboration',
      },
      this.options.jwtSecret,
      {
        expiresIn,
        subject: request.userId,
      },
    );

    return { token, expiresIn };
  }

  async recordPresence(sessionId: string, userId: string, connected: boolean, timestampMs: number): Promise<void> {
    const session = await this.sessions.getById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status === 'ended') {
      return;
    }

    await this.presence.setPresence(sessionId, {
      userId,
      sessionId,
      connected,
      lastSeenAt: timestampMs,
    });

    const participantsWithPresence = session.participants.map((participant) => {
      if (participant.userId === userId) {
        return {
          ...participant,
          connected,
          lastSeenAt: timestampMs,
        };
      }

      return participant;
    });

    const anyConnected = participantsWithPresence.some((participant) => participant.connected);
    const allDisconnected = participantsWithPresence.every((participant) => !participant.connected);

    const updatedAt = new Date(timestampMs).toISOString();
    let expiresAtIso = session.expiresAt;
    if (allDisconnected) {
      const deadline = new Date(timestampMs + this.options.gracePeriodMs);
      expiresAtIso = deadline.toISOString();
    } else if (anyConnected) {
      const extended = new Date(timestampMs + this.options.gracePeriodMs);
      expiresAtIso = extended.toISOString();
    }

    const updated: SessionSnapshot = SessionSnapshotSchema.parse({
      ...session,
      participants: participantsWithPresence,
      status: anyConnected ? 'active' : 'pending',
      updatedAt,
      expiresAt: expiresAtIso,
    });

    await this.sessions.update(updated);
  }

  async endSession(sessionId: string, _reason?: string): Promise<void> {
    const endedAt = new Date().toISOString();
    await this.sessions.markEnded(sessionId, endedAt);
    await this.presence.clearPresence(sessionId);
  }
}
