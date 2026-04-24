/**
 * Higher-order component for error boundary wrapping
 * Provides declarative error isolation for any component
 * 
 * @fileoverview HOC for automatic error boundary wrapping
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { ComponentType, ReactNode, ErrorInfo } from 'react';
import { ErrorBoundary, ErrorBoundaryConfig, ErrorRecoveryStrategy } from './ErrorBoundary';

/**
 * HOC configuration options
 */
export interface WithErrorBoundaryOptions extends Partial<ErrorBoundaryConfig> {
  /**
   * Component to wrap
   */
  component?: ComponentType<any>;
  
  /**
   * Props to pass to the wrapped component
   */
  props?: Record<string, any>;
  
  /**
   * Custom error message for this component
   */
  errorMessage?: string;
  
  /**
   * Whether to show error in development only
   */
  devOnly?: boolean;
}

/**
 * Error boundary context for nested boundaries
 */
export interface ErrorBoundaryContext {
  /**
   * Current boundary ID
   */
  boundaryId: string;
  
  /**
   * Parent boundary ID
   */
  parentBoundaryId?: string;
  
  /**
   * Error history for this boundary
   */
  errors: Array<{
    timestamp: number;
    error: Error;
    component: string;
  }>;
  
  /**
   * Report error to parent boundary
   */
  reportError: (error: Error, component: string) => void;
  
  /**
   * Get error statistics
   */
  getErrorStats: () => {
    totalErrors: number;
    recentErrors: number;
    lastErrorTime: number;
  };
}

/**
 * Creates a unique boundary ID based on component name and path
 */
function createBoundaryId(componentName: string, path: string[] = []): string {
  const pathStr = path.length > 0 ? `::${path.join('::')}` : '';
  return `${componentName}${pathStr}`;
}

/**
 * Higher-order component that wraps a component with error boundary
 * 
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   id: 'my-component',
 *   fallback: MyFallback,
 *   retryAttempts: 2
 * });
 * 
 * @param Component - Component to wrap
 * @param options - Error boundary configuration
 * @returns Wrapped component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  const {
    id,
    fallback,
    devFallback,
    onError,
    onRecovery,
    resetKeys,
    retry = true,
    retryAttempts = 3,
    retryDelay = 1000,
    maxErrorRate = 5,
    errorRateWindow = 60000,
    errorMessage,
    devOnly = false,
  } = options;

  const boundaryId = id || createBoundaryId(Component.displayName || Component.name || 'Component');

  const WrappedComponent = (props: P) => {
    // Skip error boundary in production if devOnly is true
    if (devOnly && process.env.NODE_ENV === 'production') {
      return <Component {...props} />;
    }

    const handleError = (error: Error, errorInfo: ErrorInfo, boundaryId: string) => {
      // Add custom error message if provided
      if (errorMessage) {
        error.message = `${errorMessage}: ${error.message}`;
      }

      // Call custom error handler
      if (onError) {
        onError(error, errorInfo, boundaryId);
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error Boundary [${boundaryId}]:`, error, errorInfo);
      }
    };

    return (
      <ErrorBoundary
        id={boundaryId}
        fallback={fallback}
        devFallback={devFallback}
        onError={handleError}
        onRecovery={onRecovery}
        resetKeys={resetKeys}
        retry={retry}
        retryAttempts={retryAttempts}
        retryDelay={retryDelay}
        maxErrorRate={maxErrorRate}
        errorRateWindow={errorRateWindow}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  // Preserve component display name for debugging
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Creates multiple error boundaries for different component sections
 * 
 * @example
 * const { SafeHeader, SafeMain, SafeFooter } = createErrorBoundaries({
 *   header: HeaderComponent,
 *   main: MainComponent,
 *   footer: FooterComponent
 * });
 * 
 * @param components - Object mapping names to components
 * @param defaultOptions - Default options for all boundaries
 * @returns Object with wrapped components
 */
export function createErrorBoundaries<T extends Record<string, ComponentType<any>>>(
  components: T,
  defaultOptions: WithErrorBoundaryOptions = {}
): { [K in keyof T]: ComponentType<T[K] extends ComponentType<infer P> ? P : never> } {
  const wrapped = {} as any;
  
  for (const [name, component] of Object.entries(components)) {
    wrapped[name] = withErrorBoundary(component, {
      ...defaultOptions,
      id: defaultOptions.id ? `${defaultOptions.id}-${name}` : name,
    });
  }
  
  return wrapped;
}

/**
 * Error boundary factory for common patterns
 */
export class ErrorBoundaryFactory {
  /**
   * Creates an error boundary for route components
   */
  static forRoute<P extends object>(
    Component: ComponentType<P>,
    routeName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `route-${routeName}`,
      retryAttempts: 1,
      maxErrorRate: 3,
      errorMessage: `Route "${routeName}" encountered an error`,
    });
  }

  /**
   * Creates an error boundary for widget components
   */
  static forWidget<P extends object>(
    Component: ComponentType<P>,
    widgetName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `widget-${widgetName}`,
      retryAttempts: 2,
      retryDelay: 500,
      maxErrorRate: 10,
      errorMessage: `Widget "${widgetName}" failed to load`,
    });
  }

  /**
   * Creates an error boundary for form components
   */
  static forForm<P extends object>(
    Component: ComponentType<P>,
    formName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `form-${formName}`,
      retry: false, // Don't auto-retry forms
      resetKeys: [], // Reset on any prop change
      errorMessage: `Form "${formName}" encountered an error`,
    });
  }

  /**
   * Creates an error boundary for async components
   */
  static forAsync<P extends object>(
    Component: ComponentType<P>,
    componentName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `async-${componentName}`,
      retryAttempts: 5,
      retryDelay: 2000,
      maxErrorRate: 8,
      errorMessage: `Async component "${componentName}" failed`,
    });
  }

  /**
   * Creates an error boundary for critical components
   */
  static forCritical<P extends object>(
    Component: ComponentType<P>,
    componentName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `critical-${componentName}`,
      retry: false,
      fallback: () => (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center',
          backgroundColor: '#fee',
          border: '2px solid #f00',
          borderRadius: '8px',
          color: '#900'
        }}>
          <h2>Critical Component Error</h2>
          <p>The essential component "{componentName}" has failed.</p>
          <p>Please refresh the page to continue.</p>
        </div>
      ),
      errorMessage: `Critical component "${componentName}" failed`,
    });
  }
}

/**
 * Error boundary decorator for class components
 * 
 * @example
 * @withErrorBoundaryDecorator({
 *   id: 'my-class-component',
 *   retryAttempts: 2
 * })
 * class MyClassComponent extends React.Component {
 *   // Component implementation
 * }
 */
export function withErrorBoundaryDecorator(options: WithErrorBoundaryOptions = {}) {
  return function <T extends ComponentType<any>>(Constructor: T): T {
    return withErrorBoundary(Constructor, options) as T;
  };
}

/**
 * Hook for programmatic error boundary creation
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<ErrorInfo | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  const captureError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    setError(error);
    setErrorInfo(errorInfo || { componentStack: '' });
  }, []);

  return {
    error,
    errorInfo,
    resetError,
    captureError,
  };
}

/**
 * Error boundary testing utilities
 */
export class ErrorBoundaryTestUtils {
  /**
   * Simulates an error in a component
   */
  static simulateError(message: string = 'Test error'): never {
    throw new Error(message);
  }

  /**
   * Creates a test component that throws an error
   */
  static createErrorComponent(message: string = 'Test error'): ComponentType {
    return () => {
      this.simulateError(message);
    };
  }

  /**
   * Creates a test component that throws after a delay
   */
  static createDelayedErrorComponent(
    delay: number = 1000,
    message: string = 'Delayed test error'
  ): ComponentType {
    return () => {
      React.useEffect(() => {
        const timer = setTimeout(() => {
          throw new Error(message);
        }, delay);
        return () => clearTimeout(timer);
      }, []);
      return <div>Loading...</div>;
    };
  }

  /**
   * Creates a test component that throws on specific conditions
   */
  static createConditionalErrorComponent(
    condition: () => boolean,
    message: string = 'Conditional test error'
  ): ComponentType {
    return () => {
      if (condition()) {
        throw new Error(message);
      }
      return <div>No error</div>;
    };
  }
}

/**
 * Error boundary performance monitoring
 */
export class ErrorBoundaryMonitor {
  private static instance: ErrorBoundaryMonitor;
  private errorCounts = new Map<string, number>();
  private errorTimes = new Map<string, number[]>();
  private recoveryStats = new Map<string, {
    retry: number;
    reset: number;
    ignore: number;
    escalate: number;
  }>();

  static getInstance(): ErrorBoundaryMonitor {
    if (!this.instance) {
      this.instance = new ErrorBoundaryMonitor();
    }
    return this.instance;
  }

  recordError(boundaryId: string): void {
    const count = this.errorCounts.get(boundaryId) || 0;
    this.errorCounts.set(boundaryId, count + 1);

    const times = this.errorTimes.get(boundaryId) || [];
    times.push(Date.now());
    this.errorTimes.set(boundaryId, times.slice(-100)); // Keep last 100 errors
  }

  recordRecovery(boundaryId: string, strategy: ErrorRecoveryStrategy): void {
    const stats: Record<ErrorRecoveryStrategy, number> = Object.assign({
      retry: 0,
      reset: 0,
      ignore: 0,
      escalate: 0,
      fallback: 0,
    }, this.recoveryStats.get(boundaryId) || {});
    if (strategy === 'retry') stats.retry++;
    else if (strategy === 'reset') stats.reset++;
    else if (strategy === 'ignore') stats.ignore++;
    else if (strategy === 'escalate') stats.escalate++;
    else if (strategy === 'fallback') stats.fallback++;
    this.recoveryStats.set(boundaryId, stats);
  }

  getStats(boundaryId: string): {
    errorCount: number;
    recentErrors: number;
    recoveryStats: Record<ErrorRecoveryStrategy, number>;
    errorRate: number;
  } {
    const errorCount = this.errorCounts.get(boundaryId) || 0;
    const errorTimes = this.errorTimes.get(boundaryId) || [];
    const recentErrors = errorTimes.filter(time => Date.now() - time < 60000).length; // Last minute
    const recoveryStats: Record<ErrorRecoveryStrategy, number> = (this.recoveryStats.get(boundaryId) || {
      retry: 0,
      reset: 0,
      ignore: 0,
      abort: 0,
      fallback: 0,
    }) as Record<ErrorRecoveryStrategy, number>;

    return {
      errorCount,
      recentErrors,
      recoveryStats,
      errorRate: recentErrors,
    };
  }

  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const allStats: Record<string, ReturnType<typeof this.getStats>> = {};
    
    for (const boundaryId of this.errorCounts.keys()) {
      allStats[boundaryId] = this.getStats(boundaryId);
    }
    
    return allStats;
  }

  reset(): void {
    this.errorCounts.clear();
    this.errorTimes.clear();
    this.recoveryStats.clear();
  }
}
