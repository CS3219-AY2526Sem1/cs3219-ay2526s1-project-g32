import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import type { QuestionSnapshot, SessionCreatePayload, SessionSnapshot, SessionTokenRequest } from '../types';
import { SessionSnapshotSchema } from '../schemas';
import type { PresenceRepository, SessionRepository } from '../repositories';
import type { WSSharedDoc } from '@y/websocket-server/utils';
import { getYDoc } from '@y/websocket-server/utils';
import { logger } from '../utils/logger';

const DEFAULT_LANGUAGES = ['javascript', 'python', 'java', 'c', 'cpp'] as const;
const normalizeLanguage = (language: string) => language.toLowerCase();

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

  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  async createSession(payload: SessionCreatePayload, question: QuestionSnapshot): Promise<SessionSnapshot> {
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.options.gracePeriodMs);

    const starterCode = question.starterCode ?? {};
    const languages = new Set<string>();
    DEFAULT_LANGUAGES.forEach((language) => languages.add(normalizeLanguage(language)));
    Object.keys(starterCode).forEach((language) => languages.add(normalizeLanguage(language)));

    const documents = {
      state: 'state',
      languages: Array.from(languages).reduce<Record<string, string>>((acc, language) => {
        acc[language] = `lang/${language}`;
        return acc;
      }, {}),
    };

    const questionSnapshot: QuestionSnapshot = {
      ...question,
      starterCode: { ...starterCode },
    };

    const snapshot: SessionSnapshot = {
      sessionId,
      matchId: payload.matchId,
      topic: payload.topic,
      difficulty: payload.difficulty,
      status: 'pending',
      question: questionSnapshot,
      documents,
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

    this.clearExpiryTimer(sessionId);
    await this.initializeDocuments(snapshot);

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
      this.scheduleExpiry(sessionId, expiresAtIso);
    } else if (anyConnected) {
      const extended = new Date(timestampMs + this.options.gracePeriodMs);
      expiresAtIso = extended.toISOString();
      this.clearExpiryTimer(sessionId);
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
    this.clearExpiryTimer(sessionId);
    await this.sessions.markEnded(sessionId, endedAt);
    await this.presence.clearPresence(sessionId);
  }

  private async initializeDocuments(snapshot: SessionSnapshot): Promise<void> {
    try {
      const defaultLanguage =
        Object.keys(snapshot.documents.languages)[0] ?? DEFAULT_LANGUAGES[0] ?? 'javascript';

      const initDoc = async (name: string): Promise<WSSharedDoc> => {
        const doc = getYDoc(name, true) as WSSharedDoc;
        if (doc.whenInitialized) {
          await doc.whenInitialized.catch(() => {});
        }
        return doc;
      };

      const stateDocName = `session:${snapshot.sessionId}/${snapshot.documents.state}`;
      const stateDoc = await initDoc(stateDocName);
      stateDoc.transact(() => {
        const settings = stateDoc.getMap<string>('settings');
        if (settings.get('language') !== defaultLanguage) {
          settings.set('language', defaultLanguage);
        }
      });

      const starterCode = snapshot.question.starterCode ?? {};
      await Promise.all(
        Object.entries(snapshot.documents.languages).map(async ([language, docKey]) => {
          const docName = `session:${snapshot.sessionId}/${docKey}`;
          const doc = await initDoc(docName);
          doc.transact(() => {
            const text = doc.getText('monaco');
            if (text.length > 0) {
              text.delete(0, text.length);
            }
            const seed = starterCode[language] ?? '';
            if (seed.length > 0) {
              text.insert(0, seed);
            }
            doc.getMap('meta').set('seeded', true);
          });
        }),
      );
    } catch (error) {
      logger.warn({ err: error, sessionId: snapshot.sessionId }, 'Failed to initialize collaboration documents');
    }
  }

  private clearExpiryTimer(sessionId: string) {
    const existing = this.expiryTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
      this.expiryTimers.delete(sessionId);
    }
  }

  private scheduleExpiry(sessionId: string, deadlineIso: string) {
    const deadlineMs = new Date(deadlineIso).getTime();
    const delay = Math.max(deadlineMs - Date.now(), 0);

    this.clearExpiryTimer(sessionId);
    const timer = setTimeout(() => {
      this.handleExpiry(sessionId).catch((error) => {
        logger.warn({ err: error, sessionId }, 'Failed to handle session expiry');
      });
    }, delay);

    this.expiryTimers.set(sessionId, timer);
  }

  private async handleExpiry(sessionId: string): Promise<void> {
    this.expiryTimers.delete(sessionId);

    const session = await this.sessions.getById(sessionId);
    if (!session) {
      return;
    }

    if (session.status === 'ended') {
      return;
    }

    const deadlineMs = new Date(session.expiresAt).getTime();
    if (Date.now() < deadlineMs) {
      // Session expiry was extended after the timer was set; reschedule.
      this.scheduleExpiry(sessionId, session.expiresAt);
      return;
    }

    const allDisconnected = session.participants.every((participant) => !participant.connected);
    if (!allDisconnected) {
      return;
    }

    logger.info({ sessionId }, 'Grace period elapsed; terminating session');
    await this.endSession(sessionId, 'grace_period_elapsed');
  }
}
