/**
 * React components for Error Isolation Tree System
 * Separate file to handle JSX properly
 */

import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';

import { safeLocalStorage, safeWindow } from '../utils/ssr-safe';
import type { ClassifiedError, ErrorBoundaryConfig } from './error-isolation';
import { ErrorClassifier, ErrorLevel, ErrorSeverity } from './error-isolation';

// Base error boundary with isolation capabilities
export abstract class IsolatedErrorBoundary extends Component<
  {
    children: ReactNode;
    config: ErrorBoundaryConfig;
    fallbackComponent?: ReactNode;
  },
  {
    hasError: boolean;
    error?: ClassifiedError;
    isRetrying: boolean;
  }
> {
  protected retryTimeoutId?: NodeJS.Timeout;
  protected errorHistory: ClassifiedError[] = [];

  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<{ hasError: boolean; error?: ClassifiedError }> {
    const classifiedError = ErrorClassifier.classify(error);
    return { hasError: true, error: classifiedError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const classifiedError = ErrorClassifier.classify(error, {
      componentStack: errorInfo.componentStack,
      level: this.props.config.level,
    });

    if (errorInfo.componentStack) {
      (classifiedError as any).componentStack = errorInfo.componentStack as string;
    }
    classifiedError.level = this.props.config.level;

    this.errorHistory.push(classifiedError);

    // Log error to monitoring
    this.logError(classifiedError);

    // Call custom error handler
    if (this.props.config.onError) {
      this.props.config.onError(classifiedError);
    }

    // Auto-retry if enabled and error is recoverable
    if (this.props.config.enableRetry && classifiedError.recoverable) {
      this.scheduleRetry(classifiedError);
    }

    this.setState({ error: classifiedError });
  }

  protected scheduleRetry(error: ClassifiedError) {
    if (error.retryCount >= error.maxRetries) {
      console.warn(`Max retries exceeded for error: ${error.id}`);
      return;
    }

    this.setState({ isRetrying: true });

    this.retryTimeoutId = setTimeout(
      () => {
        error.retryCount++;
        this.setState({ hasError: false, isRetrying: false } as any);

        if (this.props.config.onRecovery) {
          this.props.config.onRecovery();
        }
      },
      this.props.config.retryDelay * Math.pow(2, error.retryCount)
    ); // Exponential backoff
  }

  protected logError(error: ClassifiedError) {
    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const errorLogs = JSON.parse(storage.getItem('error-isolation-logs') || '[]');
      errorLogs.push(error);

      // Keep only last 50 errors
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }

      storage.setItem('error-isolation-logs', JSON.stringify(errorLogs));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    // Console logging with severity
    const logMethod =
      error.severity === ErrorSeverity.CRITICAL
        ? 'error'
        : error.severity === ErrorSeverity.HIGH
          ? 'error'
          : error.severity === ErrorSeverity.MEDIUM
            ? 'warn'
            : 'log';

    console[logMethod](`[${error.level.toUpperCase()}] ${error.category}:`, error.message, error);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  protected handleManualRetry = () => {
    if (this.state.error) {
      this.scheduleRetry(this.state.error);
    }
  };

  protected handleClearError = () => {
    this.setState({ hasError: false, isRetrying: false } as any);
  };

  abstract render(): ReactNode;
}

// Level 1: Component-level error boundary
export class ComponentErrorBoundary extends IsolatedErrorBoundary {
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-red-800">Component Error</h4>
              <p className="text-xs text-red-600 mt-1">
                {process.env.NODE_ENV === 'development'
                  ? this.state.error.message
                  : 'A component encountered an error'}
              </p>
            </div>
            {this.props.config.enableRetry && this.state.error.recoverable && (
              <button
                onClick={this.handleManualRetry}
                disabled={this.state.isRetrying}
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
              >
                {this.state.isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Level 2: Feature-level isolation boundary
export class FeatureErrorBoundary extends IsolatedErrorBoundary {
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="p-6 border border-orange-200 rounded-lg bg-orange-50">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-orange-800 mb-2">Feature Unavailable</h3>
            <p className="text-sm text-orange-600 mb-4">
              This feature encountered an error and is temporarily unavailable.
            </p>
            <div className="flex gap-2 justify-center">
              {this.props.config.enableRetry && this.state.error.recoverable && (
                <button
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRetrying}
                  className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                >
                  {this.state.isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              <button
                onClick={this.handleClearError}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Level 3: Route-level fallback system
export class RouteErrorBoundary extends IsolatedErrorBoundary {
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Error</h2>
            <p className="text-gray-600 mb-6">
              {process.env.NODE_ENV === 'development'
                ? this.state.error.message
                : 'This page encountered an error. Please try refreshing or navigating to another page.'}
            </p>
            <div className="space-y-3">
              {this.props.config.enableRetry && this.state.error.recoverable && (
                <button
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRetrying}
                  className="w-full px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
                >
                  {this.state.isRetrying ? 'Retrying...' : 'Retry Loading Page'}
                </button>
              )}
              <button
                onClick={() => {
                  const window = safeWindow();
                  if (window) {
                    window.location.href = '/';
                  }
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Level 4: Global application safety net
export class GlobalErrorBoundary extends IsolatedErrorBoundary {
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="max-w-lg w-full p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-900 mb-4">Application Error</h1>
            <p className="text-red-700 mb-6">
              The application encountered a critical error and needs to be restarted.
            </p>
            <div className="space-y-3">
              {this.props.config.enableRetry && this.state.error.recoverable && (
                <button
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRetrying}
                  className="w-full px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 font-medium"
                >
                  {this.state.isRetrying ? 'Attempting Recovery...' : 'Recover Application'}
                </button>
              )}
              <button
                onClick={() => {
                  const window = safeWindow();
                  if (window) {
                    window.location.reload();
                  }
                }}
                className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  const storage = safeLocalStorage();
                  if (storage) {
                    storage.clear();
                  }
                  const window = safeWindow();
                  if (window) {
                    window.location.reload();
                  }
                }}
                className="w-full px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-100"
              >
                Clear Data & Reload
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-red-600">Error Details</summary>
                <pre className="mt-2 p-4 bg-red-100 rounded text-xs overflow-auto">
                  {JSON.stringify(this.state.error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Factory functions for creating error boundaries
export function createComponentErrorBoundary(config: Partial<ErrorBoundaryConfig> = {}) {
  return new ComponentErrorBoundary({
    level: ErrorLevel.COMPONENT,
    maxRetries: 3,
    retryDelay: 1000,
    enableRetry: true,
    enableFallback: true,
    isolateErrors: true,
    ...config,
  });
}

export function createFeatureErrorBoundary(config: Partial<ErrorBoundaryConfig> = {}) {
  return new FeatureErrorBoundary({
    level: ErrorLevel.FEATURE,
    maxRetries: 2,
    retryDelay: 2000,
    enableRetry: true,
    enableFallback: true,
    isolateErrors: true,
    ...config,
  });
}

export function createRouteErrorBoundary(config: Partial<ErrorBoundaryConfig> = {}) {
  return new RouteErrorBoundary({
    level: ErrorLevel.ROUTE,
    maxRetries: 2,
    retryDelay: 3000,
    enableRetry: true,
    enableFallback: true,
    isolateErrors: true,
    ...config,
  });
}

export function createGlobalErrorBoundary(config: Partial<ErrorBoundaryConfig> = {}) {
  return new GlobalErrorBoundary({
    level: ErrorLevel.GLOBAL,
    maxRetries: 1,
    retryDelay: 5000,
    enableRetry: true,
    enableFallback: true,
    isolateErrors: true,
    ...config,
  });
}

// React components for use in JSX
export const ComponentBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
}> = ({ children, fallback, config }) => {
  const boundary = createComponentErrorBoundary(config);
  return React.createElement(
    ComponentErrorBoundary,
    {
      ...boundary.props,
      fallbackComponent: fallback,
      config: boundary.props.config,
    },
    children
  );
};

export const FeatureBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
}> = ({ children, fallback, config }) => {
  const boundary = createFeatureErrorBoundary(config);
  return React.createElement(
    FeatureErrorBoundary,
    {
      ...boundary.props,
      fallbackComponent: fallback,
      config: boundary.props.config,
    },
    children
  );
};

export const RouteBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
}> = ({ children, fallback, config }) => {
  const boundary = createRouteErrorBoundary(config);
  return React.createElement(
    RouteErrorBoundary,
    {
      ...boundary.props,
      fallbackComponent: fallback,
      config: boundary.props.config,
    },
    children
  );
};

export const GlobalBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
}> = ({ children, fallback, config }) => {
  const boundary = createGlobalErrorBoundary(config);
  return React.createElement(
    GlobalErrorBoundary,
    {
      ...boundary.props,
      fallbackComponent: fallback,
      config: boundary.props.config,
    },
    children
  );
};
