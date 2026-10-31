import { useCallback, useEffect, useRef, useState } from 'react';

/** Short action feedback; a repeated action restarts its own dismissal timer. */
export function useTransientState<T>(empty: T, duration = 4500) {
  const [value, setValue] = useState<T>(empty);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const update = useCallback((next: T) => {
    clearTimeout(timer.current);
    setValue(next);
    if (next !== empty) timer.current = setTimeout(() => setValue(empty), duration);
  }, [empty, duration]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [value, update] as const;
}
