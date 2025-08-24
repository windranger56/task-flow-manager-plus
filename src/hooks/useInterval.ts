import { useEffect, useRef, useCallback } from 'react';

interface UseIntervalOptions {
  enabled?: boolean;
  immediate?: boolean;
}

export function useInterval(
  callback: () => void,
  delay: number | null,
  options: UseIntervalOptions = {}
) {
  const { enabled = true, immediate = false } = options;
  const savedCallback = useRef(callback);
  const intervalId = useRef<NodeJS.Timeout | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (!enabled || delay === null) {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
      return;
    }

    const tick = () => savedCallback.current();
    
    // Run immediately if requested
    if (immediate) {
      tick();
    }

    intervalId.current = setInterval(tick, delay);

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
        intervalId.current = null;
      }
    };
  }, [delay, enabled, immediate]);

  // Expose manual control
  const start = useCallback(() => {
    if (!intervalId.current && delay !== null) {
      intervalId.current = setInterval(() => savedCallback.current(), delay);
    }
  }, [delay]);

  const stop = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  const restart = useCallback(() => {
    stop();
    start();
  }, [start, stop]);

  return { start, stop, restart };
} 