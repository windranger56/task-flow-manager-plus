import { useState, useEffect, useRef, useCallback } from 'react';

interface UseOptimizedDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export const useOptimizedDebounce = <T>(
  value: T,
  options: UseOptimizedDebounceOptions = {}
): T => {
  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait
  } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastInvokeTimeRef = useRef<number>(0);

  const invoke = useCallback((newValue: T) => {
    setDebouncedValue(newValue);
    lastInvokeTimeRef.current = Date.now();
  }, []);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const now = Date.now();
    lastCallTimeRef.current = now;

    const shouldInvokeLeading = leading && (now - lastInvokeTimeRef.current >= delay);
    const shouldSetupTrailing = trailing;
    const shouldSetupMaxWait = maxWait && (now - lastInvokeTimeRef.current >= maxWait);

    // Clear existing timeouts
    clearTimeouts();

    // Leading edge
    if (shouldInvokeLeading) {
      invoke(value);
      return;
    }

    // Max wait timeout
    if (maxWait && !shouldSetupMaxWait) {
      const remainingMaxWait = maxWait - (now - lastInvokeTimeRef.current);
      maxTimeoutRef.current = setTimeout(() => {
        invoke(value);
      }, remainingMaxWait);
    }

    // Trailing edge
    if (shouldSetupTrailing) {
      timeoutRef.current = setTimeout(() => {
        const timeSinceLastCall = Date.now() - lastCallTimeRef.current;
        
        if (timeSinceLastCall < delay && timeSinceLastCall >= 0) {
          // If called again during the delay, reset the timer
          timeoutRef.current = setTimeout(() => {
            invoke(value);
          }, delay - timeSinceLastCall);
        } else {
          invoke(value);
        }
      }, delay);
    }

    return clearTimeouts;
  }, [value, delay, leading, trailing, maxWait, invoke, clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimeouts;
  }, [clearTimeouts]);

  return debouncedValue;
};

// Хук для дебаунса функций
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay, ...deps]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

// Хук для дебаунса поиска с дополнительными возможностями
export const useSearchDebounce = (
  searchTerm: string,
  delay: number = 300,
  minLength: number = 2
) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedValue = useOptimizedDebounce(searchTerm, { 
    delay,
    trailing: true,
    leading: false 
  });

  useEffect(() => {
    if (debouncedValue.length >= minLength || debouncedValue.length === 0) {
      setDebouncedSearchTerm(debouncedValue);
      setIsSearching(false);
    } else {
      setIsSearching(false);
    }
  }, [debouncedValue, minLength]);

  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm && searchTerm.length >= minLength) {
      setIsSearching(true);
    }
  }, [searchTerm, debouncedSearchTerm, minLength]);

  return {
    debouncedSearchTerm,
    isSearching,
    shouldSearch: debouncedSearchTerm.length >= minLength || debouncedSearchTerm.length === 0
  };
};
