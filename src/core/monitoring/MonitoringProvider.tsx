/**
 * Monitoring provider component for React applications
 * Provides monitoring context and automatic error tracking
 * 
 * @fileoverview React monitoring provider with context and error boundaries
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { Component, ReactNode, ErrorInfo, createContext, useContext } from 'react';
import type { ComponentType } from 'react';
import { MonitoringService } from './MonitoringService';
import { OfflineQueue } from './OfflineQueue';
import { MonitoringEvent, MonitoringSeverity } from './types';
import type { MonitoringContext } from './types';


/**
 * Monitoring provider configuration
 */
export interface MonitoringProviderConfig {
  /**
   * Monitoring service instance
   */
  service: MonitoringService;
  
  /**
   * Offline queue instance
   */
  offlineQueue?: OfflineQueue;
  
  /**
   * Enable automatic error tracking
   */
  trackErrors?: boolean;
  
  /**
   * Enable performance monitoring
   */
  trackPerformance?: boolean;
  
  /**
   * Enable user interaction tracking
   */
  trackUserActions?: boolean;
  
  /**
   * Custom error boundary fallback component
   */
  errorFallback?: ComponentType<ErrorBoundaryFallbackProps>;
  
  /**
   * Sampling rate for events (0-1)
   */
  samplingRate?: number;
  
  /**
   * Enable debug mode
   */
  debug?: boolean;
}

/**
 * Data Subject Request (DSR) result
 */
export interface DSRRResult {
  success: boolean;
  purgedEvents: number;
  purgedStorage: number;
  purgedOfflineQueue: number;
  errors: string[];
  duration: number;
}

/**
 * Monitoring context interface
 */
export interface MonitoringContextValue {
  /**
   * Monitoring service instance
   */
  service: MonitoringService;
  
  /**
   * Offline queue instance
   */
  offlineQueue?: OfflineQueue;
  
  /**
   * Track an event manually
   */
  trackEvent: (event: Partial<MonitoringEvent>) => void;
  
  /**
   * Track an error
   */
  trackError: (error: Error, context?: Record<string, unknown>) => void;
  
  /**
   * Track performance metrics
   */
  trackPerformance: (name: string, value: number, context?: Record<string, unknown>) => void;
  
  /**
   * Track user action
   */
  trackUserAction: (action: string, context?: Record<string, unknown>) => void;
  
  /**
   * Get monitoring statistics
   */
  getStats: () => any;
  
  /**
   * Enable/disable monitoring
   */
  setEnabled: (enabled: boolean) => void;
  
  /**
   * Purge all user data (DSR compliance)
   */
  purgeUserData: (userId?: string) => Promise<DSRRResult>;
  
  /**
   * Get user data summary (for DSR requests)
   */
  getUserDataSummary: (userId?: string) => Promise<{
    eventCount: number;
    storageKeys: string[];
    offlineQueueCount: number;
    dataTypes: string[];
  }>;
  
  /**
   * Export user data (for DSR portability requests)
   */
  exportUserData: (userId?: string) => Promise<{
    events: MonitoringEvent[];
    storage: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }>;
  
  /**
   * Check if user consent is given for monitoring
   */
  hasUserConsent: () => boolean;
  
  /**
   * Set user consent for monitoring
   */
  setUserConsent: (consent: boolean) => void;
}

/**
 * Error boundary fallback props
 */
export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: ComponentType<ErrorBoundaryFallbackProps> = ({
  error,
  onRetry,
  onDismiss,
}) => (
  <div
    style={{
      padding: '20px',
      border: '1px solid #ff6b6b',
      borderRadius: '8px',
      backgroundColor: '#ffe0e0',
      color: '#d63031',
      margin: '20px',
    }}
  >
    <h3>Something went wrong</h3>
    <p>An error occurred and has been reported to our monitoring system.</p>
    <details style={{ marginTop: '10px' }}>
      <summary>Error details</summary>
      <pre style={{ fontSize: '12px', marginTop: '10px' }}>
        {error.stack || error.message}
      </pre>
    </details>
    <div style={{ marginTop: '15px' }}>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginRight: '10px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#d63031',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            padding: '8px 16px',
            border: '1px solid #d63031',
            borderRadius: '4px',
            backgroundColor: 'white',
            color: '#d63031',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  </div>
);

/**
 * Monitoring context
 */
const MonitoringContext = createContext<MonitoringContextValue | null>(null);

/**
 * Hook to access monitoring context
 */
export function useMonitoring(): MonitoringContextValue {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}

/**
 * Monitoring provider component
 * 
 * @example
 * <MonitoringProvider service={monitoringService}>
 *   <App />
 * </MonitoringProvider>
 */
export class MonitoringProvider extends Component<
  MonitoringProviderConfig & { children: ReactNode }
> {
  public static contextType = MonitoringContext;
  
  private isEnabled = true;
  private performanceObserver?: PerformanceObserver;
  private clickHandler?: (event: MouseEvent) => void;
  private visibilityHandler?: () => void;
  private unhandledRejectionHandler?: (event: PromiseRejectionEvent) => void;
  private errorHandler?: (event: ErrorEvent) => void;

  constructor(props: MonitoringProviderConfig & { children: ReactNode }) {
    super(props);
    
    // Initialize monitoring
    this.initializeMonitoring();
    
    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  componentDidMount() {
    // Start performance monitoring if enabled
    if (this.props.trackPerformance) {
      this.startPerformanceMonitoring();
    }
    
    // Start user action tracking if enabled
    if (this.props.trackUserActions) {
      this.startUserActionTracking();
    }
  }

  componentWillUnmount() {
    // Clean up monitoring
    this.cleanupMonitoring();
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.trackErrors) {
      this.trackError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });
    }
  }

  private initializeMonitoring(): void {
    const { service, offlineQueue, samplingRate = 1.0 } = this.props;
    
    // Set up offline queue if provided
    if (offlineQueue) {
      offlineQueue.addProcessor(async (events) => {
        const results = await Promise.all(
          events.map(event => service.trackEvent(event))
        );
        
        const processed = results.filter(r => r.success).length;
        const failed = results.length - processed;
        
        return {
          success: failed === 0,
          processed,
          failed,
          remaining: 0,
        };
      });
    }
  }

  private setupGlobalHandlers(): void {
    if (this.props.trackErrors) {
      // Handle unhandled promise rejections
      this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        this.trackError(new Error(event.reason), {
          type: 'unhandledRejection',
          promise: true,
        });
      };
      
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
      
      // Handle uncaught errors
      this.errorHandler = (event: ErrorEvent) => {
        this.trackError(event.error || new Error(event.message), {
          type: 'uncaughtError',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      };
      
      window.addEventListener('error', this.errorHandler);
    }
  }

  private startPerformanceMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.trackPerformanceEntry(entry);
      }
    });

    try {
      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'paint', 'measure'] });
    } catch (error) {
      console.warn('Performance observer not fully supported:', error);
    }
  }

  private startUserActionTracking(): void {
    // Track clicks
    this.clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target && target.tagName) {
        this.trackUserAction('click', {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          textContent: target.textContent?.slice(0, 100),
        });
      }
    };
    
    document.addEventListener('click', this.clickHandler, true);
    
    // Track page visibility changes
    this.visibilityHandler = () => {
      this.trackUserAction('visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private cleanupMonitoring(): void {
    // Clean up performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // Clean up event listeners
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
    
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
  }

  private trackPerformanceEntry(entry: PerformanceEntry): void {
    const { name, entryType, startTime, duration } = entry;
    
    switch (entryType) {
      case 'navigation':
        this.trackPerformance('navigation', duration, {
          type: 'navigation',
          name,
        });
        break;
        
      case 'resource':
        this.trackPerformance('resource', duration, {
          type: 'resource',
          name,
          size: (entry as PerformanceResourceTiming).transferSize,
        });
        break;
        
      case 'paint':
        this.trackPerformance(name, startTime, {
          type: 'paint',
          name,
        });
        break;
        
      case 'measure':
        this.trackPerformance(name, duration, {
          type: 'measure',
          name,
        });
        break;
    }
  }

  private shouldSample(): boolean {
    const { samplingRate = 1.0 } = this.props;
    return Math.random() < samplingRate;
  }

  // Public methods for context
  private trackEvent = (eventData: Partial<MonitoringEvent>): void => {
    if (!this.isEnabled || !this.shouldSample()) {
      return;
    }

    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: 'system' as any,
      message: 'Custom event',
      ...eventData,
    };

    this.props.service.trackEvent(event);
  };

  private trackError = (error: Error, context?: Record<string, unknown>): void => {
    if (!this.isEnabled || !this.shouldSample()) {
      return;
    }

    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.ERROR,
      category: 'error' as any,
      message: error.message,
      data: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...context,
      },
    };

    this.props.service.trackEvent(event);
  };

  private trackPerformance = (name: string, value: number, context?: Record<string, unknown>): void => {
    if (!this.isEnabled || !this.shouldSample()) {
      return;
    }

    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: 'performance' as any,
      message: `Performance: ${name}`,
      data: {
        metric: name,
        value,
        ...context,
      },
    };

    this.props.service.trackEvent(event);
  };

  private trackUserAction = (action: string, context?: Record<string, unknown>): void => {
    if (!this.isEnabled || !this.shouldSample()) {
      return;
    }

    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity: MonitoringSeverity.INFO,
      category: 'user_action' as any,
      message: `User action: ${action}`,
      data: {
        action,
        ...context,
      },
    };

    this.props.service.trackEvent(event);
  };

  private getStats = () => {
    return {
      service: this.props.service.getStats(),
      offlineQueue: this.props.offlineQueue?.getStats(),
      enabled: this.isEnabled,
    };
  };

  private setEnabled = (enabled: boolean): void => {
    this.isEnabled = enabled;
  };

  private hasUserConsent = (): boolean => {
    // Check localStorage for user consent
    try {
      const consent = localStorage.getItem('monitoring_consent');
      return consent === 'true';
    } catch {
      return true; // Default to true if localStorage is not available
    }
  };

  private setUserConsent = (consent: boolean): void => {
    try {
      localStorage.setItem('monitoring_consent', consent.toString());
      
      // Log consent change for audit purposes
      this.trackEvent({
        message: `User consent ${consent ? 'granted' : 'revoked'}`,
        category: 'privacy' as any,
        severity: 'info' as any,
        data: { consent, timestamp: Date.now() },
      });
    } catch (error) {
      console.warn('Failed to store user consent:', error);
    }
  };

  private purgeUserData = async (userId?: string): Promise<DSRRResult> => {
    const startTime = Date.now();
    const result: DSRRResult = {
      success: true,
      purgedEvents: 0,
      purgedStorage: 0,
      purgedOfflineQueue: 0,
      errors: [],
      duration: 0,
    };

    try {
      // 1. Purge monitoring service events
      try {
        const purgeResult = await this.props.service.purgeUserData(userId);
        result.purgedEvents = purgeResult.purgedEvents || 0;
      } catch (error) {
        result.errors.push(`Failed to purge monitoring events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 2. Purge local storage data related to user
      try {
        const storageKeys = this.getUserStorageKeys(userId);
        for (const key of storageKeys) {
          localStorage.removeItem(key);
          result.purgedStorage++;
        }
      } catch (error) {
        result.errors.push(`Failed to purge storage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 3. Purge offline queue events
      if (this.props.offlineQueue) {
        try {
          const queueResult = await this.props.offlineQueue.purgeUserData(userId);
          result.purgedOfflineQueue = queueResult.purgedEvents || 0;
        } catch (error) {
          result.errors.push(`Failed to purge offline queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 4. Clear session storage if applicable
      try {
        if (typeof sessionStorage !== 'undefined') {
          const sessionKeys = this.getSessionStorageKeys(userId);
          for (const key of sessionKeys) {
            sessionStorage.removeItem(key);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to purge session storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Log the DSR completion for audit
      this.trackEvent({
        message: 'User data purged (DSR request)',
        category: 'privacy' as any,
        severity: 'info' as any,
        data: {
          userId,
          purgedEvents: result.purgedEvents,
          purgedStorage: result.purgedStorage,
          purgedOfflineQueue: result.purgedOfflineQueue,
          errors: result.errors.length,
        },
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`Unexpected error during data purge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  };

  private getUserStorageKeys = (userId?: string): string[] => {
    const keys: string[] = [];
    const prefix = userId ? `user_${userId}_` : 'user_';
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.warn('Failed to enumerate localStorage keys:', error);
    }
    
    return keys;
  };

  private getSessionStorageKeys = (userId?: string): string[] => {
    const keys: string[] = [];
    const prefix = userId ? `user_${userId}_` : 'user_';
    
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.warn('Failed to enumerate sessionStorage keys:', error);
    }
    
    return keys;
  };

  private getUserDataSummary = async (userId?: string) => {
    const storageKeys = this.getUserStorageKeys(userId);
    const sessionKeys = this.getSessionStorageKeys(userId);
    
    let offlineQueueCount = 0;
    if (this.props.offlineQueue) {
      try {
        const queueStats = await this.props.offlineQueue.getStats();
        offlineQueueCount = queueStats.totalEvents || 0;
      } catch (error) {
        console.warn('Failed to get offline queue stats:', error);
      }
    }

    const dataTypes = new Set<string>();
    
    // Analyze storage data types
    storageKeys.forEach(key => {
      const dataType = key.split('_')[2] || 'unknown';
      dataTypes.add(dataType);
    });

    return {
      eventCount: offlineQueueCount,
      storageKeys: [...storageKeys, ...sessionKeys],
      offlineQueueCount,
      dataTypes: Array.from(dataTypes),
    };
  };

  private exportUserData = async (userId?: string) => {
    const storageKeys = this.getUserStorageKeys(userId);
    const storage: Record<string, unknown> = {};
    
    // Collect storage data
    storageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          storage[key] = value;
        }
      } catch (error) {
        console.warn(`Failed to export storage key ${key}:`, error);
      }
    });

    // Get monitoring events
    let events: MonitoringEvent[] = [];
    try {
      events = await this.props.service.getUserEvents(userId);
    } catch (error) {
      console.warn('Failed to export monitoring events:', error);
    }

    const metadata = {
      exportDate: new Date().toISOString(),
      userId,
      totalStorageKeys: storageKeys.length,
      totalEvents: events.length,
      version: '1.0.0',
    };

    return {
      events,
      storage,
      metadata,
    };
  };

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  render() {
    const contextValue: MonitoringContextValue = {
      service: this.props.service,
      offlineQueue: this.props.offlineQueue,
      trackEvent: this.trackEvent,
      trackError: this.trackError,
      trackPerformance: this.trackPerformance,
      trackUserAction: this.trackUserAction,
      getStats: this.getStats,
      setEnabled: this.setEnabled,
      purgeUserData: this.purgeUserData,
      getUserDataSummary: this.getUserDataSummary,
      exportUserData: this.exportUserData,
      hasUserConsent: this.hasUserConsent,
      setUserConsent: this.setUserConsent,
    };

    const ErrorFallback = this.props.errorFallback || DefaultErrorFallback;

    return (
      <ErrorBoundary errorFallback={ErrorFallback}>
        <MonitoringContext.Provider value={contextValue}>
          {this.props.children}
        </MonitoringContext.Provider>
      </ErrorBoundary>
    );
  }
}

/**
 * Error boundary component for monitoring
 */
class ErrorBoundary extends Component<
  { children: ReactNode; errorFallback: ComponentType<ErrorBoundaryFallbackProps> },
  { hasError: boolean; error?: Error; errorInfo?: ErrorInfo }
> {
  constructor(props: { children: ReactNode; errorFallback: ComponentType<ErrorBoundaryFallbackProps> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleDismiss = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const ErrorFallback = this.props.errorFallback;
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onDismiss={this.handleDismiss}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to add monitoring to any component
 */
export function withMonitoring<P extends object>(
  Component: ComponentType<P>,
  options?: {
    trackProps?: string[];
    trackRender?: boolean;
    trackMount?: boolean;
    trackUnmount?: boolean;
  }
): ComponentType<P> {
  const {
    trackProps = [],
    trackRender = false,
    trackMount = true,
    trackUnmount = true,
  } = options || {};

  return function MonitoredComponent(props: P) {
    const { trackEvent, trackPerformance } = useMonitoring();
    const renderCountRef = React.useRef(0);
    const mountTimeRef = React.useRef(Date.now());

    React.useEffect(() => {
      if (trackMount) {
        trackEvent({
          message: `Component ${Component.name} mounted`,
          category: 'system' as any,
          data: { props: trackProps.length > 0 ? pick(props, trackProps as (keyof P)[]) : undefined },
        });
      }

      return () => {
        if (trackUnmount) {
          const mountDuration = Date.now() - mountTimeRef.current;
          trackPerformance(`${Component.name}_mount_duration`, mountDuration);
          trackEvent({
            message: `Component ${Component.name} unmounted`,
            category: 'system' as any,
            data: { mountDuration, renderCount: renderCountRef.current },
          });
        }
      };
    }, []);

    if (trackRender) {
      renderCountRef.current++;
      trackPerformance(`${Component.name}_render_count`, renderCountRef.current);
    }

    return <Component {...props} />;
  };
}

/**
 * Utility function to pick properties from an object
 */
function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Hook for automatic performance tracking
 */
export function usePerformanceTracking(name: string) {
  const { trackPerformance } = useMonitoring();
  const startTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
    startTimeRef.current = performance.now();
    
    return () => {
      if (startTimeRef.current) {
        const duration = performance.now() - startTimeRef.current;
        trackPerformance(`${name}_duration`, duration);
      }
    };
  }, [name]);
}

/**
 * Hook for error tracking
 */
export function useErrorTracking() {
  const { trackError } = useMonitoring();
  
  return React.useCallback((error: Error, context?: Record<string, unknown>) => {
    trackError(error, context);
  }, [trackError]);
}
