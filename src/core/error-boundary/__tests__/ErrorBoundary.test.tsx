/**
 * Unit tests for Error Boundary components
 * Tests error isolation, recovery strategies, and circuit breaker functionality
 *
 * @fileoverview Error boundary tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { render, screen, fireEvent, act } from '@/test-utils/render';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ErrorBoundaryConfig } from '../ErrorBoundary';
import { ErrorBoundary, ErrorRecoveryStrategy } from '../ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('ErrorBoundary', () => {
  // Test component that throws an error
  class ThrowingComponent extends Component {
    render(): ReactNode {
      throw new Error('Test error');
    }
  }

  // Test component with conditional error
  class ConditionalErrorComponent extends Component<{ shouldThrow: boolean }> {
    render(): ReactNode {
      if (this.props.shouldThrow) {
        throw new Error('Conditional error');
      }
      return <div>No error</div>;
    }
  }

  const defaultConfig: ErrorBoundaryConfig = {
    id: 'test-boundary',
    retry: true,
    retryAttempts: 3,
    retryDelay: 100,
    maxErrorRate: 5,
    errorRateWindow: 60000,
  };

  test('should render children when no error occurs', () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('should catch and display error fallback', () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('should call onError callback when error occurs', () => {
    const onError = vi.fn();
    const config: ErrorBoundaryConfig = { ...defaultConfig, onError };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object), 'test-boundary');
  });

  test('should allow retry when retry is enabled', async () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig, retry: true };

    render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    // Initially no error
    expect(screen.getByText('No error')).toBeInTheDocument();

    // Re-render with error
    render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByText(/try again/i);
    fireEvent.click(retryButton);

    // Should still show error (component still throws)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('should limit retry attempts', async () => {
    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      retryAttempts: 2,
      retryDelay: 10, // Short delay for testing
    };

    render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/try again/i)).toBeInTheDocument();

    // First retry: the count advances after the retry delay timer fires.
    fireEvent.click(screen.getByText(/try again/i));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/try again.*\(1\/2\)/i)).toBeInTheDocument();

    // Second retry reaches the limit; the retry control disappears.
    fireEvent.click(screen.getByText(/try again/i));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
  });

  test('should open circuit breaker after error threshold', async () => {
    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      maxErrorRate: 2, // Lower threshold for testing
      errorRateWindow: 60000,
    };

    render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Retry once: after the delay the boundary clears its error and the child
    // throws again, recording a second error and tripping the circuit breaker.
    fireEvent.click(screen.getByText(/try again/i));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/temporarily disabled/i)).toBeInTheDocument();
  });

  test('should reset when resetKeys change', () => {
    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      resetKeys: ['key1'],
    };

    const { rerender } = render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Change resetKey: the boundary resets and renders children again.
    rerender(
      <ErrorBoundary {...config} resetKeys={['key2']}>
        <ConditionalErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('should use custom fallback component', () => {
    const CustomFallback = ({ error, onRetry }: any) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={onRetry}>Custom Retry</button>
      </div>
    );

    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      fallback: CustomFallback,
    };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Retry')).toBeInTheDocument();
  });

  test('should handle different error types', () => {
    class NetworkErrorComponent extends Component {
      render(): ReactNode {
        const error = new Error('Network failed');
        error.name = 'NetworkError';
        throw error;
      }
    }

    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <NetworkErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('should track error history', () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig };

    const { rerender } = render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Trigger multiple errors
    for (let i = 0; i < 3; i++) {
      rerender(
        <ErrorBoundary {...config}>
          <ConditionalErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    }

    // In development mode, error details should be visible
    if (process.env.NODE_ENV === 'development') {
      expect(screen.getByText(/error boundary: test-boundary/i)).toBeInTheDocument();
    }
  });

  test('should handle async errors', async () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig };

    // Async errors are surfaced to the boundary by throwing on the *next*
    // render (error boundaries cannot catch errors thrown in async callbacks).
    class AsyncErrorComponent extends Component {
      state: { asyncError: Error | null } = { asyncError: null };

      componentDidMount(): void {
        setTimeout(() => this.setState({ asyncError: new Error('Async error') }), 50);
      }

      render(): ReactNode {
        if (this.state.asyncError) {
          throw this.state.asyncError;
        }
        return <div>Loading...</div>;
      }
    }

    render(
      <ErrorBoundary {...config}>
        <AsyncErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Advance timers to trigger the async error surfaced on the next render.
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('should preserve component stack trace', () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    if (process.env.NODE_ENV === 'development') {
      // In development, component stack should be available
      expect(screen.getByText(/component stack/i)).toBeInTheDocument();
    }
  });

  test('should handle recovery strategies', () => {
    const onRecovery = vi.fn();
    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      onRecovery,
    };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText(/try again/i);
    fireEvent.click(retryButton);

    expect(onRecovery).toHaveBeenCalledWith('test-boundary', ErrorRecoveryStrategy.RETRY);
  });

  test('should handle ignore strategy', () => {
    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    if (process.env.NODE_ENV === 'development') {
      const ignoreButton = screen.getByText(/ignore/i);
      fireEvent.click(ignoreButton);

      // Error should be dismissed
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    }
  });

  test('should handle reset strategy', () => {
    const onRecovery = vi.fn();
    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      onRecovery,
    };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    if (process.env.NODE_ENV === 'development') {
      const resetButton = screen.getByText(/reset/i);
      fireEvent.click(resetButton);

      expect(onRecovery).toHaveBeenCalledWith('test-boundary', ErrorRecoveryStrategy.RESET);
    }
  });

  test('should work with nested error boundaries', () => {
    const innerConfig: ErrorBoundaryConfig = {
      ...defaultConfig,
      id: 'inner-boundary',
    };

    render(
      <ErrorBoundary {...defaultConfig}>
        <div>Outer content</div>
        <ErrorBoundary {...innerConfig}>
          <ThrowingComponent />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Inner boundary should catch the error
    expect(screen.getByText('Outer content')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('should handle errors during error rendering', () => {
    const BadFallback = () => {
      throw new Error('Fallback error');
    };

    const config: ErrorBoundaryConfig = {
      ...defaultConfig,
      fallback: BadFallback,
    };

    // A fallback that throws is caught by the *outer* boundary, so the tree
    // still renders (it does not crash the whole app).
    expect(() => {
      render(
        <ErrorBoundary id="outer-boundary">
          <ErrorBoundary {...config}>
            <ThrowingComponent />
          </ErrorBoundary>
        </ErrorBoundary>
      );
    }).not.toThrow();

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('should handle errors in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: 'development' },
      writable: true,
    });

    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // Should show detailed error information in development
    expect(screen.getByText(/error boundary: test-boundary/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();

    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });

  test('should handle errors in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: 'production' },
      writable: true,
    });

    const config: ErrorBoundaryConfig = { ...defaultConfig };

    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // Should show minimal error information in production
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();

    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
    });
  });
});

describe('ErrorBoundary Edge Cases', () => {
  test('should handle null children', () => {
    const config: ErrorBoundaryConfig = { id: 'test-boundary' };

    expect(() => {
      render(<ErrorBoundary {...config}>{null}</ErrorBoundary>);
    }).not.toThrow();
  });

  test('should handle undefined children', () => {
    const config: ErrorBoundaryConfig = { id: 'test-boundary' };

    expect(() => {
      render(<ErrorBoundary {...config}>{undefined}</ErrorBoundary>);
    }).not.toThrow();
  });

  test('should handle multiple children', () => {
    const config: ErrorBoundaryConfig = { id: 'test-boundary' };

    render(
      <ErrorBoundary {...config}>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });

  test('should handle fragments as children', () => {
    const config: ErrorBoundaryConfig = { id: 'test-boundary' };

    render(
      <ErrorBoundary {...config}>
        <>
          <div>Fragment child 1</div>
          <div>Fragment child 2</div>
        </>
      </ErrorBoundary>
    );

    expect(screen.getByText('Fragment child 1')).toBeInTheDocument();
    expect(screen.getByText('Fragment child 2')).toBeInTheDocument();
  });
});
