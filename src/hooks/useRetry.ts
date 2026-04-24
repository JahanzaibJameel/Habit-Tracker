/**
 * React hooks for retry functionality
 * Moved from lib to proper hooks directory
 */

import { useCallback, useState } from 'react';

import type { RetryMechanism } from '../lib/core/retry-mechanism';
import { retryMechanism } from '../lib/core/retry-mechanism';

interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalDelay: number;
}

interface UseRetryResult<T> {
  loading: boolean;
  data?: T;
  error?: any;
  attempts: number;
  execute: () => Promise<RetryResult<T>>;
  reset: () => void;
}

export function useRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): UseRetryResult<T> {
  const [state, setState] = useState<{
    loading: boolean;
    data?: T;
    error?: any;
    attempts: number;
  }>({
    loading: false,
    attempts: 0,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    const result = await retryMechanism.execute(operation, config);

    setState({
      loading: false,
      ...(result.data !== undefined && { data: result.data }),
      ...(result.error !== undefined && { error: result.error }),
      attempts: result.attempts,
    });

    return result;
  }, [operation, config]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      attempts: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export function useRetryMechanism(): RetryMechanism {
  return retryMechanism;
}
