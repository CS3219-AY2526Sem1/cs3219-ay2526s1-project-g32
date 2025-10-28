import type { Difficulty, QuestionSnapshot } from '../types';

// stub implementation
export interface QuestionServiceClient {
  selectQuestion(topic: string, difficulty: Difficulty): Promise<QuestionSnapshot>;
}

export class StubQuestionServiceClient implements QuestionServiceClient {
  async selectQuestion(topic: string, difficulty: Difficulty): Promise<QuestionSnapshot> {
    return {
      questionId: 'stub-question',
      title: `Practice ${topic}`,
      prompt: 'This is a placeholder question. Integrate question service to fetch real prompts.',
      starterCode: {},
      metadata: {
        difficulty,
        topics: [topic],
      },
    };
  }
}
