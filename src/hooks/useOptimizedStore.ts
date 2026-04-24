import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';

/**
 * Optimized store subscription to prevent infinite loops and unnecessary re-renders
 */

export function useOptimizedStore<T>(
  store: any,
  selector: (state: any) => T,
  equalityFn?: (a: T, b: T) => boolean
) {
  const previousValueRef = useRef<T | undefined>(undefined);

  return useStore(store, (state) => {
    const currentValue = selector(state);

    // Custom equality check to prevent unnecessary re-renders
    if (equalityFn && previousValueRef.current !== undefined) {
      if (equalityFn(currentValue, previousValueRef.current)) {
        return previousValueRef.current;
      }
    }

    previousValueRef.current = currentValue;
    return currentValue;
  });
}

export function useDebouncedStore<T>(store: any, selector: (state: any) => T, delay: number = 100) {
  const [value, setValue] = useState<T>(() => selector(store.getState()));
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = store.subscribe((state: any) => {
      const newValue = selector(state);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setValue(newValue);
      }, delay);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [store, selector, delay]);

  return value;
}
