/**
 * Circuit Breaker utility for preventing infinite render loops
 * Tracks failures and opens circuits after threshold is exceeded
 * 
 * @fileoverview Circuit breaker implementation for error isolation
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React from 'react';

/**
 * Circuit breaker states
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit
   */
  failureThreshold: number;
  
  /**
   * Time in milliseconds to wait before attempting to close the circuit
   */
  recoveryTimeout: number;
  
  /**
   * Time in milliseconds to monitor for success rate in half-open state
   */
  monitoringPeriod: number;
  
  /**
   * Minimum success rate required to close the circuit (0-1)
   */
  successThreshold: number;
  
  /**
   * Maximum number of attempts in half-open state
   */
  maxHalfOpenAttempts: number;
  
  /**
   * Whether to automatically reset on successful operations
   */
  autoReset: boolean;
  
  /**
   * Callback when circuit state changes
   */
  onStateChange?: (from: CircuitState, to: CircuitState, context: CircuitBreakerContext) => void;
  
  /**
   * Callback when circuit opens
   */
  onCircuitOpen?: (context: CircuitBreakerContext) => void;
  
  /**
   * Callback when circuit closes
   */
  onCircuitClose?: (context: CircuitBreakerContext) => void;
}

/**
 * Circuit breaker context information
 */
export interface CircuitBreakerContext {
  /**
   * Unique identifier for this circuit breaker
   */
  id: string;
  
  /**
   * Current state of the circuit
   */
  state: CircuitState;
  
  /**
   * Number of failures recorded
   */
  failureCount: number;
  
  /**
   * Number of successful operations
   */
  successCount: number;
  
  /**
   * Total number of operations
   */
  totalOperations: number;
  
  /**
   * Timestamp when circuit was opened
   */
  openedAt?: number;
  
  /**
   * Timestamp of last operation
   */
  lastOperationAt: number;
  
  /**
   * Timestamp when circuit will attempt recovery
   */
  nextAttemptAt?: number;
  
  /**
   * Number of attempts in half-open state
   */
  halfOpenAttempts: number;
  
  /**
   * Average operation duration
   */
  averageOperationTime: number;
  
  /**
   * Last error that occurred
   */
  lastError?: Error;
}

/**
 * Circuit breaker operation result
 */
export interface CircuitBreakerResult<T> {
  /**
   * Whether the operation was allowed to proceed
   */
  allowed: boolean;
  
  /**
   * The result of the operation if successful
   */
  result?: T;
  
  /**
   * Error that occurred during operation
   */
  error?: Error;
  
  /**
   * Current circuit state
   */
  state: CircuitState;
  
  /**
   * Whether the circuit was tripped by this operation
   */
  tripped?: boolean;
  
  /**
   * Operation duration in milliseconds
   */
  duration: number;
}

/**
 * Advanced Circuit Breaker implementation
 * 
 * @example
 * const circuitBreaker = new CircuitBreaker('user-api', {
 *   failureThreshold: 5,
 *   recoveryTimeout: 60000,
 *   successThreshold: 0.5,
 * });
 * 
 * const result = await circuitBreaker.execute(async () => {
 *   return await fetchUserData();
 * });
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private context: CircuitBreakerContext;
  private operationTimes: number[] = [];
  private halfOpenResults: boolean[] = [];

  constructor(id: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 30000, // 30 seconds
      successThreshold: 0.5, // 50% success rate
      maxHalfOpenAttempts: 3,
      autoReset: true,
      ...config,
    };

    this.context = {
      id,
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      totalOperations: 0,
      lastOperationAt: Date.now(),
      halfOpenAttempts: 0,
      averageOperationTime: 0,
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.context.state;
  }

  /**
   * Get circuit context information
   */
  getContext(): CircuitBreakerContext {
    this.checkStateTransition();
    return { ...this.context };
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();
    
    // Check if operation is allowed
    if (!this.isOperationAllowed()) {
      const duration = Date.now() - startTime;
      return {
        allowed: false,
        state: this.context.state,
        duration,
      };
    }

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.recordSuccess(duration);
      
      return {
        allowed: true,
        result,
        state: this.context.state,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.recordFailure(err, duration);
      
      return {
        allowed: true,
        error: err,
        state: this.context.state,
        tripped: this.context.state === 'OPEN',
        duration,
      };
    }
  }

  /**
   * Execute a synchronous operation through the circuit breaker
   */
  executeSync<T>(operation: () => T): CircuitBreakerResult<T> {
    const startTime = Date.now();
    
    if (!this.isOperationAllowed()) {
      const duration = Date.now() - startTime;
      return {
        allowed: false,
        state: this.context.state,
        duration,
      };
    }

    try {
      const result = operation();
      const duration = Date.now() - startTime;
      
      this.recordSuccess(duration);
      
      return {
        allowed: true,
        result,
        state: this.context.state,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.recordFailure(err, duration);
      
      return {
        allowed: true,
        error: err,
        state: this.context.state,
        tripped: this.context.state === 'OPEN',
        duration,
      };
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    const previousState = this.context.state;
    
    const newContext: CircuitBreakerContext = {
      ...this.context,
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      totalOperations: 0,
      halfOpenAttempts: 0,
      id: this.context.id,
      lastOperationAt: this.context.lastOperationAt,
      averageOperationTime: this.context.averageOperationTime,
    };
    
    // Only include optional properties if they should be undefined
    if (this.context.openedAt !== undefined) {
      delete newContext.openedAt;
    }
    
    if (this.context.nextAttemptAt !== undefined) {
      delete newContext.nextAttemptAt;
    }
    
    if (this.context.lastError !== undefined) {
      delete newContext.lastError;
    }
    
    this.context = newContext;

    this.operationTimes = [];
    this.halfOpenResults = [];

    if (previousState !== 'CLOSED') {
      this.config.onStateChange?.(previousState, 'CLOSED', this.context);
      this.config.onCircuitClose?.(this.context);
    }
  }

  /**
   * Manually open the circuit
   */
  open(reason?: string): void {
    if (this.context.state === 'OPEN') return;

    const previousState = this.context.state;
    const now = Date.now();
    
    this.context.state = 'OPEN';
    this.context.openedAt = now;
    this.context.nextAttemptAt = now + this.config.recoveryTimeout;
    if (reason) {
      this.context.lastError = new Error(reason);
    }

    this.config.onStateChange?.(previousState, 'OPEN', this.context);
    this.config.onCircuitOpen?.(this.context);
  }

  /**
   * Check if operation is allowed based on current state
   */
  private isOperationAllowed(): boolean {
    this.checkStateTransition();

    switch (this.context.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        return false;
      
      case 'HALF_OPEN':
        return this.context.halfOpenAttempts < this.config.maxHalfOpenAttempts;
      
      default:
        return false;
    }
  }

  /**
   * Check if state transition should occur
   */
  private checkStateTransition(): void {
    const now = Date.now();
    const previousState = this.context.state;

    switch (this.context.state) {
      case 'OPEN':
        if (this.context.nextAttemptAt && now >= this.context.nextAttemptAt) {
          this.transitionToHalfOpen();
        }
        break;
      
      case 'HALF_OPEN':
        if (this.context.halfOpenAttempts >= this.config.maxHalfOpenAttempts) {
          // Check if we have enough data to make a decision
          if (this.halfOpenResults.length > 0) {
            const successRate = this.halfOpenResults.filter(Boolean).length / this.halfOpenResults.length;
            if (successRate >= this.config.successThreshold) {
              this.transitionToClosed();
            } else {
              this.transitionToOpen();
            }
          }
        }
        break;
    }

    if (previousState !== this.context.state) {
      this.config.onStateChange?.(previousState, this.context.state, this.context);
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(duration: number): void {
    this.context.totalOperations++;
    this.context.successCount++;
    this.context.lastOperationAt = Date.now();
    
    this.updateOperationTime(duration);

    switch (this.context.state) {
      case 'CLOSED':
        // Reset failure count on success if auto-reset is enabled
        if (this.config.autoReset) {
          this.context.failureCount = 0;
        }
        break;
      
      case 'HALF_OPEN':
        this.halfOpenResults.push(true);
        this.context.halfOpenAttempts++;
        
        // Check if we should close the circuit immediately
        if (this.halfOpenResults.length >= this.config.maxHalfOpenAttempts) {
          const successRate = this.halfOpenResults.filter(Boolean).length / this.halfOpenResults.length;
          if (successRate >= this.config.successThreshold) {
            this.transitionToClosed();
          }
        }
        break;
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(error: Error, duration: number): void {
    this.context.totalOperations++;
    this.context.failureCount++;
    this.context.lastOperationAt = Date.now();
    this.context.lastError = error;
    
    this.updateOperationTime(duration);

    switch (this.context.state) {
      case 'CLOSED':
        if (this.context.failureCount >= this.config.failureThreshold) {
          this.transitionToOpen();
        }
        break;
      
      case 'HALF_OPEN':
        this.halfOpenResults.push(false);
        this.context.halfOpenAttempts++;
        
        // Any failure in half-open state should open the circuit
        this.transitionToOpen();
        break;
    }
  }

  /**
   * Update operation time statistics
   */
  private updateOperationTime(duration: number): void {
    this.operationTimes.push(duration);
    
    // Keep only the last 100 operation times
    if (this.operationTimes.length > 100) {
      this.operationTimes.shift();
    }
    
    // Calculate average
    if (this.operationTimes.length > 0) {
      this.context.averageOperationTime = 
        this.operationTimes.reduce((sum, time) => sum + time, 0) / this.operationTimes.length;
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    if (this.context.state === 'OPEN') return;

    const previousState = this.context.state;
    const now = Date.now();
    
    this.context.state = 'OPEN';
    this.context.openedAt = now;
    this.context.nextAttemptAt = now + this.config.recoveryTimeout;
    this.halfOpenResults = [];

    this.config.onStateChange?.(previousState, 'OPEN', this.context);
    this.config.onCircuitOpen?.(this.context);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    if (this.context.state === 'HALF_OPEN') return;

    const previousState = this.context.state;
    
    this.context.state = 'HALF_OPEN';
    this.context.halfOpenAttempts = 0;
    this.halfOpenResults = [];

    this.config.onStateChange?.(previousState, 'HALF_OPEN', this.context);
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    if (this.context.state === 'CLOSED') return;

    const previousState = this.context.state;
    
    this.context.state = 'CLOSED';
    this.context.failureCount = 0;
    delete this.context.openedAt;
    delete this.context.nextAttemptAt;
    this.context.halfOpenAttempts = 0;
    this.halfOpenResults = [];

    this.config.onStateChange?.(previousState, 'CLOSED', this.context);
    this.config.onCircuitClose?.(this.context);
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      state: this.context.state,
      failureCount: this.context.failureCount,
      successCount: this.context.successCount,
      totalOperations: this.context.totalOperations,
      failureRate: this.context.totalOperations > 0 
        ? this.context.failureCount / this.context.totalOperations 
        : 0,
      successRate: this.context.totalOperations > 0 
        ? this.context.successCount / this.context.totalOperations 
        : 0,
      averageOperationTime: this.context.averageOperationTime,
      timeInCurrentState: this.context.openedAt 
        ? Date.now() - this.context.openedAt 
        : Date.now() - this.context.lastOperationAt,
      nextAttemptAt: this.context.nextAttemptAt,
    };
  }
}

/**
 * Circuit breaker factory for creating instances with default configurations
 */
export class CircuitBreakerFactory {
  private static instances = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker instance
   */
  static get(id: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.instances.has(id)) {
      this.instances.set(id, new CircuitBreaker(id, config));
    }
    return this.instances.get(id)!;
  }

  /**
   * Remove a circuit breaker instance
   */
  static remove(id: string): boolean {
    return this.instances.delete(id);
  }

  /**
   * Get all circuit breaker instances
   */
  static getAll(): Map<string, CircuitBreaker> {
    return new Map(this.instances);
  }

  /**
   * Reset all circuit breaker instances
   */
  static resetAll(): void {
    this.instances.forEach(instance => instance.reset());
  }

  /**
   * Get statistics for all circuit breakers
   */
  static getAllStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    
    this.instances.forEach((breaker, id) => {
      stats[id] = breaker.getStats();
    });
    
    return stats;
  }
}

/**
 * Higher-order function to wrap operations with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: any[]) => any>(
  operation: T,
  circuitBreakerId: string,
  config?: Partial<CircuitBreakerConfig>
): T {
  const circuitBreaker = CircuitBreakerFactory.get(circuitBreakerId, config);
  
  return (async (...args: Parameters<T>) => {
    const result = await circuitBreaker.execute(async () => {
      return operation(...args);
    });
    
    if (!result.allowed) {
      throw new Error(`Circuit breaker is ${result.state} for ${circuitBreakerId}`);
    }
    
    if (result.error) {
      throw result.error;
    }
    
    return result.result;
  }) as T;
}

/**
 * React hook for circuit breaker functionality
 */
export function useCircuitBreaker(
  id: string,
  config?: Partial<CircuitBreakerConfig>
) {
  const circuitBreaker = React.useMemo(
    () => CircuitBreakerFactory.get(id, config),
    [id, config]
  );

  const [state, setState] = React.useState(() => circuitBreaker.getState());
  const [stats, setStats] = React.useState(() => circuitBreaker.getStats());

  React.useEffect(() => {
    const interval = setInterval(() => {
      const newState = circuitBreaker.getState();
      const newStats = circuitBreaker.getStats();
      
      if (newState !== state || JSON.stringify(newStats) !== JSON.stringify(stats)) {
        setState(newState);
        setStats(newStats);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [circuitBreaker, state, stats]);

  const execute = React.useCallback(
    <T>(operation: () => Promise<T>) => circuitBreaker.execute(operation),
    [circuitBreaker]
  );

  const executeSync = React.useCallback(
    <T>(operation: () => T) => circuitBreaker.executeSync(operation),
    [circuitBreaker]
  );

  const reset = React.useCallback(() => circuitBreaker.reset(), [circuitBreaker]);
  const open = React.useCallback((reason?: string) => circuitBreaker.open(reason), [circuitBreaker]);

  return {
    state,
    stats,
    execute,
    executeSync,
    reset,
    open,
    context: circuitBreaker.getContext(),
  };
}
