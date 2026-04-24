/**
 * Core retry mechanism logic - pure functions only, NO React hooks
 */

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
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

export class RetryMechanism {
  private static defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: (error) => {
      // Retry on network errors and 5xx server errors
      return (
        error.name === 'NetworkError' ||
        error.name === 'TimeoutError' ||
        (error.status >= 500 && error.status < 600) ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT'
      );
    },
  };

  static async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const fullConfig = { ...this.defaultConfig, ...config };
    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          attempts: attempt,
          totalDelay,
        };
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (attempt === fullConfig.maxAttempts || !fullConfig.retryableErrors?.(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          fullConfig.baseDelay * Math.pow(fullConfig.backoffFactor, attempt - 1),
          fullConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = delay * 0.1 * Math.random();
        const finalDelay = delay + jitter;

        totalDelay += finalDelay;

        // Call retry callback
        fullConfig.onRetry?.(attempt, error);

        // Wait before retry
        await this.sleep(finalDelay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: fullConfig.maxAttempts,
      totalDelay,
    };
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Circuit breaker pattern
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    config: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 30000,
    }
  ) {
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    let failures = 0;
    let lastFailureTime = 0;
    let successes = 0;

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset circuit breaker if enough time has passed
      if (state === 'OPEN' && now - lastFailureTime > config.resetTimeout) {
        state = 'HALF_OPEN';
        successes = 0;
      }

      // Reject if circuit is open
      if (state === 'OPEN') {
        throw new Error('Circuit breaker is OPEN');
      }

      try {
        const result = await operation();

        // Success in HALF_OPEN state closes the circuit
        if (state === 'HALF_OPEN') {
          successes++;
          if (successes >= 2) {
            state = 'CLOSED';
            failures = 0;
          }
        } else {
          // Reset failures on success in CLOSED state
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit if failure threshold reached
        if (failures >= config.failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  // Bulkhead pattern for limiting concurrent operations
  static createBulkhead<T>(operation: () => Promise<T>, maxConcurrent: number = 10) {
    let running = 0;
    const queue: Array<{
      resolve: (value: T) => void;
      reject: (error: any) => void;
    }> = [];

    return async (): Promise<T> => {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
        processQueue();
      });

      function processQueue() {
        if (running >= maxConcurrent || queue.length === 0) {
          return;
        }

        running++;
        const { resolve, reject } = queue.shift()!;

        operation()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            running--;
            processQueue();
          });
      }
    };
  }

  // Timeout wrapper
  static withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      }),
    ]);
  }

  // Fallback mechanism
  static withFallback<T>(operation: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    return operation().catch(async (error) => {
      console.warn('Primary operation failed, using fallback:', error);
      return fallback();
    });
  }
}

// API client with built-in retry mechanism
export class ResilientApiClient {
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...retryConfig,
    };
  }

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    return this.retryOperation(() => this.fetchJson<T>(url, { ...options, method: 'GET' }));
  }

  async post<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
    return this.retryOperation(() =>
      this.fetchJson<T>(url, {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : null,
      })
    );
  }

  async put<T>(url: string, data?: any, options?: RequestInit): Promise<T> {
    return this.retryOperation(() =>
      this.fetchJson<T>(url, {
        ...options,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : null,
      })
    );
  }

  async delete<T>(url: string, options?: RequestInit): Promise<T> {
    return this.retryOperation(() => this.fetchJson<T>(url, { ...options, method: 'DELETE' }));
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = await RetryMechanism.execute(operation, this.retryConfig);

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  }

  private async fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }
}

export const retryMechanism = RetryMechanism;
export default retryMechanism;
