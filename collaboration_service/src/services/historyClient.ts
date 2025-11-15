/* AI Assistance Disclosure:
Scope: Implement HistoryClient.
Author Review: Validated for style and accuracy.
*/

export type SessionAttemptPayload = {
  sessionId: string;
  matchId?: string | null;
  questionId?: number | null;
  questionTitle?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  participants: Array<{ userId: string; displayName?: string }>;
  code: {
    python?: string | null;
    c?: string | null;
    cpp?: string | null;
    java?: string | null;
    javascript?: string | null;
  };
};

export class HistoryClient {
  constructor(private readonly baseUrl: string, private readonly internalKey: string) {}

  private getUrl(path: string): string {
    const normalizedBase = this.baseUrl.replace(/\/$/, '');
    return `${normalizedBase}${path}`;
  }

  async saveAttempt(payload: SessionAttemptPayload): Promise<void> {
    const response = await fetch(this.getUrl('/history/attempts'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': this.internalKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to persist session attempt: ${response.status} ${message}`);
    }
  }
}
