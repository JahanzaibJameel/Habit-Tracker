import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Higher-order component for memoizing expensive components
 * Provides automatic optimization for frequently re-rendering components
 */
export function memoized<T extends React.ComponentType<any>>(
  Component: T,
  areEqual?: (prevProps: any, nextProps: any) => boolean
) {
  return memo(Component, areEqual);
}

/**
 * Hook for memoizing expensive calculations
 * Prevents unnecessary recalculations on re-renders
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * Hook for memoizing expensive values
 * Prevents unnecessary recalculations on re-renders
 */
export function useMemoizedValue<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

/**
 * Hook for debouncing expensive operations
 * Prevents excessive function calls during rapid user interactions
 */
export function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * Hook for throttling expensive operations
 * Limits function calls to a maximum frequency
 */
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Virtual scrolling hook for large lists
 * Only renders visible items for optimal performance
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, 0 - overscan);
    const endIndex = Math.min(items.length - 1, visibleCount + overscan);

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const totalHeight = items.length * itemHeight;

    return {
      visibleItems,
      startIndex,
      endIndex,
      totalHeight,
      itemHeight,
    };
  }, [items, itemHeight, containerHeight, overscan]);
}

/**
 * Performance monitoring hook
 * Tracks component render performance in development
 */
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        console.log(`${componentName} render time: ${endTime - startTime}ms`);
      };
    }
  }, [componentName]);
}
