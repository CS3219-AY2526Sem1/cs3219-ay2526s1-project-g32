import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseAdminClient } from '../services/supabaseClient';

export type SessionAttemptRecord = {
  id: string;
  match_id: string | null;
  question_id: number | null;
  started_at: string | null;
  ended_at: string | null;
  code_python: string | null;
  code_c: string | null;
  code_cpp: string | null;
  code_java: string | null;
  code_javascript: string | null;
  participants: Record<string, unknown> | null;
};

export type UserAttemptRecord = {
  user_id: string;
  session_attempt_id: string;
};

export type SessionAttemptInsert = {
  id: string;
  match_id: string | null;
  question_id: number | null;
  started_at: string | null;
  ended_at: string | null;
  code_python: string | null;
  code_c: string | null;
  code_cpp: string | null;
  code_java: string | null;
  code_javascript: string | null;
  participants: Record<string, unknown>[] | null;
};

export class SessionAttemptRepository {
  constructor(private readonly client: SupabaseClient = supabaseAdminClient) {}

  async listUserAttempts(userId: string): Promise<UserAttemptRecord[]> {
    const { data, error } = await this.client
      .from('user_attempts')
      .select('user_id, session_attempt_id')
      .eq('user_id', userId)
      .order('session_attempt_id', { ascending: false });

    if (error) {
      throw error;
    }

    return (data as UserAttemptRecord[]) ?? [];
  }

  async getSessionAttempt(sessionAttemptId: string): Promise<SessionAttemptRecord | null> {
    const { data, error } = await this.client
      .from('session_attempts')
      .select(
        [
          'id',
          'match_id',
          'question_id',
          'started_at',
          'ended_at',
          'code_python',
          'code_c',
          'code_cpp',
          'code_java',
          'code_javascript',
          'participants',
        ].join(',') as '*',
      )
      .eq('id', sessionAttemptId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as SessionAttemptRecord | null) ?? null;
  }

  async createSessionAttempt(record: SessionAttemptInsert): Promise<void> {
    const { error } = await this.client.from('session_attempts').insert([
      {
        id: record.id,
        match_id: record.match_id,
        question_id: record.question_id,
        started_at: record.started_at,
        ended_at: record.ended_at,
        code_python: record.code_python,
        code_c: record.code_c,
        code_cpp: record.code_cpp,
        code_java: record.code_java,
        code_javascript: record.code_javascript,
        participants: record.participants,
      },
    ]);

    if (error) {
      throw error;
    }
  }

  async addUserAttempts(sessionAttemptId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const uniqueIds = Array.from(new Set(userIds));
    const rows = uniqueIds.map((userId) => ({
      id: userId,
      session_attempt_id: sessionAttemptId,
    }));

    const { error } = await this.client.from('user_attempts').insert(rows);
    if (error) {
      throw error;
    }
  }

  async userOwnsAttempt(userId: string, sessionAttemptId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('user_attempts')
      .select('id')
      .eq('id', userId)
      .eq('session_attempt_id', sessionAttemptId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }
}
