import { getServerTime, observeServerClock } from '../services/clockService';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * High-performance countdown hook.
 * Only triggers React re-renders when the whole second changes (1Hz)
 * rather than high-frequency polling (10Hz+), reducing re-renders by 90%.
 */
export function useCountdown(startedAt: number | null, timeLimit: number) {
  const calculateRemaining = useCallback(() => {
    if (startedAt === null) return timeLimit;
    const elapsed = (getServerTime() - startedAt) / 1000;
    return Math.max(0, timeLimit - elapsed);
  }, [startedAt, timeLimit]);

  const [timeLeft, setTimeLeft] = useState(() => Math.ceil(calculateRemaining()));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSecondRef = useRef(timeLeft);

  useEffect(() => {
    observeServerClock();
    if (startedAt === null) {
      setTimeLeft(timeLimit);
      lastSecondRef.current = timeLimit;
      return;
    }

    const checkTime = () => {
      const remaining = calculateRemaining();
      const rounded = Math.ceil(remaining);

      // Only trigger re-render if the integer second changed or expired
      if (rounded !== lastSecondRef.current) {
        lastSecondRef.current = rounded;
        setTimeLeft(rounded);
      }

      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    // Immediate check
    checkTime();

    // Check every 250ms for low latency second transitions with zero render spam
    intervalRef.current = setInterval(checkTime, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, timeLimit, calculateRemaining]);

  const progress = timeLimit > 0 ? timeLeft / timeLimit : 0;
  const isExpired = timeLeft <= 0;

  return { timeLeft, progress, isExpired };
}
