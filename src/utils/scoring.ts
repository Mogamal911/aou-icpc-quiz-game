import type { GameSession, PlayerAnswer } from '../types/game';

export const CORRECT_POINTS = 1000;
export const MAX_SPEED_BONUS = 500;
export const ANSWER_GRACE_MS = 1500;

/** Points depend on server receipt time and the locked duration, never a phone clock. */
export function scoreAnswer(answer: PlayerAnswer, correctIndex: number, startedAt: number, durationSeconds: number, closedAt: number) {
  const deadline = startedAt + durationSeconds * 1000;
  const inTime = Number.isFinite(answer.answeredAt) && answer.answeredAt >= startedAt
    && answer.answeredAt <= Math.min(deadline + ANSWER_GRACE_MS, closedAt);
  const isCorrect = inTime && Number.isInteger(answer.answerIndex) && answer.answerIndex >= 0
    && answer.answerIndex <= 3 && answer.answerIndex === correctIndex && durationSeconds > 0;
  const bonus = isCorrect ? Math.round(MAX_SPEED_BONUS * Math.max(0, 1 - (answer.answeredAt - startedAt) / (durationSeconds * 1000))) : 0;
  return { isCorrect, pointsEarned: isCorrect ? CORRECT_POINTS + bonus : 0 };
}

/** Pure transition: retries read current state and cannot award a question twice. */
export function revealQuestion(session: GameSession, expectedIndex: number, closedAt: number): GameSession {
  if (session.currentQuestionIndex !== expectedIndex) throw new Error('The question has changed. Refresh the host controls.');
  if (session.phase === 'revealing') return session;
  if (session.phase !== 'question') throw new Error('There is no active question to reveal.');
  const questions = session.questions || [];
  const question = questions[expectedIndex];
  if (!question || session.questionStartedAt === null) throw new Error('The active question is unavailable.');
  const players = Object.fromEntries(Object.entries(session.players || {}).map(([id, player]) => {
    const answer = player.answers?.[question.id];
    const answers = { ...player.answers };
    if (answer) answers[question.id] = { ...answer, ...scoreAnswer(answer, question.correctIndex, session.questionStartedAt!, session.questionDuration ?? question.timeLimit, closedAt) };
    // The displayed total is the sum of awarded question points, not an incremented counter.
    const score = questions.slice(0, expectedIndex + 1).reduce((sum, q) => sum + (answers[q.id]?.pointsEarned ?? 0), 0);
    return [id, { ...player, answers, score }];
  }));
  return { ...session, players, phase: 'revealing', questionRevealedAt: closedAt };
}
