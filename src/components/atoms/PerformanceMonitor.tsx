/**
 * Enterprise performance monitoring component
 * Tracks memory usage, render performance, and system health
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { safeNavigator, safeWindow } from '@/lib/utils/ssr-safe';

// Extend Performance interface for Chrome-specific memory API
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

interface PerformanceMetrics {
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  renderTime: number;
  componentCount: number;
  networkLatency: number;
  errorCount: number;
  timestamp: number;
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  samplingRate?: number;
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onMetricsUpdate,
  samplingRate = 5000, // 5 seconds
  enabled = process.env.NODE_ENV === 'development',
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const componentCountRef = useRef(0);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    const window = safeWindow();
    const navigator = safeNavigator();

    const memoryMetrics = window?.performance?.memory
      ? {
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
        }
      : null;

    const start = performance.now();

    // Measure render performance
    const newMetrics: PerformanceMetrics = {
      memoryUsage: memoryMetrics,
      renderTime: performance.now() - start,
      componentCount: componentCountRef.current,
      networkLatency: 0, // Would need actual network measurement
      errorCount: errorCountRef.current,
      timestamp: Date.now(),
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);

    // Check for performance issues
    if (memoryMetrics) {
      const memoryUsagePercent =
        (memoryMetrics.usedJSHeapSize / memoryMetrics.jsHeapSizeLimit) * 100;
      if (memoryUsagePercent > 80) {
        console.warn(`High memory usage detected: ${memoryUsagePercent.toFixed(2)}%`);
      }
    }

    if (newMetrics.renderTime > 16) {
      // 60fps threshold
      console.warn(`Slow render detected: ${newMetrics.renderTime.toFixed(2)}ms`);
    }
  }, [onMetricsUpdate]);

  // Track component mounts/unmounts
  useEffect(() => {
    componentCountRef.current++;

    return () => {
      componentCountRef.current--;
    };
  }, []);

  // Track errors
  useEffect(() => {
    const handleError = () => {
      errorCountRef.current++;
    };

    const window = safeWindow();
    if (window) {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleError);
    }

    return () => {
      if (window) {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleError);
      }
    };
  }, []);

  // Set up monitoring interval
  useEffect(() => {
    if (!enabled) return;

    collectMetrics(); // Initial collection
    intervalRef.current = setInterval(collectMetrics, samplingRate);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, samplingRate, collectMetrics]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible((prev) => !prev);
      }
    };

    const window = safeWindow();
    if (window) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      if (window) {
        window.removeEventListener('keydown', handleKeyPress);
      }
    };
  }, []);

  if (!enabled || !isVisible || !metrics) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-xl z-50 text-xs font-mono max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Performance Monitor</h3>
        <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white">
          ×
        </button>
      </div>

      <div className="space-y-1">
        <div>Timestamp: {new Date(metrics.timestamp).toLocaleTimeString()}</div>

        {metrics.memoryUsage && (
          <div className="space-y-1">
            <div>Memory Usage:</div>
            <div className="ml-2">
              <div>Used: {formatBytes(metrics.memoryUsage.usedJSHeapSize)}</div>
              <div>Total: {formatBytes(metrics.memoryUsage.totalJSHeapSize)}</div>
              <div>Limit: {formatBytes(metrics.memoryUsage.jsHeapSizeLimit)}</div>
              <div className="text-yellow-400">
                {(
                  (metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit) *
                  100
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>
        )}

        <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
        <div>Components: {metrics.componentCount}</div>
        <div>Errors: {metrics.errorCount}</div>

        <div className="mt-2 pt-2 border-t border-gray-600 text-gray-400">
          Press Ctrl+Shift+P to toggle
        </div>
      </div>
    </div>
  );
};

// Hook for performance monitoring in components
export function usePerformanceMonitor(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    const renderTime = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (renderTime > 16) {
      console.warn(
        `Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`
      );
    }
  });

  return {
    renderCount: renderCountRef.current,
    getLastRenderTime: () => performance.now() - lastRenderTime.current,
  };
}

// Memory leak detection utility
export class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private observers: Set<string> = new Set();
  private maxObservers = 100;

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  registerObserver(id: string): () => void {
    this.observers.add(id);

    if (this.observers.size > this.maxObservers) {
      console.warn(`Potential memory leak: ${this.observers.size} active observers`);
    }

    return () => {
      this.observers.delete(id);
    };
  }

  getObserverCount(): number {
    return this.observers.size;
  }

  checkForLeaks(): void {
    if (this.observers.size > 50) {
      console.warn(`High observer count detected: ${this.observers.size}`);
    }
  }
}

export const memoryLeakDetector = MemoryLeakDetector.getInstance();
