import { useState, useEffect } from 'react';
import { subscribeToSession } from '../services/gameService';
import type { GameSession } from '../types/game';

export function useGameSession(sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setConnected(false);
    setSession(null);
    setError(null);

    const timeout = window.setTimeout(() => { setError('Could not connect to the contest. Check your connection and try again.'); setLoading(false); }, 8000);
    const unsubscribe = subscribeToSession(sessionId, (s) => {
      window.clearTimeout(timeout);
      setError(s === null ? 'Game session not found.' : null);
      setSession(s);
      setLoading(false);
    }, setConnected);

    return () => { window.clearTimeout(timeout); unsubscribe(); };
  }, [sessionId]);

  return { session, setSession, loading, error, connected };
}
