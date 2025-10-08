import { z } from 'zod';

export const SessionStatusSchema = z.enum(['pending', 'active', 'ended']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const QuestionMetadataSchema = z.object({
  difficulty: DifficultySchema,
  topics: z.array(z.string()).default([]),
});
export type QuestionMetadata = z.infer<typeof QuestionMetadataSchema>;

export const QuestionSnapshotSchema = z.object({
  questionId: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  starterCode: z.record(z.string(), z.string()).default({}),
  metadata: QuestionMetadataSchema,
});
export type QuestionSnapshot = z.infer<typeof QuestionSnapshotSchema>;

export const ParticipantBaseSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().optional(),
});
export type ParticipantBase = z.infer<typeof ParticipantBaseSchema>;

export const SessionCreateParticipantSchema = ParticipantBaseSchema.extend({
  accessToken: z.string().min(1).optional(),
});
export type SessionCreateParticipant = z.infer<typeof SessionCreateParticipantSchema>;

export const SessionParticipantStateSchema = ParticipantBaseSchema.extend({
  connected: z.boolean().default(false),
});
export type SessionParticipantState = z.infer<typeof SessionParticipantStateSchema>;

export const SessionCreateSchema = z.object({
  matchId: z.string().min(1),
  topic: z.string().min(1),
  difficulty: DifficultySchema,
  participants: z.array(SessionCreateParticipantSchema).length(2),
});
export type SessionCreatePayload = z.infer<typeof SessionCreateSchema>;

export const SessionSnapshotSchema = z.object({
  sessionId: z.string().uuid(),
  matchId: z.string().min(1),
  topic: z.string().min(1),
  difficulty: DifficultySchema,
  status: SessionStatusSchema,
  question: QuestionSnapshotSchema,
  participants: z.array(SessionParticipantStateSchema).length(2),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
});
export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>;

export const SessionCreateResponseSchema = z.object({
  sessionId: z.string().uuid(),
  question: QuestionSnapshotSchema,
  expiresAt: z.string().datetime(),
});
export type SessionCreateResponse = z.infer<typeof SessionCreateResponseSchema>;

export const SessionTokenRequestSchema = z.object({
  userId: z.string().min(1),
  accessToken: z.string().min(1),
});
export type SessionTokenRequest = z.infer<typeof SessionTokenRequestSchema>;

export const SessionTokenResponseSchema = z.object({
  wsUrl: z.string().url(),
  sessionToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});
export type SessionTokenResponse = z.infer<typeof SessionTokenResponseSchema>;

export const SessionEventSchema = z.object({
  type: z.enum(['terminate', 'participant_disconnected', 'participant_reconnected', 'heartbeat']),
  userId: z.string().min(1).optional(),
});
export type SessionEvent = z.infer<typeof SessionEventSchema>;

export const PresenceRecordSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().uuid(),
  connected: z.boolean(),
  lastSeenAt: z.number().int().nonnegative(),
});
export type PresenceRecord = z.infer<typeof PresenceRecordSchema>;
