/**
 * Advanced Error Boundary with hierarchical isolation
 * Prevents cascading failures and provides recovery strategies
 *
 * @fileoverview Error boundary component with isolation capabilities
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import type { ReactNode, ErrorInfo, ComponentType } from 'react';
import React, { Component } from 'react';

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
  /**
   * Unique identifier for this boundary
   */
  id: string;

  /**
   * Fallback component to render on error
   */
  fallback?: ComponentType<ErrorFallbackProps>;

  /**
   * Development fallback component
   */
  devFallback?: ComponentType<ErrorFallbackProps>;

  /**
   * Error callback for logging/monitoring
   */
  onError?: (error: Error, errorInfo: ErrorInfo, boundaryId: string) => void;

  /**
   * Recovery callback
   */
  onRecovery?: (boundaryId: string, strategy: ErrorRecoveryStrategy) => void;

  /**
   * Reset keys that trigger boundary reset when changed
   */
  resetKeys?: readonly unknown[];

  /**
   * Whether to retry automatically
   */
  retry?: boolean;

  /**
   * Number of retry attempts
   */
  retryAttempts?: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;

  /**
   * Maximum error rate before circuit breaker
   */
  maxErrorRate?: number;

  /**
   * Time window for error rate calculation (ms)
   */
  errorRateWindow?: number;
}

/**
 * Error recovery strategies
 */
export enum ErrorRecoveryStrategy {
  RETRY = 'retry',
  RESET = 'reset',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  ESCALATE = 'escalate',
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  errorHistory: Array<{
    timestamp: number;
    error: Error;
    errorInfo: ErrorInfo;
  }>;
  circuitBreakerOpen: boolean;
  lastErrorTime: number;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  boundaryId: string;
  retryCount: number;
  onRetry: () => void;
  onReset: () => void;
  onIgnore: () => void;
  recoveryStrategies: ErrorRecoveryStrategy[];
  isDevelopment: boolean;
  circuitBreakerOpen: boolean;
}

/**
 * Default production fallback component
 */
const DefaultProductionFallback: ComponentType<ErrorFallbackProps> = ({
  boundaryId,
  onRetry,
  retryCount,
  recoveryStrategies,
  circuitBreakerOpen,
}) => {
  const canRetry = recoveryStrategies.includes(ErrorRecoveryStrategy.RETRY) && !circuitBreakerOpen;
  const maxRetries = 3;

  return (
    <div
      data-boundary-id={boundaryId}
      className="p-4 text-center bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-xl text-rose-900 dark:text-rose-100"
    >
      <h3 className="mb-2 text-base font-bold">
        Something went wrong
      </h3>
      <p className="mb-4 text-sm">
        This section encountered an error and couldn't display properly.
      </p>

      {canRetry && retryCount < maxRetries && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-rose-600 text-white border-none rounded-lg cursor-pointer mr-2 hover:bg-rose-700 transition-colors"
        >
          Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
        </button>
      )}

      {circuitBreakerOpen && (
        <p className="mt-2 text-xs italic">
          Temporarily disabled due to repeated errors. Please refresh the page.
        </p>
      )}
    </div>
  );
};

/**
 * Default development fallback component with detailed error info
 */
const DefaultDevelopmentFallback: ComponentType<ErrorFallbackProps> = ({
  error,
  errorInfo,
  boundaryId,
  retryCount,
  onRetry,
  onReset,
  onIgnore,
  recoveryStrategies,
  circuitBreakerOpen,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="p-4 border-2 border-rose-500 dark:border-rose-400 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-900 dark:text-rose-100 mx-4 my-4 font-mono"
    >
      <div
        className="flex justify-between items-center mb-4"
      >
        <h3 className="m-0 text-base font-bold">
          Error Boundary: {boundaryId}
        </h3>
        <span className="text-xs opacity-70">Retry: {retryCount}</span>
      </div>

      <p className="m-0 mb-4 text-sm">{error.message}</p>

      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-2 py-1 bg-sky-600 text-white border-none rounded cursor-pointer mr-2 text-xs hover:bg-sky-700 transition-colors"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>

        {recoveryStrategies.includes(ErrorRecoveryStrategy.RETRY) && !circuitBreakerOpen && (
          <button
            onClick={onRetry}
            className="px-2 py-1 bg-emerald-600 text-white border-none rounded cursor-pointer mr-2 text-xs hover:bg-emerald-700 transition-colors"
          >
            Retry
          </button>
        )}

        {recoveryStrategies.includes(ErrorRecoveryStrategy.RESET) && (
          <button
            onClick={onReset}
            className="px-2 py-1 bg-amber-600 text-white border-none rounded cursor-pointer mr-2 text-xs hover:bg-amber-700 transition-colors"
          >
            Reset
          </button>
        )}

        {recoveryStrategies.includes(ErrorRecoveryStrategy.IGNORE) && (
          <button
            onClick={onIgnore}
            className="px-2 py-1 bg-slate-600 text-white border-none rounded cursor-pointer text-xs hover:bg-slate-700 transition-colors"
          >
            Ignore
          </button>
        )}
      </div>

      {showDetails && (
        <div className="text-xs leading-relaxed">
          <div className="mb-2">
            <strong>Error:</strong> {error.name}
          </div>
          <div className="mb-2">
            <strong>Stack:</strong>
            <pre
              className="m-1 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto"
            >
              {error.stack}
            </pre>
          </div>
          <div className="mb-2">
            <strong>Component Stack:</strong>
            <pre
              className="m-1 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto"
            >
              {errorInfo.componentStack}
            </pre>
          </div>
          {circuitBreakerOpen && (
            <div className="text-rose-600 dark:text-rose-400 font-bold">
              Circuit breaker is open - automatic retries disabled
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Advanced Error Boundary Component
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryConfig & { children: ReactNode },
  ErrorBoundaryState
> {
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  private retryTimer?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryConfig & { children: ReactNode }) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      errorHistory: [],
      circuitBreakerOpen: false,
      lastErrorTime: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, id } = this.props;

    // Add to error history
    const errorEntry = {
      timestamp: Date.now(),
      error,
      errorInfo,
    };

    this.setState((prevState) => ({
      errorInfo,
      errorHistory: [...prevState.errorHistory.slice(-9), errorEntry], // Keep last 10 errors
    }));

    // Check circuit breaker
    this.checkCircuitBreaker();

    // Call error callback
    if (onError) {
      onError(error, errorInfo, id);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error Boundary [${id}]:`, error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryConfig & { children: ReactNode }) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset boundary if reset keys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  /**
   * Checks if circuit breaker should be opened
   */
  private checkCircuitBreaker = () => {
    const { maxErrorRate = 5, errorRateWindow = 60000 } = this.props; // 5 errors per minute default
    const { errorHistory } = this.state;

    const now = Date.now();
    const recentErrors = errorHistory.filter((entry) => now - entry.timestamp < errorRateWindow);

    if (recentErrors.length >= maxErrorRate) {
      this.setState({ circuitBreakerOpen: true });

      // Auto-close circuit breaker after 5 minutes
      setTimeout(() => {
        this.setState({ circuitBreakerOpen: false });
      }, 300000);
    }
  };

  /**
   * Handles retry attempt
   */
  private handleRetry = () => {
    const { retryAttempts = 3, retryDelay = 1000, onRecovery, id } = this.props;
    const { retryCount, circuitBreakerOpen } = this.state;

    if (circuitBreakerOpen || retryCount >= retryAttempts) {
      return;
    }

    this.setState({ isRetrying: true });

    if (onRecovery) {
      onRecovery(id, ErrorRecoveryStrategy.RETRY);
    }

    // Delay retry
    this.retryTimer = setTimeout(
      () => {
        this.setState((prevState) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          isRetrying: false,
          retryCount: prevState.retryCount + 1,
        }));
      },
      retryDelay * Math.pow(2, retryCount)
    ); // Exponential backoff
  };

  /**
   * Handles boundary reset
   */
  private handleReset = () => {
    const { onRecovery, id } = this.props;

    if (onRecovery) {
      onRecovery(id, ErrorRecoveryStrategy.RESET);
    }

    this.reset();
  };

  /**
   * Handles error ignore
   */
  private handleIgnore = () => {
    const { onRecovery, id } = this.props;

    if (onRecovery) {
      onRecovery(id, ErrorRecoveryStrategy.IGNORE);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  /**
   * Resets boundary state
   */
  private reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      circuitBreakerOpen: false,
    });
  };

  /**
   * Gets available recovery strategies
   */
  private getRecoveryStrategies = (): ErrorRecoveryStrategy[] => {
    const { retry = true } = this.props;
    const { circuitBreakerOpen, retryCount } = this.state;
    const strategies: ErrorRecoveryStrategy[] = [ErrorRecoveryStrategy.FALLBACK];

    if (retry && !circuitBreakerOpen && retryCount < 3) {
      strategies.push(ErrorRecoveryStrategy.RETRY);
    }

    strategies.push(ErrorRecoveryStrategy.RESET);
    strategies.push(ErrorRecoveryStrategy.IGNORE);

    return strategies;
  };

  render() {
    const { hasError, error, errorInfo, retryCount, circuitBreakerOpen } = this.state;
    const { children, fallback, devFallback, id } = this.props;

    if (!hasError || !error || !errorInfo) {
      return children;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    const FallbackComponent = isDevelopment
      ? devFallback || DefaultDevelopmentFallback
      : fallback || DefaultProductionFallback;

    return (
      <FallbackComponent
        error={error}
        errorInfo={errorInfo}
        boundaryId={id}
        retryCount={retryCount}
        onRetry={this.handleRetry}
        onReset={this.handleReset}
        onIgnore={this.handleIgnore}
        recoveryStrategies={this.getRecoveryStrategies()}
        isDevelopment={isDevelopment}
        circuitBreakerOpen={circuitBreakerOpen}
      />
    );
  }
}

/**
 * Error boundary provider for context
 */
export interface ErrorBoundaryProviderProps {
  children: ReactNode;
  config?: Partial<ErrorBoundaryConfig>;
  globalErrorHandler?: (error: Error, errorInfo: ErrorInfo, boundaryId: string) => void;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({
  children,
  config = {},
  globalErrorHandler,
}) => {
  const defaultConfig: ErrorBoundaryConfig = {
    id: 'root',
    retry: true,
    retryAttempts: 3,
    retryDelay: 1000,
    maxErrorRate: 5,
    errorRateWindow: 60000,
    onError: globalErrorHandler,
    ...config,
  };

  return <ErrorBoundary {...defaultConfig}>{children}</ErrorBoundary>;
};
