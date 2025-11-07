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
}
