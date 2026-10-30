import { useState, useEffect } from 'react';
import { subscribeToSession } from '../services/gameService';
import type { GameSession } from '../types/game';

function areSessionsEqual(a: GameSession | null, b: GameSession | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (
    a.phase !== b.phase ||
    a.currentQuestionIndex !== b.currentQuestionIndex ||
    a.questionStartedAt !== b.questionStartedAt ||
    a.questionRevealedAt !== b.questionRevealedAt ||
    a.questionDuration !== b.questionDuration ||
    a.nextQuestionDuration !== b.nextQuestionDuration ||
    a.joinCode !== b.joinCode
  ) {
    return false;
  }

  const pA = a.players || {};
  const pB = b.players || {};
  const keysA = Object.keys(pA);
  const keysB = Object.keys(pB);
  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    const playerA = pA[k];
    const playerB = pB[k];
    if (!playerB) return false;
    if (playerA.score !== playerB.score) return false;

    const ansA = playerA.answers || {};
    const ansB = playerB.answers || {};
    if (Object.keys(ansA).length !== Object.keys(ansB).length) return false;
  }

  return true;
}

export function useGameSession(sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToSession(sessionId, (s) => {
      if (s === null) {
        setError('Game session not found.');
      }
      setSession((prev) => {
        if (areSessionsEqual(prev, s)) return prev;
        return s;
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [sessionId]);

  return { session, setSession, loading, error };
}
