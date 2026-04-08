import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after
 * the caller has stopped changing it for `delay` milliseconds.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
