'use client';

import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';

import { safeLocalStorage, safeNavigator, safeWindow } from '@/lib/utils/ssr-safe';

import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: (Error & { digest?: string }) | undefined;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error as Error & { digest?: string } };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Log error to monitoring service in production
    const window = safeWindow();
    const navigator = safeNavigator();
    const localStorage = safeLocalStorage();

    if (window && navigator && localStorage) {
      // Store error in localStorage for debugging
      try {
        const errorLog = {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        };

        const existingLogs = JSON.parse(localStorage.getItem('error-logs') || '[]');
        existingLogs.push(errorLog);

        // Keep only last 10 errors
        if (existingLogs.length > 10) {
          existingLogs.splice(0, existingLogs.length - 10);
        }

        localStorage.setItem('error-logs', JSON.stringify(existingLogs));
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      if (process.env.NODE_ENV === 'production') {
        // Add your error logging service here
        // e.g., Sentry.captureException(error);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleClearData = () => {
    const localStorage = safeLocalStorage();
    const window = safeWindow();

    try {
      // Clear potentially corrupted data
      if (localStorage) {
        localStorage.removeItem('habit-store');
        localStorage.removeItem('error-logs');
      }
      if (window) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      if (window) {
        window.location.reload();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-red-600"
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
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {process.env.NODE_ENV === 'development'
                ? this.state.error?.message
                : 'An unexpected error occurred. Please try again.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error?.digest && (
              <p className="text-xs text-gray-500 mb-4">Error ID: {this.state.error.digest}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={this.handleReset} variant="outline">
                Try again
              </Button>
              <Button onClick={this.handleClearData} variant="ghost" size="sm">
                Clear Data & Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
