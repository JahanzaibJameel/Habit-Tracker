/**
 * React hook for unified monitoring system
 * Provides easy access to all monitoring capabilities from React components
 * 
 * @fileoverview React hook for monitoring system
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MonitoringService, MonitoringServiceConfig } from './MonitoringService';
import { MonitoringStats, MonitoringBreadcrumb, AnyMonitoringEvent, MonitoringExportOptions } from './types';

/**
 * Hook state
 */
export interface MonitoringHookState {
  initialized: boolean;
  stats: MonitoringStats;
  recentEvents: AnyMonitoringEvent[];
  breadcrumbs: MonitoringBreadcrumb[];
  isOnline: boolean;
  queueSize: number;
}

/**
 * Hook actions
 */
export interface MonitoringHookActions {
  captureError: (error: Error, context?: any) => Promise<void>;
  capturePerformance: (name: string, value: number, unit: string, budget?: number) => Promise<void>;
  captureUserAction: (action: string, target: string, properties?: Record<string, unknown>) => Promise<void>;
  captureBusiness: (event: string, properties: Record<string, unknown>, value?: number) => Promise<void>;
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) => Promise<void>;
  setUser: (userId: string, attributes?: Record<string, unknown>) => Promise<void>;
  exportData: (options?: MonitoringExportOptions) => Promise<string>;
  clearData: () => Promise<void>;
  refreshStats: () => void;
}

/**
 * Hook options
 */
export interface UseMonitoringOptions {
  /**
   * Auto-initialize on mount
   */
  autoInitialize?: boolean;
  
  /**
   * Auto-cleanup on unmount
   */
  autoCleanup?: boolean;
  
  /**
   * Stats refresh interval (ms)
   */
  statsRefreshInterval?: number;
}

/**
 * React hook for monitoring system
 * 
 * @example
 * const { state, actions } = useMonitoring({
 *   autoInitialize: true,
 *   statsRefreshInterval: 5000
 * });
 */
export function useMonitoring(
  config: MonitoringServiceConfig,
  options: UseMonitoringOptions = {}
): {
  state: MonitoringHookState;
  actions: MonitoringHookActions;
  service: MonitoringService;
} {
  const {
    autoInitialize = true,
    autoCleanup = true,
    statsRefreshInterval = 5000,
  } = options;

  // Service instance ref
  const serviceRef = useRef<MonitoringService | null>(null);
  
  // State management
  const [state, setState] = useState<MonitoringHookState>({
    initialized: false,
    stats: {
      totalEvents: 0,
      eventsByCategory: {} as any,
      eventsBySeverity: {} as any,
      queueSize: 0,
      lastEventTimestamp: 0,
      adapterStatus: 'disconnected',
    },
    recentEvents: [],
    breadcrumbs: [],
    isOnline: navigator.onLine,
    queueSize: 0,
  });

  // Stats refresh timer ref
  const statsTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new MonitoringService(config);
    }

    return () => {
      if (autoCleanup && serviceRef.current) {
        serviceRef.current.cleanup();
      }
    };
  }, [config, autoCleanup]);

  // Auto-initialize
  useEffect(() => {
    if (autoInitialize && serviceRef.current && !state.initialized) {
      serviceRef.current.initialize().then(() => {
        setState(prev => ({ ...prev, initialized: true }));
      }).catch(error => {
        console.error('Failed to initialize monitoring service:', error);
      });
    }
  }, [autoInitialize, state.initialized]);

  // Stats refresh
  useEffect(() => {
    const refreshStats = () => {
      if (serviceRef.current) {
        const stats = serviceRef.current.getStats();
        const recentEvents = serviceRef.current.getRecentEvents(20);
        const breadcrumbs = serviceRef.current.getBreadcrumbs();

        setState(prev => ({
          ...prev,
          stats,
          recentEvents,
          breadcrumbs,
          queueSize: stats.queueSize,
        }));
      }
    };

    // Initial refresh
    refreshStats();

    // Periodic refresh
    if (statsRefreshInterval > 0) {
      statsTimerRef.current = setInterval(refreshStats, statsRefreshInterval);
    }

    return () => {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
      }
    };
  }, [statsRefreshInterval]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Actions
  const actions: MonitoringHookActions = {
    captureError: useCallback(async (error: Error, context?: any) => {
      if (serviceRef.current) {
        await serviceRef.current.captureError(error, context);
      }
    }, []),

    capturePerformance: useCallback(async (
      name: string,
      value: number,
      unit: string,
      budget?: number
    ) => {
      if (serviceRef.current) {
        await serviceRef.current.capturePerformance(name, value, unit, undefined, budget);
      }
    }, []),

    captureUserAction: useCallback(async (
      action: string,
      target: string,
      properties?: Record<string, unknown>
    ) => {
      if (serviceRef.current) {
        await serviceRef.current.captureUserAction(action, target, properties);
      }
    }, []),

    captureBusiness: useCallback(async (
      event: string,
      properties: Record<string, unknown>,
      value?: number
    ) => {
      if (serviceRef.current) {
        await serviceRef.current.captureBusiness(event, properties, undefined, value);
      }
    }, []),

    addBreadcrumb: useCallback(async (
      message: string,
      category?: string,
      data?: Record<string, unknown>
    ) => {
      if (serviceRef.current) {
        await serviceRef.current.addBreadcrumb(message, category, 'info', data);
      }
    }, []),

    setUser: useCallback(async (
      userId: string,
      attributes?: Record<string, unknown>
    ) => {
      if (serviceRef.current) {
        await serviceRef.current.setUser(userId, attributes);
      }
    }, []),

    exportData: useCallback(async (options?: MonitoringExportOptions) => {
      if (serviceRef.current) {
        return await serviceRef.current.exportData(options || { format: 'json' });
      }
      return '{}';
    }, []),

    clearData: useCallback(async () => {
      if (serviceRef.current) {
        await serviceRef.current.clearData();
        setState(prev => ({
          ...prev,
          recentEvents: [],
          breadcrumbs: [],
        }));
      }
    }, []),

    refreshStats: useCallback(() => {
      if (serviceRef.current) {
        const stats = serviceRef.current.getStats();
        const recentEvents = serviceRef.current.getRecentEvents(20);
        const breadcrumbs = serviceRef.current.getBreadcrumbs();

        setState(prev => ({
          ...prev,
          stats,
          recentEvents,
          breadcrumbs,
          queueSize: stats.queueSize,
        }));
      }
    }, []),
  };

  if (!serviceRef.current) {
    throw new Error('Monitoring service not initialized');
  }

  return { state, actions, service: serviceRef.current };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitoring(service: MonitoringService) {
  const capturePerformance = useCallback(async (
    name: string,
    value: number,
    unit: string,
    budget?: number
  ) => {
    await service.capturePerformance(name, value, unit, undefined, budget);
  }, [service]);

  const measureAsync = useCallback(async <T>(
    name: string,
    fn: () => Promise<T>,
    budget?: number
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      await capturePerformance(name, duration, 'ms', budget);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      await capturePerformance(`${name}_error`, duration, 'ms');
      throw error;
    }
  }, [capturePerformance]);

  const measureSync = useCallback(<T>(
    name: string,
    fn: () => T,
    budget?: number
  ): T => {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      capturePerformance(name, duration, 'ms', budget);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      capturePerformance(`${name}_error`, duration, 'ms');
      throw error;
    }
  }, [capturePerformance]);

  return {
    capturePerformance,
    measureAsync,
    measureSync,
  };
}

/**
 * Hook for user action tracking
 */
export function useUserActionTracking(service: MonitoringService) {
  const captureUserAction = useCallback(async (
    action: string,
    target: string,
    properties?: Record<string, unknown>
  ) => {
    await service.captureUserAction(action, target, properties);
  }, [service]);

  const trackClick = useCallback(async (
    target: string,
    properties?: Record<string, unknown>
  ) => {
    await captureUserAction('click', target, properties);
  }, [captureUserAction]);

  const trackFormSubmit = useCallback(async (
    formName: string,
    properties?: Record<string, unknown>
  ) => {
    await captureUserAction('form_submit', formName, properties);
  }, [captureUserAction]);

  const trackNavigation = useCallback(async (
    route: string,
    properties?: Record<string, unknown>
  ) => {
    await captureUserAction('navigation', route, properties);
  }, [captureUserAction]);

  return {
    captureUserAction,
    trackClick,
    trackFormSubmit,
    trackNavigation,
  };
}

/**
 * Hook for error monitoring
 */
export function useErrorMonitoring(service: MonitoringService) {
  const captureError = useCallback(async (error: Error, context?: any) => {
    await service.captureError(error, context);
  }, [service]);

  const captureException = useCallback(async (
    error: unknown,
    context?: any
  ) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    await captureError(errorObj, context);
  }, [captureError]);

  const withErrorHandling = useCallback(<T>(
    fn: () => T,
    context?: any
  ): T | null => {
    try {
      return fn();
    } catch (error) {
      captureException(error, context);
      return null;
    }
  }, [captureException]);

  const withAsyncErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>,
    context?: any
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      await captureException(error, context);
      return null;
    }
  }, [captureException]);

  return {
    captureError,
    captureException,
    withErrorHandling,
    withAsyncErrorHandling,
  };
}

/**
 * Hook for monitoring dashboard
 */
export function useMonitoringDashboard(service: MonitoringService) {
  const [dashboardData, setDashboardData] = useState({
    stats: service.getStats(),
    recentEvents: service.getRecentEvents(10),
    breadcrumbs: service.getBreadcrumbs(),
  });

  const refreshDashboard = useCallback(() => {
    setDashboardData({
      stats: service.getStats(),
      recentEvents: service.getRecentEvents(10),
      breadcrumbs: service.getBreadcrumbs(),
    });
  }, [service]);

  useEffect(() => {
    const timer = setInterval(refreshDashboard, 5000);
    return () => clearInterval(timer);
  }, [refreshDashboard]);

  const exportDashboardData = useCallback(async () => {
    return await service.exportData({
      format: 'json',
      includeContext: true,
      includeBreadcrumbs: true,
    });
  }, [service]);

  return {
    ...dashboardData,
    refreshDashboard,
    exportDashboardData,
  };
}
