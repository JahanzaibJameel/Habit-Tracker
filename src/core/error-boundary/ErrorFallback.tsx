/**
 * Error fallback components for different environments
 * Provides production and development specific error displays
 *
 * @fileoverview Error fallback components with recovery options
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import type { ComponentType } from 'react';
import React from 'react';

/**
 * Error fallback props
 */
export interface ErrorFallbackProps {
  /**
   * The error that occurred
   */
  error: Error;

  /**
   * Additional error information from React
   */
  errorInfo?: React.ErrorInfo;

  /**
   * Unique identifier for the boundary
   */
  boundaryId: string;

  /**
   * Function to attempt recovery
   */
  onRetry?: () => void;

  /**
   * Function to reset the boundary
   */
  onReset?: () => void;

  /**
   * Function to ignore the error
   */
  onIgnore?: () => void;

  /**
   * Recovery strategy to use
   */
  strategy?: ErrorRecoveryStrategy;

  /**
   * Component name that failed
   */
  componentName?: string;

  /**
   * Error severity level
   */
  severity?: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Number of retry attempts
   */
  retryCount?: number;

  /**
   * Available recovery strategies
   */
  recoveryStrategies?: string[];

  /**
   * Whether circuit breaker is open
   */
  circuitBreakerOpen?: boolean;

  /**
   * Whether this is in development mode
   */
  isDevelopment?: boolean;
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
 * Production fallback component - minimal and user-friendly
 *
 * @example
 * <ProductionFallback
 *   error={error}
 *   boundaryId="user-profile"
 *   onRetry={() => console.log('retry')}
 * />
 */
export const ProductionFallback: ComponentType<ErrorFallbackProps> = ({
  error,
  boundaryId,
  onRetry,
  onReset,
  strategy = 'retry',
  severity = 'medium',
}) => {
  const getErrorMessage = () => {
    switch (severity) {
      case 'low':
        return 'Something went wrong, but you can continue using the app.';
      case 'medium':
        return 'This feature is temporarily unavailable.';
      case 'high':
        return 'An error occurred. Please refresh the page.';
      case 'critical':
        return 'A critical error occurred. Please contact support.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  const getActionButton = () => {
    switch (strategy) {
      case 'retry':
        return (
          <button
            onClick={onRetry}
            className="error-fallback-button error-fallback-retry"
            aria-label="Retry operation"
          >
            Try Again
          </button>
        );
      case 'reset':
        return (
          <button
            onClick={onReset}
            className="error-fallback-button error-fallback-reset"
            aria-label="Reset component"
          >
            Reset
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="error-fallback error-fallback-production"
      role="alert"
      aria-live="polite"
      data-boundary-id={boundaryId}
      data-error-severity={severity}
      data-error-message={error.message}
    >
      <div className="error-fallback-content">
        <div className="error-fallback-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="error-fallback-message">
          <h3 className="error-fallback-title">Something went wrong</h3>
          <p className="error-fallback-description">{getErrorMessage()}</p>
        </div>

        {getActionButton() && <div className="error-fallback-actions">{getActionButton()}</div>}
      </div>
    </div>
  );
};

/**
 * Development fallback component - detailed debugging information
 *
 * @example
 * <DevFallback
 *   error={error}
 *   errorInfo={errorInfo}
 *   boundaryId="user-profile"
 *   componentName="UserProfile"
 *   onRetry={() => console.log('retry')}
 * />
 */
export const DevFallback: ComponentType<ErrorFallbackProps> = ({
  error,
  errorInfo,
  boundaryId,
  retryCount,
  onRetry,
  onReset,
  onIgnore,
  recoveryStrategies,
  isDevelopment,
  circuitBreakerOpen,
  componentName,
  severity,
  strategy,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copyErrorDetails = async () => {
    const details = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: errorInfo
        ? {
            componentStack: errorInfo.componentStack,
          }
        : undefined,
      boundaryId,
      componentName,
      severity,
      recoveryStrategies,
      isDevelopment,
      circuitBreakerOpen,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div
      className="error-fallback error-fallback-development"
      role="alert"
      aria-live="polite"
      data-boundary-id={boundaryId}
      data-component-name={componentName}
      data-error-severity={severity}
    >
      <div className="error-fallback-header">
        <div className="error-fallback-title-section">
          <h3 className="error-fallback-title">
            {componentName ? `${componentName} Error` : 'Component Error'}
          </h3>
          <span className="error-fallback-severity">{(severity || 'medium').toUpperCase()}</span>
        </div>

        <div className="error-fallback-actions">
          {strategy === 'retry' && onRetry && (
            <button
              onClick={onRetry}
              className="error-fallback-button error-fallback-retry"
              aria-label="Retry component"
            >
              Retry
            </button>
          )}
          {strategy === 'reset' && onReset && (
            <button
              onClick={onReset}
              className="error-fallback-button error-fallback-reset"
              aria-label="Reset component"
            >
              Reset
            </button>
          )}
          {strategy === 'ignore' && onIgnore && (
            <button
              onClick={onIgnore}
              className="error-fallback-button error-fallback-ignore"
              aria-label="Ignore error"
            >
              Ignore
            </button>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="error-fallback-button error-fallback-toggle"
            aria-expanded={showDetails}
            aria-controls="error-details"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={copyErrorDetails}
            className="error-fallback-button error-fallback-copy"
            aria-label="Copy error details"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="error-fallback-summary">
        <p className="error-fallback-message">
          <strong>{error.name}:</strong> {error.message}
        </p>
        {boundaryId && (
          <p className="error-fallback-boundary">
            Boundary: {boundaryId} {retryCount && `(Retry: ${retryCount})`}
          </p>
        )}
      </div>

      {showDetails && (
        <div id="error-details" className="error-fallback-details" aria-hidden={!showDetails}>
          <div className="error-fallback-section">
            <h4>Error Stack</h4>
            <pre className="error-fallback-stack">{error.stack || 'No stack trace available'}</pre>
          </div>

          {errorInfo?.componentStack && (
            <div className="error-fallback-section">
              <h4>Component Stack</h4>
              <pre className="error-fallback-stack">{errorInfo.componentStack}</pre>
            </div>
          )}

          <div className="error-fallback-section">
            <h4>Context</h4>
            <dl className="error-fallback-context">
              <dt>Boundary ID:</dt>
              <dd>{boundaryId || 'Unknown'}</dd>
              <dt>Component:</dt>
              <dd>{componentName || 'Unknown'}</dd>
              <dt>Severity:</dt>
              <dd>{severity}</dd>
              <dt>Timestamp:</dt>
              <dd>{new Date().toISOString()}</dd>
              <dt>URL:</dt>
              <dd>{window.location.href}</dd>
              <dt>User Agent:</dt>
              <dd className="error-fallback-user-agent">{navigator.userAgent}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Adaptive fallback that chooses between production and dev based on environment
 */
export const AdaptiveFallback: ComponentType<ErrorFallbackProps> = (props) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const FallbackComponent = isDevelopment ? DevFallback : ProductionFallback;

  return <FallbackComponent {...props} isDevelopment={isDevelopment} />;
};

/**
 * Minimal fallback for inline errors
 */
export const MinimalFallback: ComponentType<ErrorFallbackProps> = ({
  onRetry,
  strategy = 'retry',
}) => {
  return (
    <div className="error-fallback-minimal" role="alert" aria-live="polite">
      <span className="error-fallback-icon">!</span>
      <span className="error-fallback-text">Failed to load</span>
      {strategy === 'retry' && onRetry && (
        <button onClick={onRetry} className="error-fallback-minimal-button" aria-label="Retry">
          Retry
        </button>
      )}
    </div>
  );
};

/**
 * Fallback for async operations (loading states, promises, etc.)
 */
export const AsyncFallback: ComponentType<ErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <div className="error-fallback-async" role="alert" aria-live="polite">
      <div className="error-fallback-async-content">
        <div className="error-fallback-async-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="error-fallback-async-message">
          <p className="error-fallback-async-title">Operation failed</p>
          <p className="error-fallback-async-description">
            {error.message || 'An async operation failed to complete.'}
          </p>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="error-fallback-async-button"
            aria-label="Retry operation"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
