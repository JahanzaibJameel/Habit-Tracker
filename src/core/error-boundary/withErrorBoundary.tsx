import React, { type ComponentType, type ErrorInfo } from 'react';

import type { ErrorBoundaryConfig, ErrorRecoveryStrategy } from './ErrorBoundary';
import { ErrorBoundary } from './ErrorBoundary';

export interface WithErrorBoundaryOptions extends Partial<ErrorBoundaryConfig> {
  component?: ComponentType<Record<string, unknown>>;

  props?: Record<string, unknown>;

  errorMessage?: string;

  devOnly?: boolean;
}

export interface ErrorBoundaryContext {
  boundaryId: string;

  parentBoundaryId?: string;
  errors: Array<{
    timestamp: number;
    error: Error;
    component: string;
  }>;

  reportError: (error: Error, component: string) => void;

  getErrorStats: () => {
    totalErrors: number;
    recentErrors: number;
    lastErrorTime: number;
  };
}

function createBoundaryId(componentName: string, path: string[] = []): string {
  const pathStr = path.length > 0 ? `::${path.join('::')}` : '';
  return `${componentName}${pathStr}`;
}

export const withErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> => {
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
    if (devOnly && process.env.NODE_ENV === 'production') {
      return <Component {...props} />;
    }

    const handleError = (error: Error, errorInfo: ErrorInfo, boundaryId: string) => {
      if (errorMessage) {
        error.message = `${errorMessage}: ${error.message}`;
      }

      if (onError) {
        onError(error, errorInfo, boundaryId);
      }

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

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};

export function createErrorBoundaries<
  T extends Record<string, ComponentType<Record<string, unknown>>>,
>(
  components: T,
  defaultOptions: WithErrorBoundaryOptions = {}
): { [K in keyof T]: ComponentType<T[K] extends ComponentType<infer P> ? P : never> } {
  const wrapped = {} as {
    [K in keyof T]: ComponentType<T[K] extends ComponentType<infer P> ? P : never>;
  };

  for (const [name, component] of Object.entries(components)) {
    (wrapped as Record<string, unknown>)[name] = withErrorBoundary(component, {
      ...defaultOptions,
      id: defaultOptions.id ? `${defaultOptions.id}-${name}` : name,
    });
  }

  return wrapped;
}

export class ErrorBoundaryFactory {
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

  static forForm<P extends object>(
    Component: ComponentType<P>,
    formName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `form-${formName}`,
      retry: false,
      resetKeys: [],
      errorMessage: `Form "${formName}" encountered an error`,
    });
  }

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

  static forCritical<P extends object>(
    Component: ComponentType<P>,
    componentName: string
  ): ComponentType<P> {
    return withErrorBoundary(Component, {
      id: `critical-${componentName}`,
      retry: false,
      fallback: () => (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#fee',
            border: '2px solid #f00',
            borderRadius: '8px',
            color: '#900',
          }}
        >
          <h2>Critical Component Error</h2>
          <p>The essential component "{componentName}" has failed.</p>
          <p>Please refresh the page to continue.</p>
        </div>
      ),
      errorMessage: `Critical component "${componentName}" failed`,
    });
  }
}

export function withErrorBoundaryDecorator(options: WithErrorBoundaryOptions = {}) {
  return function <T extends ComponentType<Record<string, unknown>>>(Constructor: T): T {
    return withErrorBoundary(Constructor, options) as T;
  };
}

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

export class ErrorBoundaryTestUtils {
  static simulateError(message: string = 'Test error'): never {
    throw new Error(message);
  }

  static createErrorComponent(message: string = 'Test error'): ComponentType {
    return () => {
      this.simulateError(message);
    };
  }

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

export class ErrorBoundaryMonitor {
  private static instance: ErrorBoundaryMonitor;
  private errorCounts = new Map<string, number>();
  private errorTimes = new Map<string, number[]>();
  private recoveryStats = new Map<
    string,
    {
      retry: number;
      reset: number;
      ignore: number;
      escalate: number;
    }
  >();

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
    this.errorTimes.set(boundaryId, times.slice(-100));
  }

  recordRecovery(boundaryId: string, strategy: ErrorRecoveryStrategy): void {
    const stats: Record<ErrorRecoveryStrategy, number> = Object.assign(
      {
        retry: 0,
        reset: 0,
        ignore: 0,
        escalate: 0,
        fallback: 0,
      },
      this.recoveryStats.get(boundaryId) || {}
    );
    if (strategy === 'retry') {
      stats.retry++;
    } else if (strategy === 'reset') {
      stats.reset++;
    } else if (strategy === 'ignore') {
      stats.ignore++;
    } else if (strategy === 'escalate') {
      stats.escalate++;
    } else if (strategy === 'fallback') {
      stats.fallback++;
    }
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
    const recentErrors = errorTimes.filter((time) => Date.now() - time < 60000).length;
    const recoveryStats: Record<ErrorRecoveryStrategy, number> = (this.recoveryStats.get(
      boundaryId
    ) || {
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
