export enum Topic {
  ALGORITHMS = 'algorithms',
  ARRAYS = 'arrays',
  STRINGS = 'strings',
  DYNAMIC_PROGRAMMING = 'dynamic-programming',
  GRAPH = 'graph',
  TREE = 'tree',
  LINKED_LIST = 'linked-list',
  STACK = 'stack',
  QUEUE = 'queue',
  HASH_TABLE = 'hash-table',
  SORTING = 'sorting',
  BINARY_SEARCH = 'binary-search'
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}


export interface MatchRequest {
  userId: string;
  topics: Topic[];
  difficulty: Difficulty;
}

export interface MatchResult {
  matchId: string;
  user1Id: string;
  user2Id: string;
  topic: Topic;
}

export interface WebSocketMessage {
  type: 'match-found' | 'match-expired' | 'match-cancelled' | 'error';
  data?: any;
  message?: string;
}

export interface MatchRequestInput {
  topics: Topic[];
}