/**
 * Structured logging system for production monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  userId: string | undefined;
  sessionId: string;
  metadata: Record<string, any> | undefined;
  error:
    | {
        name: string;
        message: string;
        stack?: string | undefined;
      }
    | undefined;
}

class Logger {
  private userId?: string;
  private sessionId: string;
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private generateSessionId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      metadata,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };
  }

  private log(entry: LogEntry) {
    // In production, send to logging service
    if (this.isProduction) {
      // Send to Sentry, LogRocket, or other logging service
      if (window.Sentry) {
        if (entry.level === 'error' || entry.level === 'fatal') {
          window.Sentry.captureException(entry.error || new Error(entry.message), {
            tags: {
              level: entry.level,
              userId: entry.userId,
              sessionId: entry.sessionId,
            },
            extra: entry.metadata,
          });
        } else {
          window.Sentry.addBreadcrumb({
            message: entry.message,
            level: entry.level as any,
            data: entry.metadata,
          });
        }
      }

      // Send to console for development
      console.error(JSON.stringify(entry));
    } else {
      // Development logging
      const message = `[${entry.level.toUpperCase()}] ${entry.message}`;
      switch (entry.level) {
        case 'debug':
          console.debug(message, entry.metadata || '', entry.error || '');
          break;
        case 'info':
          console.info(message, entry.metadata || '', entry.error || '');
          break;
        case 'warn':
          console.warn(message, entry.metadata || '', entry.error || '');
          break;
        case 'error':
        case 'fatal':
          console.error(message, entry.metadata || '', entry.error || '');
          break;
        default:
          console.log(message, entry.metadata || '', entry.error || '');
      }
    }
  }

  debug(message: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('debug', message, metadata));
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('warn', message, metadata));
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('error', message, metadata, error));
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log(this.createLogEntry('fatal', message, metadata, error));
  }

  // Performance logging
  performance(operation: string, duration: number, metadata?: Record<string, any>) {
    this.info(`Performance: ${operation}`, {
      ...metadata,
      duration,
      performanceMetric: true,
    });
  }

  // User action logging
  userAction(action: string, metadata?: Record<string, any>) {
    this.info(`User Action: ${action}`, {
      ...metadata,
      userAction: true,
    });
  }

  // API logging
  apiCall(
    method: string,
    url: string,
    status: number,
    duration: number,
    metadata?: Record<string, any>
  ) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(
      this.createLogEntry(level, `API: ${method} ${url}`, {
        ...metadata,
        method,
        url,
        status,
        duration,
        apiCall: true,
      })
    );
  }
}

export const logger = new Logger();

// Extend Window interface for TypeScript
declare global {
  interface Window {
    Sentry?: any;
  }
}

export default logger;
