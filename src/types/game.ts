// ─── Game Types ────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'        // Waiting for players to join
  | 'question'     // Active question with countdown
  | 'revealing'    // Showing correct answer + scores
  | 'leaderboard'  // Between questions
  | 'finished';    // Game over / final rankings

export type QuestionType = 'text' | 'code';
export type CodeLanguage = 'cpp' | 'c' | 'python' | 'java';

export interface Question {
  id: string;
  type?: QuestionType; // 'text' | 'code' (default: 'text')
  text: string;
  code?: string; // code snippet (if type === 'code')
  codeLanguage?: CodeLanguage; // 'cpp' | 'c' | 'python' | 'java' (default: 'cpp')
  options: [string, string, string, string]; // exactly 4 options
  correctIndex: number; // 0–3
  timeLimit: number; // default seconds
  category?: string;
  explanation?: string; // optional explanation shown during reveal phase
}

export interface PlayerAnswer {
  answerIndex: number;    // 0–3 which option they chose
  answeredAt: number;     // server timestamp when submitted
  isCorrect: boolean;     // set by server/admin reveal
  pointsEarned: number;   // set by server/admin reveal
}

export interface Player {
  id: string;
  nickname: string;
  joinedAt: number;
  score: number;
  rank?: number;
  answers: Record<string, PlayerAnswer>; // questionId → answer
  isConnected: boolean;
}

export interface GameSession {
  id: string;
  phase: GamePhase;
  currentQuestionIndex: number;
  questionStartedAt: number | null; // server timestamp
  questionRevealedAt: number | null;
  questionDuration?: number;        // locked duration in seconds for the active question
  nextQuestionDuration?: number;    // configured duration in seconds for the next question
  players: Record<string, Player>;
  questions?: Question[];           // snapshot of question bank for this session
  createdAt: number;
  endedAt?: number;
  joinCode: string;
}

// ─── Leaderboard Entry ─────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
}
