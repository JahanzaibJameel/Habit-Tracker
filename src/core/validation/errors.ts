/**
 * Custom error classes for validation system
 * Provides detailed error context and recovery strategies
 * 
 * @fileoverview Validation error handling with detailed context
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { ZodError } from 'zod';

/**
 * Base validation error with enhanced context
 */
export class ValidationError extends Error {
  public readonly code: string;
  public readonly path: string[];
  public readonly expected: string;
  public readonly received: unknown;
  public readonly schema: string;
  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;

  constructor(options: {
    message: string;
    code: string;
    path: string[];
    expected: string;
    received: unknown;
    schema: string;
    context?: Record<string, unknown>;
  }) {
    super(options.message);
    this.name = 'ValidationError';
    this.code = options.code;
    this.path = options.path;
    this.expected = options.expected;
    this.received = options.received;
    this.schema = options.schema;
    this.timestamp = new Date();
    this.context = options.context ?? {};

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Converts error to JSON for logging/monitoring
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      path: this.path,
      expected: this.expected,
      received: this.received,
      schema: this.schema,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Creates a user-friendly error message
   */
  toUserMessage(): string {
    if (this.path.length > 0) {
      const field = this.path.join('.');
      return `Invalid value for "${field}": ${this.message}`;
    }
    return this.message;
  }
}

/**
 * Network validation error for failed fetch operations
 */
export class NetworkValidationError extends ValidationError {
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly url: string;
  public readonly requestId?: string;

  constructor(options: {
    message: string;
    url: string;
    status?: number;
    statusText?: string;
    requestId?: string;
    path?: string[];
    context?: Record<string, unknown>;
  }) {
    super({
      message: options.message,
      code: 'NETWORK_VALIDATION_ERROR',
      path: options.path || [],
      expected: 'Valid HTTP response',
      received: `HTTP ${options.status || 'unknown'} ${options.statusText || 'unknown'}`,
      schema: 'HTTP Response',
      context: {
        ...options.context,
        url: options.url,
        status: options.status,
        statusText: options.statusText,
        requestId: options.requestId,
      },
    });

    this.name = 'NetworkValidationError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.url = options.url;
    this.requestId = options.requestId;
  }
}

/**
 * Schema version mismatch error
 */
export class SchemaVersionError extends ValidationError {
  public readonly currentVersion: number;
  public readonly expectedVersion: number;
  public readonly migrationPath: number[];

  constructor(options: {
    schema: string;
    currentVersion: number;
    expectedVersion: number;
    migrationPath?: number[];
    data?: unknown;
  }) {
    super({
      message: `Schema version mismatch for ${options.schema}: expected v${options.expectedVersion}, got v${options.currentVersion}`,
      code: 'SCHEMA_VERSION_MISMATCH',
      path: ['_version'],
      expected: `v${options.expectedVersion}`,
      received: `v${options.currentVersion}`,
      schema: options.schema,
      context: {
        currentVersion: options.currentVersion,
        expectedVersion: options.expectedVersion,
        migrationPath: options.migrationPath || [],
        data: options.data,
      },
    });

    this.name = 'SchemaVersionError';
    this.currentVersion = options.currentVersion;
    this.expectedVersion = options.expectedVersion;
    this.migrationPath = options.migrationPath || [];
  }
}

/**
 * Validation timeout error
 */
export class ValidationTimeoutError extends ValidationError {
  public readonly timeout: number;
  public readonly operation: string;

  constructor(options: {
    operation: string;
    timeout: number;
    schema?: string;
    context?: Record<string, unknown>;
  }) {
    super({
      message: `Validation operation "${options.operation}" timed out after ${options.timeout}ms`,
      code: 'VALIDATION_TIMEOUT',
      path: [],
      expected: `Completion within ${options.timeout}ms`,
      received: 'Timeout',
      schema: options.schema || 'Unknown',
      context: options.context,
    });

    this.name = 'ValidationTimeoutError';
    this.timeout = options.timeout;
    this.operation = options.operation;
  }
}

/**
 * Utility functions for error creation and handling
 */
export class ValidationErrorFactory {
  /**
   * Creates a ValidationError from a ZodError
   */
  static fromZodError(zodError: ZodError, schema: string): ValidationError {
    const firstIssue = zodError.issues[0];
    
    if (!firstIssue) {
      return new ValidationError({
        message: 'Unknown validation error',
        code: 'ZOD_VALIDATION_ERROR',
        path: [],
        expected: 'Valid data',
        received: 'Invalid data',
        schema,
        context: {
          issues: zodError.issues,
          zodError: true,
        },
      });
    }
    
    return new ValidationError({
      message: firstIssue.message,
      code: 'ZOD_VALIDATION_ERROR',
      path: firstIssue.path.map(String),
      expected: 'Valid data',
      received: 'Invalid data',
      schema,
      context: {
        issues: zodError.issues,
        zodError: true,
      },
    });
  }

  /**
   * Creates a network validation error
   */
  static network(options: {
    message: string;
    url: string;
    status?: number;
    statusText?: string;
    requestId?: string;
    path?: string[];
  }): NetworkValidationError {
    return new NetworkValidationError(options);
  }

  /**
   * Creates a schema version error
   */
  static versionMismatch(options: {
    schema: string;
    currentVersion: number;
    expectedVersion: number;
    migrationPath?: number[];
    data?: unknown;
  }): SchemaVersionError {
    return new SchemaVersionError(options);
  }

  /**
   * Creates a timeout error
   */
  static timeout(options: {
    operation: string;
    timeout: number;
    schema?: string;
    context?: Record<string, unknown>;
  }): ValidationTimeoutError {
    return new ValidationTimeoutError(options);
  }
}

/**
 * Error recovery strategies
 */
export enum ErrorRecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  RESET = 'reset',
  ABORT = 'abort',
}

/**
 * Error recovery context
 */
export interface ErrorRecoveryContext {
  strategy: ErrorRecoveryStrategy;
  maxRetries?: number;
  currentRetry?: number;
  fallbackValue?: unknown;
  resetKeys?: string[];
  timeout?: number;
}

/**
 * Enhanced error with recovery information
 */
export class RecoverableValidationError extends ValidationError {
  public readonly recovery: ErrorRecoveryContext;

  constructor(
    baseError: ValidationError,
    recovery: ErrorRecoveryContext
  ) {
    super({
      message: baseError.message,
      code: baseError.code,
      path: baseError.path,
      expected: baseError.expected,
      received: baseError.received,
      schema: baseError.schema,
      context: {
        ...baseError.context,
        recovery,
      },
    });

    this.name = 'RecoverableValidationError';
    this.recovery = recovery;
  }

  /**
   * Determines if the error can be retried
   */
  canRetry(): boolean {
    return this.recovery.strategy === ErrorRecoveryStrategy.RETRY &&
           (!this.recovery.maxRetries || (this.recovery.currentRetry || 0) < this.recovery.maxRetries);
  }

  /**
   * Creates the next retry attempt
   */
  createRetry(): RecoverableValidationError {
    if (!this.canRetry()) {
      throw new Error('Cannot retry: max retries exceeded or retry not allowed');
    }

    return new RecoverableValidationError(this, {
      ...this.recovery,
      currentRetry: (this.recovery.currentRetry || 0) + 1,
    });
  }
}
