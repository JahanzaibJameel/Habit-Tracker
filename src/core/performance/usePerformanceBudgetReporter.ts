/**
 * React hook for performance budget reporting and monitoring
 * Provides real-time performance metrics and budget breach alerts
 * 
 * @fileoverview React hook for performance monitoring
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceMonitor, PerformanceMonitorConfig, PerformanceMetric, PerformanceBreach } from './PerformanceMonitor';
import { BudgetConfig, DefaultBudgetConfig } from './budget.config';

/**
 * Performance budget reporter state
 */
export interface PerformanceBudgetState {
  metrics: Record<string, PerformanceMetric[]>;
  breaches: PerformanceBreach[];
  isMonitoring: boolean;
  lastUpdate: number;
  stats: {
    totalMetrics: number;
    totalBreaches: number;
    recentBreaches: number;
    worstMetric: string | null;
  };
}

/**
 * Performance budget reporter actions
 */
export interface PerformanceBudgetActions {
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordMetric: (name: string, value: number, category: string, metadata?: Record<string, unknown>) => void;
  getMetricValue: (name: string) => number | undefined;
  getBreaches: () => PerformanceBreach[];
  exportData: () => string;
  clearData: () => void;
  refreshStats: () => void;
}

/**
 * Hook options
 */
export interface UsePerformanceBudgetOptions {
  budgetConfig?: Partial<BudgetConfig>;
  enableReporting?: boolean;
  reportEndpoint?: string;
  samplingRate?: number;
  enableRealTimeMonitoring?: boolean;
  enableBundleAnalysis?: boolean;
  enableMemoryMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
}

/**
 * React hook for performance budget monitoring
 * 
 * @example
 * const { state, actions } = usePerformanceBudget({
 *   enableReporting: true,
 *   samplingRate: 0.1
 * });
 */
export function usePerformanceBudget(
  options: UsePerformanceBudgetOptions = {}
): {
  state: PerformanceBudgetState;
  actions: PerformanceBudgetActions;
} {
  const {
    budgetConfig = {},
    enableReporting = process.env.NODE_ENV === 'production',
    reportEndpoint,
    samplingRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    enableRealTimeMonitoring = true,
    enableBundleAnalysis = true,
    enableMemoryMonitoring = true,
    enableNetworkMonitoring = true,
  } = options;

  const finalBudgetConfig: BudgetConfig = {
    ...DefaultBudgetConfig,
    ...budgetConfig,
  };

  // State management
  const [state, setState] = useState<PerformanceBudgetState>({
    metrics: {},
    breaches: [],
    isMonitoring: false,
    lastUpdate: Date.now(),
    stats: {
      totalMetrics: 0,
      totalBreaches: 0,
      recentBreaches: 0,
      worstMetric: null,
    },
  });

  // Monitor instance ref
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout>();

  // Initialize monitor
  useEffect(() => {
    const config: PerformanceMonitorConfig = {
      budgetConfig: finalBudgetConfig,
      enableReporting,
      reportEndpoint,
      samplingRate,
      enableRealTimeMonitoring,
      enableBundleAnalysis,
      enableMemoryMonitoring,
      enableNetworkMonitoring,
    };

    monitorRef.current = new PerformanceMonitor(config);

    return () => {
      if (monitorRef.current) {
        monitorRef.current.stop();
      }
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [
    finalBudgetConfig,
    enableReporting,
    reportEndpoint,
    samplingRate,
    enableRealTimeMonitoring,
    enableBundleAnalysis,
    enableMemoryMonitoring,
    enableNetworkMonitoring,
  ]);

  // Update state periodically
  useEffect(() => {
    const updateState = () => {
      if (!monitorRef.current) return;

      const breaches = monitorRef.current.getBreaches();
      const stats = monitorRef.current.getBreachStats();

      setState(prev => ({
        ...prev,
        breaches,
        lastUpdate: Date.now(),
        stats: {
          totalMetrics: Object.values(prev.metrics).reduce((sum, metrics) => sum + metrics.length, 0),
          totalBreaches: stats.total,
          recentBreaches: stats.recent,
          worstMetric: getWorstMetric(breaches),
        },
      }));
    };

    // Update immediately
    updateState();

    // Update every 10 seconds
    updateTimerRef.current = setInterval(updateState, 10000);

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, []);

  // Get worst performing metric
  const getWorstMetric = (breaches: PerformanceBreach[]): string | null => {
    if (breaches.length === 0) return null;

    const breachCounts = breaches.reduce((acc, breach) => {
      acc[breach.metric] = (acc[breach.metric] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(breachCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
  };

  // Actions
  const actions: PerformanceBudgetActions = {
    startMonitoring: useCallback(() => {
      if (monitorRef.current) {
        monitorRef.current.start();
        setState(prev => ({ ...prev, isMonitoring: true }));
      }
    }, []),

    stopMonitoring: useCallback(() => {
      if (monitorRef.current) {
        monitorRef.current.stop();
        setState(prev => ({ ...prev, isMonitoring: false }));
      }
    }, []),

    recordMetric: useCallback((
      name: string,
      value: number,
      category: string,
      metadata?: Record<string, unknown>
    ) => {
      if (monitorRef.current) {
        monitorRef.current.recordMetric(name, value, category, metadata);
        
        setState(prev => ({
          ...prev,
          metrics: {
            ...prev.metrics,
            [name]: [...(prev.metrics[name] || []), {
              name,
              value,
              timestamp: Date.now(),
              category,
              metadata,
            } as PerformanceMetric],
          },
        }));
      }
    }, []),

    getMetricValue: useCallback((name: string) => {
      return monitorRef.current?.getMetricValue(name);
    }, []),

    getBreaches: useCallback(() => {
      return monitorRef.current?.getBreaches() || [];
    }, []),

    exportData: useCallback(() => {
      return monitorRef.current?.exportData() || '{}';
    }, []),

    clearData: useCallback(() => {
      if (monitorRef.current) {
        monitorRef.current.clearData();
        setState(prev => ({
          ...prev,
          metrics: {},
          breaches: [],
          stats: {
            totalMetrics: 0,
            totalBreaches: 0,
            recentBreaches: 0,
            worstMetric: null,
          },
        }));
      }
    }, []),

    refreshStats: useCallback(() => {
      if (monitorRef.current) {
        const breaches = monitorRef.current.getBreaches();
        const stats = monitorRef.current.getBreachStats();
        
        setState(prev => ({
          ...prev,
          breaches,
          stats: {
            totalMetrics: Object.values(prev.metrics).reduce((sum, metrics) => sum + metrics.length, 0),
            totalBreaches: stats.total,
            recentBreaches: stats.recent,
            worstMetric: getWorstMetric(breaches),
          },
        }));
      }
    }, []),
  };

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (enableRealTimeMonitoring && !state.isMonitoring) {
      actions.startMonitoring();
    }
  }, [enableRealTimeMonitoring, state.isMonitoring, actions.startMonitoring]);

  return { state, actions };
}

/**
 * Hook for performance budget visualization
 */
export function usePerformanceVisualization() {
  const { state, actions } = usePerformanceBudget();

  const getChartData = useCallback(() => {
    const chartData: Array<{
      name: string;
      value: number;
      budget?: number;
      category: string;
      breached?: boolean;
    }> = [];

    Object.entries(state.metrics).forEach(([metricName, metrics]) => {
      if (metrics.length > 0) {
        const latestMetric = metrics[metrics.length - 1];
        chartData.push({
          name: metricName,
          value: latestMetric.value,
          budget: latestMetric.budget,
          category: latestMetric.category,
          breached: latestMetric.breached,
        });
      }
    });

    return chartData.sort((a, b) => b.value - a.value);
  }, [state.metrics]);

  const getBreachesByCategory = useCallback(() => {
    const breachesByCategory: Record<string, number> = {};
    
    state.breaches.forEach(breach => {
      breachesByCategory[breach.category] = (breachesByCategory[breach.category] || 0) + 1;
    });

    return Object.entries(breachesByCategory).map(([category, count]) => ({
      category,
      count,
    }));
  }, [state.breaches]);

  const getPerformanceScore = useCallback(() => {
    if (state.stats.totalMetrics === 0) return 100;

    const breachPenalty = state.stats.totalBreaches * 10;
    const recentPenalty = state.stats.recentBreaches * 5;
    
    return Math.max(0, 100 - breachPenalty - recentPenalty);
  }, [state.stats]);

  return {
    ...state,
    actions,
    chartData: getChartData(),
    breachesByCategory: getBreachesByCategory(),
    performanceScore: getPerformanceScore(),
  };
}

/**
 * Hook for performance budget alerts
 */
export function usePerformanceAlerts() {
  const { state } = usePerformanceBudget({
    enableReporting: true,
    enableRealTimeMonitoring: true,
  });

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    acknowledged: boolean;
  }>>([]);

  // Process breaches into alerts
  useEffect(() => {
    const newAlerts = state.breaches
      .filter(breach => {
        // Only show alerts for recent breaches (last 5 minutes)
        return Date.now() - breach.timestamp < 300000;
      })
      .map(breach => ({
        id: `${breach.metric}-${breach.timestamp}`,
        type: breach.severity === 'critical' ? 'critical' : 
              breach.severity === 'high' ? 'error' : 'warning' as const,
        message: `${breach.metric} (${Math.round(breach.actual)}) exceeds budget (${Math.round(breach.budget)})`,
        timestamp: breach.timestamp,
        acknowledged: false,
      }));

    setAlerts(prev => {
      // Merge new alerts with existing ones
      const existingIds = new Set(prev.map(alert => alert.id));
      const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.has(alert.id));
      
      return [...prev, ...uniqueNewAlerts]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10); // Keep only 10 most recent alerts
    });
  }, [state.breaches]);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const getUnacknowledgedCount = useCallback(() => {
    return alerts.filter(alert => !alert.acknowledged).length;
  }, [alerts]);

  return {
    alerts,
    acknowledgeAlert,
    clearAllAlerts,
    unacknowledgedCount: getUnacknowledgedCount(),
  };
}

/**
 * Performance budget debugging utilities
 */
export class PerformanceBudgetDebugger {
  /**
   * Simulate a performance metric
   */
  static simulateMetric(name: string, value: number, category: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-metric', {
        detail: { name, value, category }
      }));
    }
  }

  /**
   * Simulate a budget breach
   */
  static simulateBreach(metric: string, value: number, budget: number): void {
    console.warn(`Simulating budget breach: ${metric} = ${value} (budget: ${budget})`);
    this.simulateMetric(metric, value, 'runtime');
  }

  /**
   * Get current performance metrics
   */
  static getCurrentMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};

    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        metrics['firstContentfulPaint'] = navigation.responseStart - navigation.requestStart;
        metrics['timeToInteractive'] = navigation.domInteractive - navigation.requestStart;
        metrics['domContentLoaded'] = navigation.domContentLoadedEventEnd - navigation.requestStart;
        metrics['loadComplete'] = navigation.loadEventEnd - navigation.requestStart;
      }

      // Memory metrics
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metrics['usedHeapSize'] = memory.usedJSHeapSize / 1024 / 1024;
        metrics['totalHeapSize'] = memory.totalJSHeapSize / 1024 / 1024;
      }

      // Network metrics
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          metrics['effectiveType'] = this.getEffectiveTypeValue(connection.effectiveType);
          metrics['downlink'] = connection.downlink;
          metrics['rtt'] = connection.rtt;
        }
      }
    }

    return metrics;
  }

  /**
   * Convert effective type to numeric value
   */
  private static getEffectiveTypeValue(type: string): number {
    const values: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4,
    };
    return values[type] || 0;
  }

  /**
   * Run performance test suite
   */
  static runPerformanceTest(): Promise<{
    score: number;
    metrics: Record<string, number>;
    recommendations: string[];
  }> {
    return new Promise((resolve) => {
      const metrics = this.getCurrentMetrics();
      const recommendations: string[] = [];
      let score = 100;

      // Evaluate metrics and provide recommendations
      Object.entries(metrics).forEach(([metric, value]) => {
        if (metric === 'firstContentfulPaint' && value > 2000) {
          score -= 10;
          recommendations.push('Optimize FCP by reducing render-blocking resources');
        }
        
        if (metric === 'timeToInteractive' && value > 5000) {
          score -= 15;
          recommendations.push('Reduce JavaScript execution time for faster TTI');
        }
        
        if (metric === 'usedHeapSize' && value > 50) {
          score -= 10;
          recommendations.push('Optimize memory usage to prevent heap size growth');
        }
        
        if (metric === 'effectiveType' && value < 3) {
          score -= 5;
          recommendations.push('Optimize for slower network connections');
        }
      });

      resolve({
        score: Math.max(0, score),
        metrics,
        recommendations,
      });
    });
  }
}
