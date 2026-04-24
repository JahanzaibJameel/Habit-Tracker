'use client';

import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';

import { Button } from './Button';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.featureName}:`, error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error logging service here
      // e.g., Sentry.captureException(error, { tags: { feature: this.props.featureName } });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false } as State);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">{this.props.featureName} Error</h3>
              <p className="mt-1 text-sm text-red-700">
                {process.env.NODE_ENV === 'development'
                  ? this.state.error?.message
                  : `The ${this.props.featureName} feature encountered an error. Please try again.`}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useFeatureErrorBoundary(featureName: string) {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback(
    (error: Error) => {
      console.error(`Error in ${featureName}:`, error);
      setError(error);

      if (process.env.NODE_ENV === 'production') {
        // Add your error logging service here
        // e.g., Sentry.captureException(error, { tags: { feature } });
      }
    },
    [featureName]
  );

  return { error, resetError, captureError };
}
