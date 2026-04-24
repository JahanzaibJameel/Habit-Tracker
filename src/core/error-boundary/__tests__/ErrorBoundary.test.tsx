/**
 * Unit tests for Error Boundary components
 * Tests error isolation, recovery strategies, and circuit breaker functionality
 * 
 * @fileoverview Error boundary tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ErrorBoundary, ErrorBoundaryConfig, ErrorRecoveryStrategy } from '../ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
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

  // Test component that throws after delay
  class DelayedErrorComponent extends Component<{ delay: number }> {
    componentDidMount(): void {
      setTimeout(() => {
        throw new Error('Delayed error');
      }, this.props.delay);
    }

    render(): ReactNode {
      return <div>Loading...</div>;
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
    const onError = jest.fn();
    const config: ErrorBoundaryConfig = { ...defaultConfig, onError };
    
    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      'test-boundary'
    );
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
      retryDelay: 10 // Short delay for testing
    };
    
    render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText(/try again/i);

    // First retry
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.getByText(/try again.*\(1\/2\)/i)).toBeInTheDocument();
    });

    // Second retry
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.getByText(/try again.*\(2\/2\)/i)).toBeInTheDocument();
    });

    // Third attempt should not show retry button
    fireEvent.click(retryButton);
    await waitFor(() => {
      expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
    });
  });

  test('should open circuit breaker after error threshold', () => {
    const config: ErrorBoundaryConfig = { 
      ...defaultConfig, 
      maxErrorRate: 2, // Lower threshold for testing
      errorRateWindow: 1000 // Short window for testing
    };
    
    const { rerender } = render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Trigger multiple errors quickly
    for (let i = 0; i < 3; i++) {
      rerender(
        <ErrorBoundary {...config}>
          <ConditionalErrorComponent shouldThrow={true} />
        </ErrorBoundary>
      );
    }

    expect(screen.getByText(/temporarily disabled/i)).toBeInTheDocument();
  });

  test('should reset when resetKeys change', () => {
    const config: ErrorBoundaryConfig = { 
      ...defaultConfig, 
      resetKeys: ['key1']
    };
    
    const { rerender } = render(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={true} resetKeys={['key1']} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Change resetKey
    rerender(
      <ErrorBoundary {...config}>
        <ConditionalErrorComponent shouldThrow={false} resetKeys={['key2']} />
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
      fallback: CustomFallback
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
    
    render(
      <ErrorBoundary {...config}>
        <DelayedErrorComponent delay={50} />
      </ErrorBoundary>
    );

    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for async error
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    }, { timeout: 200 });
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
    const onRecovery = jest.fn();
    const config: ErrorBoundaryConfig = { 
      ...defaultConfig, 
      onRecovery
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
    const onRecovery = jest.fn();
    const config: ErrorBoundaryConfig = { 
      ...defaultConfig, 
      onRecovery
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
      id: 'inner-boundary'
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
      fallback: BadFallback
    };
    
    // Should not crash completely
    expect(() => {
      render(
        <ErrorBoundary {...config}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });

  test('should handle errors in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const config: ErrorBoundaryConfig = { ...defaultConfig };
    
    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // Should show detailed error information in development
    expect(screen.getByText(/error boundary: test-boundary/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('should handle errors in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const config: ErrorBoundaryConfig = { ...defaultConfig };
    
    render(
      <ErrorBoundary {...config}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // Should show minimal error information in production
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('ErrorBoundary Edge Cases', () => {
  test('should handle null children', () => {
    const config: ErrorBoundaryConfig = { id: 'test-boundary' };
    
    expect(() => {
      render(
        <ErrorBoundary {...config}>
          {null}
        </ErrorBoundary>
      );
    }).not.toThrow();
  });

  test('should handle undefined children', () => {
    const config: ErrorBoundaryConfig = { id: 'test-boundary' };
    
    expect(() => {
      render(
        <ErrorBoundary {...config}>
          {undefined}
        </ErrorBoundary>
      );
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
