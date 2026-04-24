/**
 * Core performance optimization utilities
 * - Memoization helpers
 * - Performance monitoring
 * - Optimized data structures
 * - Lazy loading utilities
 */

import type { DependencyList, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.setupObservers();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupObservers() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // Tasks longer than 50ms
              console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
        this.observers.push(observer);
      } catch (error) {
        console.warn('Performance observer for long tasks not supported');
      }
    }
  }

  startTiming(label: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }

      this.metrics.get(label)!.push(duration);

      // Warn if operation takes too long
      if (duration > 100) {
        console.warn(`Slow operation detected: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [label] of this.metrics) {
      const metrics = this.getMetrics(label);
      if (metrics) {
        result[label] = metrics;
      }
    }

    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Memoization utilities
export function memoizeWithArgs<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// React hooks for performance
export function usePerformanceMonitor(label?: string) {
  const monitor = PerformanceMonitor.getInstance();

  return useCallback(() => {
    if (!label) {
      return () => {};
    }

    return monitor.startTiming(label);
  }, [label, monitor]);
}

export function useMemoWithDeps<T>(factory: () => T, deps: DependencyList, label?: string): T {
  const endTiming = usePerformanceMonitor(label);

  const result = useMemo(() => {
    endTiming();
    return factory();
  }, deps);

  return result;
}

export function useCallbackWithDeps<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
  label?: string
): T {
  const endTiming = usePerformanceMonitor(label);

  const result = useCallback(() => {
    endTiming();
    return callback();
  }, deps) as T;

  return result;
}

// Intersection Observer for lazy loading
export function useIntersectionObserver(
  ref: RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
          if (entry.isIntersecting && !hasIntersected) {
            setHasIntersected(true);
          }
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options, hasIntersected]);

  return { isIntersecting, hasIntersected };
}

// Virtual scrolling utilities
export interface VirtualScrollItem {
  id: string;
  height: number;
  data: any;
}

export class VirtualScrollManager {
  private itemHeights: Map<string, number> = new Map();
  private containerHeight: number = 0;
  private scrollTop: number = 0;
  private overscan: number = 5;

  constructor(containerHeight: number, overscan: number = 5) {
    this.containerHeight = containerHeight;
    this.overscan = overscan;
  }

  setContainerHeight(height: number): void {
    this.containerHeight = height;
  }

  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  updateItemHeight(id: string, height: number): void {
    this.itemHeights.set(id, height);
  }

  getVisibleRange(items: VirtualScrollItem[]): { start: number; end: number } {
    let start = 0;
    let end = 0;
    let accumulatedHeight = 0;
    const startIndex = Math.max(0, this.scrollTop - this.containerHeight);
    const endIndex = this.scrollTop + this.containerHeight * 2;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      const height = this.itemHeights.get(item.id) || item.height;

      if (accumulatedHeight < startIndex) {
        start = i;
      }

      if (accumulatedHeight <= endIndex) {
        end = i;
      }

      accumulatedHeight += height;

      if (accumulatedHeight > endIndex) {
        break;
      }
    }

    return {
      start: Math.max(0, start - this.overscan),
      end: Math.min(items.length - 1, end + this.overscan),
    };
  }

  getTotalHeight(items: VirtualScrollItem[]): number {
    return items.reduce((total, item) => {
      if (!item) return total;
      return total + (this.itemHeights.get(item.id) || item.height);
    }, 0);
  }

  getItemOffset(items: VirtualScrollItem[], itemIndex: number): number {
    let offset = 0;

    for (let i = 0; i < itemIndex && i < items.length; i++) {
      const item = items[i];
      if (item) {
        offset += this.itemHeights.get(item.id) || item.height;
      }
    }

    return offset;
  }
}

// Image lazy loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();

    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setError(null);
    };

    img.onerror = () => {
      setError('Failed to load image');
      setIsLoading(false);
    };

    img.src = src;
  }, [src]);

  return { imageSrc, isLoading, error };
}

// Bundle size monitoring
export function useBundleSizeMonitor() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const transferSize = navigation.transferSize || 0;
        const encodedBodySize = navigation.encodedBodySize || 0;

        console.log('Bundle size metrics:', {
          transferSize: `${(transferSize / 1024).toFixed(2)} KB`,
          encodedBodySize: `${(encodedBodySize / 1024).toFixed(2)} KB`,
          loadTime: `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
        });
      }
    }
  }, []);
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const updateMemoryInfo = () => {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
          usage: `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)}%`,
        });
      };

      updateMemoryInfo();
      const interval = setInterval(updateMemoryInfo, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return memoryInfo;
}

// Network performance monitoring
export function useNetworkMonitor() {
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  return networkInfo;
}

export const performanceMonitor = PerformanceMonitor.getInstance();
export default performanceMonitor;
