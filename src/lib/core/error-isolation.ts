/**
 * Advanced Error Isolation Tree System
 * Level 1: Component-level error boundary
 * Level 2: Feature-level isolation boundary
 * Level 3: Route-level fallback system
 * Level 4: Global application safety net
 */

import { safeLocalStorage } from '../utils/ssr-safe';

// Error classification system
export enum ErrorLevel {
  COMPONENT = 'component',
  FEATURE = 'feature',
  ROUTE = 'route',
  GLOBAL = 'global',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  RENDER = 'render',
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  PERFORMANCE = 'performance',
  MEMORY = 'memory',
  UNKNOWN = 'unknown',
}

export interface ClassifiedError {
  id: string;
  level: ErrorLevel;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  retryCount: number;
  maxRetries: number;
  context: Record<string, any>;
  recoverable: boolean;
}

export interface ErrorBoundaryConfig {
  level: ErrorLevel;
  maxRetries: number;
  retryDelay: number;
  fallbackComponent?: any;
  onError?: (error: ClassifiedError) => void;
  onRecovery?: () => void;
  enableRetry: boolean;
  enableFallback: boolean;
  isolateErrors: boolean;
}

// Error classifier
export class ErrorClassifier {
  static classify(error: Error, context: any = {}): ClassifiedError {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Determine category based on error message and context
    let category = ErrorCategory.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let recoverable = true;

    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('axios')) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
      recoverable = true;
    } else if (
      message.includes('storage') ||
      message.includes('localstorage') ||
      message.includes('quota')
    ) {
      category = ErrorCategory.STORAGE;
      severity = ErrorSeverity.HIGH;
      recoverable = false;
    } else if (message.includes('validation') || message.includes('schema')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.MEDIUM;
      recoverable = true;
    } else if (
      message.includes('memory') ||
      message.includes('heap') ||
      message.includes('out of memory')
    ) {
      category = ErrorCategory.MEMORY;
      severity = ErrorSeverity.CRITICAL;
      recoverable = false;
    } else if (message.includes('timeout') || message.includes('performance')) {
      category = ErrorCategory.PERFORMANCE;
      severity = ErrorSeverity.MEDIUM;
      recoverable = true;
    } else if (message.includes('render') || message.includes('react')) {
      category = ErrorCategory.RENDER;
      severity = ErrorSeverity.HIGH;
      recoverable = true;
    }

    // Adjust severity based on context
    if (context.isCritical) {
      severity = ErrorSeverity.CRITICAL;
    } else if (context.isLowImpact) {
      severity = ErrorSeverity.LOW;
    }

    const result: any = {
      id: errorId,
      level: ErrorLevel.COMPONENT, // Default, can be overridden
      severity,
      category,
      message: error.message,
      timestamp,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      retryCount: 0,
      maxRetries: 3,
      context,
      recoverable,
    };

    if (error.stack) {
      result.stack = error.stack;
    }

    return result;
  }
}

// Error isolation manager
export class ErrorIsolationManager {
  private static instance: ErrorIsolationManager;
  private errorHistory: ClassifiedError[] = [];
  private errorStats: Map<ErrorCategory, number> = new Map();
  private maxHistorySize = 100;

  static getInstance(): ErrorIsolationManager {
    if (!ErrorIsolationManager.instance) {
      ErrorIsolationManager.instance = new ErrorIsolationManager();
    }
    return ErrorIsolationManager.instance;
  }

  logError(error: ClassifiedError): void {
    // Add to history
    this.errorHistory.push(error);

    // Update stats
    const currentCount = this.errorStats.get(error.category) || 0;
    this.errorStats.set(error.category, currentCount + 1);

    // Trim history if needed
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.splice(0, this.errorHistory.length - this.maxHistorySize);
    }

    // Persist to localStorage
    this.persistErrorLog(error);
  }

  private persistErrorLog(error: ClassifiedError): void {
    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const errorLogs = JSON.parse(storage.getItem('error-isolation-logs') || '[]');
      errorLogs.push(error);

      // Keep only last 50 errors in storage
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }

      storage.setItem('error-isolation-logs', JSON.stringify(errorLogs));
    } catch (logError) {
      console.error('Failed to persist error log:', logError);
    }
  }

  getErrorHistory(): ClassifiedError[] {
    return [...this.errorHistory];
  }

  getErrorStats(): Record<ErrorCategory, number> {
    const stats: Record<ErrorCategory, number> = {
      [ErrorCategory.RENDER]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.STORAGE]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.PERFORMANCE]: 0,
      [ErrorCategory.MEMORY]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    };

    this.errorStats.forEach((count, category) => {
      stats[category] = count;
    });

    return stats;
  }

  getErrorsByLevel(level: ErrorLevel): ClassifiedError[] {
    return this.errorHistory.filter((error) => error.level === level);
  }

  getErrorsByCategory(category: ErrorCategory): ClassifiedError[] {
    return this.errorHistory.filter((error) => error.category === category);
  }

  getCriticalErrors(): ClassifiedError[] {
    return this.errorHistory.filter((error) => error.severity === ErrorSeverity.CRITICAL);
  }

  clearHistory(): void {
    this.errorHistory = [];
    this.errorStats.clear();

    const storage = safeLocalStorage();
    if (storage) {
      storage.removeItem('error-isolation-logs');
    }
  }

  getHealthStatus(): {
    isHealthy: boolean;
    criticalErrorCount: number;
    totalErrorCount: number;
    errorRate: number;
    lastErrorTime?: number;
  } {
    const criticalErrors = this.getCriticalErrors();
    const totalErrors = this.errorHistory.length;
    const lastError = this.errorHistory[this.errorHistory.length - 1];

    // Consider unhealthy if more than 5 critical errors in last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCriticalErrors = criticalErrors.filter((error) => error.timestamp > oneHourAgo);

    const isHealthy = recentCriticalErrors.length < 5 && totalErrors < 50;

    const result: any = {
      isHealthy,
      criticalErrorCount: criticalErrors.length,
      totalErrorCount: totalErrors,
      errorRate: totalErrors > 0 ? criticalErrors.length / totalErrors : 0,
    };

    if (lastError?.timestamp) {
      result.lastErrorTime = lastError.timestamp;
    }

    return result;
  }
}

// Global instance
export const errorIsolationManager = ErrorIsolationManager.getInstance();
