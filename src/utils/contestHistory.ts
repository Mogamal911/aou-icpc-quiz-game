import type { GameSession } from '../types/game';
import { revealQuestion } from './scoring';

export interface ContestSummary {
  id: string;
  joinCode: string;
  createdAt: number;
  endedAt: number;
  questionCount: number;
  playerCount: number;
}

export function summarizeContest(session: GameSession): ContestSummary {
  return { id: session.id, joinCode: session.joinCode, createdAt: session.createdAt,
    endedAt: session.endedAt ?? session.createdAt,
    questionCount: session.questions?.length ?? 0, playerCount: Object.keys(session.players || {}).length };
}

/** Finishing and retrying must keep the original scores and completion time. */
export function finishContest(session: GameSession, now: number): GameSession {
  if (session.phase === 'finished') return session;
  const scored = session.phase === 'question' ? revealQuestion(session, session.currentQuestionIndex, now) : session;
  return { ...scored, phase: 'finished', endedAt: now };
}
