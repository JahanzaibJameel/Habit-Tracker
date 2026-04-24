/**
 * Error Grouping System for Better Analytics
 * Groups similar errors together with unique errorId for better analytics
 * 
 * @fileoverview Error grouping and analytics enhancement
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

/**
 * Error group configuration
 */
export interface ErrorGroupConfig {
  /**
   * Enable automatic error grouping
   */
  enableGrouping?: boolean;
  
  /**
   * Grouping algorithm to use
   */
  groupingAlgorithm?: 'stacktrace' | 'message' | 'component' | 'hybrid';
  
  /**
   * Maximum number of groups to track
   */
  maxGroups?: number;
  
  /**
   * Group retention time (in milliseconds)
   */
  groupRetentionTime?: number;
  
  /**
   * Custom grouping function
   */
  customGroupingFunction?: (error: Error, context?: Record<string, unknown>) => string;
  
  /**
   * Enable fingerprinting for external services
   */
  enableFingerprinting?: boolean;
}

/**
 * Error group information
 */
export interface ErrorGroup {
  /**
   * Unique group identifier
   */
  groupId: string;
  
  /**
   * Error ID for analytics
   */
  errorId: string;
  
  /**
   * Group fingerprint
   */
  fingerprint: string[];
  
  /**
   * Number of occurrences
   */
  count: number;
  
  /**
   * First occurrence timestamp
   */
  firstSeen: number;
  
  /**
   * Last occurrence timestamp
   */
  lastSeen: number;
  
  /**
   * Error type
   */
  errorType: string;
  
  /**
   * Error message template
   */
  messageTemplate: string;
  
  /**
   * Component stack template
   */
  componentStackTemplate?: string;
  
  /**
   * Stack trace template
   */
  stackTraceTemplate?: string;
  
  /**
   * Environment information
   */
  environment: {
    userAgent: string;
    url: string;
    browser: string;
    os: string;
  };
  
  /**
   * Sample error (first occurrence)
   */
  sampleError: {
    message: string;
    stack?: string;
    componentStack?: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Error grouping result
 */
export interface ErrorGroupingResult {
  /**
   * Error group
   */
  group: ErrorGroup;
  
  /**
   * Is this a new group
   */
  isNewGroup: boolean;
  
  /**
   * Group statistics
   */
  stats: {
    totalGroups: number;
    totalErrors: number;
    errorRate: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorGroupConfig = {
  enableGrouping: true,
  groupingAlgorithm: 'hybrid',
  maxGroups: 1000,
  groupRetentionTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableFingerprinting: true,
};

/**
 * Error Grouping Manager
 */
export class ErrorGroupingManager {
  private config: ErrorGroupConfig;
  private groups = new Map<string, ErrorGroup>();
  private errorToGroupMap = new Map<string, string>();

  constructor(config: ErrorGroupConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Clean up old groups periodically
    setInterval(() => {
      this.cleanupOldGroups();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Process an error and return its group information
   */
  processError(error: Error, context?: Record<string, unknown>): ErrorGroupingResult {
    if (!this.config.enableGrouping) {
      // Return a temporary group for this error
      const tempGroup = this.createTemporaryGroup(error, context);
      return {
        group: tempGroup,
        isNewGroup: true,
        stats: {
          totalGroups: 0,
          totalErrors: 1,
          errorRate: 1,
        },
      };
    }

    const groupId = this.generateGroupId(error, context);
    const existingGroup = this.groups.get(groupId);
    const now = Date.now();

    if (existingGroup) {
      // Update existing group
      existingGroup.count++;
      existingGroup.lastSeen = now;
      
      // Update the error-to-group mapping
      const errorKey = this.generateErrorKey(error);
      this.errorToGroupMap.set(errorKey, groupId);

      return {
        group: existingGroup,
        isNewGroup: false,
        stats: this.getStats(),
      };
    } else {
      // Create new group
      const newGroup = this.createGroup(error, context, groupId, now);
      this.groups.set(groupId, newGroup);
      
      // Update the error-to-group mapping
      const errorKey = this.generateErrorKey(error);
      this.errorToGroupMap.set(errorKey, groupId);

      // Enforce maximum groups limit
      this.enforceGroupLimit();

      return {
        group: newGroup,
        isNewGroup: true,
        stats: this.getStats(),
      };
    }
  }

  /**
   * Generate group ID based on error and context
   */
  private generateGroupId(error: Error, context?: Record<string, unknown>): string {
    if (this.config.customGroupingFunction) {
      return this.config.customGroupingFunction(error, context);
    }

    switch (this.config.groupingAlgorithm) {
      case 'stacktrace':
        return this.generateStacktraceGroupId(error);
      case 'message':
        return this.generateMessageGroupId(error);
      case 'component':
        return this.generateComponentGroupId(error, context);
      case 'hybrid':
      default:
        return this.generateHybridGroupId(error, context);
    }
  }

  /**
   * Generate group ID based on stack trace
   */
  private generateStacktraceGroupId(error: Error): string {
    const stack = error.stack || '';
    const normalizedStack = this.normalizeStackTrace(stack);
    const hash = this.simpleHash(normalizedStack);
    return `stack_${hash}`;
  }

  /**
   * Generate group ID based on error message
   */
  private generateMessageGroupId(error: Error): string {
    const normalizedMessage = this.normalizeErrorMessage(error.message);
    const hash = this.simpleHash(normalizedMessage);
    return `msg_${hash}`;
  }

  /**
   * Generate group ID based on component stack
   */
  private generateComponentGroupId(error: Error, context?: Record<string, unknown>): string {
    const componentStack = context?.componentStack as string || '';
    const normalizedStack = this.normalizeComponentStack(componentStack);
    const hash = this.simpleHash(normalizedStack);
    return `comp_${hash}`;
  }

  /**
   * Generate group ID using hybrid approach
   */
  private generateHybridGroupId(error: Error, context?: Record<string, unknown>): string {
    const messageHash = this.simpleHash(this.normalizeErrorMessage(error.message));
    const stackHash = this.simpleHash(this.normalizeStackTrace(error.stack || ''));
    const componentHash = this.simpleHash(this.normalizeComponentStack(context?.componentStack as string || ''));
    
    return `hybrid_${messageHash}_${stackHash}_${componentHash}`;
  }

  /**
   * Normalize error message for grouping
   */
  private normalizeErrorMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Normalize stack trace for grouping
   */
  private normalizeStackTrace(stack: string): string {
    return stack
      .split('\n')
      .filter(line => line.includes('at '))
      .map(line => {
        // Extract file path and line number, remove specific line numbers
        const match = line.match(/at\s+.+\s+\([^)]+:\d+:\d+\)/);
        if (match) {
          return match[0].replace(/:\d+:\d+\)/, ':X:X)');
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Normalize component stack for grouping
   */
  private normalizeComponentStack(componentStack: string): string {
    return componentStack
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/\s+/g, ' '))
      .join('\n');
  }

  /**
   * Create a new error group
   */
  private createGroup(error: Error, context?: Record<string, unknown>, groupId?: string, timestamp?: number): ErrorGroup {
    const now = timestamp || Date.now();
    const fingerprint = this.generateFingerprint(error, context);
    
    return {
      groupId: groupId || this.generateGroupId(error, context),
      errorId: this.generateErrorId(error, context),
      fingerprint,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      errorType: error.constructor.name || 'Error',
      messageTemplate: this.extractMessageTemplate(error.message),
      componentStackTemplate: context?.componentStack ? this.extractComponentStackTemplate(context.componentStack as string) : undefined,
      stackTraceTemplate: error.stack ? this.extractStackTraceTemplate(error.stack) : undefined,
      environment: this.getEnvironmentInfo(),
      sampleError: {
        message: error.message,
        stack: error.stack,
        componentStack: context?.componentStack as string,
        context,
      },
    };
  }

  /**
   * Create a temporary group for non-grouped errors
   */
  private createTemporaryGroup(error: Error, context?: Record<string, unknown>): ErrorGroup {
    const now = Date.now();
    
    return {
      groupId: 'temp_' + this.simpleHash(error.message + (error.stack || '')),
      errorId: this.generateErrorId(error, context),
      fingerprint: [error.message],
      count: 1,
      firstSeen: now,
      lastSeen: now,
      errorType: error.constructor.name || 'Error',
      messageTemplate: error.message,
      environment: this.getEnvironmentInfo(),
      sampleError: {
        message: error.message,
        stack: error.stack,
        componentStack: context?.componentStack as string,
        context,
      },
    };
  }

  /**
   * Generate fingerprint for error grouping
   */
  private generateFingerprint(error: Error, context?: Record<string, unknown>): string[] {
    const fingerprint: string[] = [
      error.constructor.name || 'Error',
      this.extractMessageTemplate(error.message),
    ];

    if (error.stack) {
      const stackLines = error.stack.split('\n').filter(line => line.includes('at '));
      if (stackLines.length > 0) {
        fingerprint.push(this.extractStackTraceTemplate(error.stack));
      }
    }

    if (context?.componentStack) {
      fingerprint.push(this.extractComponentStackTemplate(context.componentStack as string));
    }

    return fingerprint;
  }

  /**
   * Extract message template by normalizing dynamic content
   */
  private extractMessageTemplate(message: string): string {
    return message
      .replace(/\b\d+\b/g, '{number}')
      .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '{uuid}')
      .replace(/\bhttps?:\/\/[^\s]+\b/g, '{url}')
      .replace(/['"]/g, '')
      .trim();
  }

  /**
   * Extract stack trace template
   */
  private extractStackTraceTemplate(stack: string): string {
    return stack
      .split('\n')
      .filter(line => line.includes('at '))
      .slice(0, 5) // First 5 lines are usually most relevant
      .map(line => line.replace(/:\d+:\d+\)/, ':{line}:{column}'))
      .join('\n');
  }

  /**
   * Extract component stack template
   */
  private extractComponentStackTemplate(componentStack: string): string {
    return componentStack
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 10) // First 10 components
      .join('\n');
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(error: Error, context?: Record<string, unknown>): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const hash = this.simpleHash(error.message + (error.stack || '') + JSON.stringify(context || {}));
    return `err_${hash}_${timestamp}_${random}`;
  }

  /**
   * Generate error key for mapping
   */
  private generateErrorKey(error: Error): string {
    return this.simpleHash(error.message + (error.stack || ''));
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo() {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
    };
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'unknown';
  }

  /**
   * Get OS information
   */
  private getOSInfo(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'unknown';
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get current statistics
   */
  private getStats() {
    const totalErrors = Array.from(this.groups.values()).reduce((sum, group) => sum + group.count, 0);
    const errorRate = totalErrors > 0 ? totalErrors / (Date.now() - (Array.from(this.groups.values())[0]?.firstSeen || Date.now())) : 0;
    
    return {
      totalGroups: this.groups.size,
      totalErrors,
      errorRate,
    };
  }

  /**
   * Clean up old groups
   */
  private cleanupOldGroups(): void {
    const now = Date.now();
    const retentionTime = this.config.groupRetentionTime || DEFAULT_CONFIG.groupRetentionTime!;
    
    for (const [groupId, group] of this.groups.entries()) {
      if (now - group.lastSeen > retentionTime) {
        this.groups.delete(groupId);
        
        // Clean up error-to-group mappings
        for (const [errorKey, mappedGroupId] of this.errorToGroupMap.entries()) {
          if (mappedGroupId === groupId) {
            this.errorToGroupMap.delete(errorKey);
          }
        }
      }
    }
  }

  /**
   * Enforce maximum groups limit
   */
  private enforceGroupLimit(): void {
    const maxGroups = this.config.maxGroups || DEFAULT_CONFIG.maxGroups!;
    
    if (this.groups.size > maxGroups) {
      // Sort groups by last seen time (oldest first)
      const sortedGroups = Array.from(this.groups.entries())
        .sort(([, a], [, b]) => a.lastSeen - b.lastSeen);
      
      // Remove oldest groups
      const groupsToRemove = sortedGroups.slice(0, this.groups.size - maxGroups);
      
      for (const [groupId] of groupsToRemove) {
        this.groups.delete(groupId);
        
        // Clean up error-to-group mappings
        for (const [errorKey, mappedGroupId] of this.errorToGroupMap.entries()) {
          if (mappedGroupId === groupId) {
            this.errorToGroupMap.delete(errorKey);
          }
        }
      }
    }
  }

  /**
   * Get all error groups
   */
  getGroups(): ErrorGroup[] {
    return Array.from(this.groups.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): ErrorGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get top error groups by count
   */
  getTopGroups(limit: number = 10): ErrorGroup[] {
    return this.getGroups()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear all groups
   */
  clearGroups(): void {
    this.groups.clear();
    this.errorToGroupMap.clear();
  }

  /**
   * Get analytics data
   */
  getAnalytics() {
    const groups = this.getGroups();
    const totalErrors = groups.reduce((sum, group) => sum + group.count, 0);
    
    return {
      totalGroups: groups.length,
      totalErrors,
      averageErrorsPerGroup: groups.length > 0 ? totalErrors / groups.length : 0,
      topErrorTypes: this.getTopErrorTypes(),
      groupsByTimeRange: this.getGroupsByTimeRange(),
      errorRate: this.calculateErrorRate(),
    };
  }

  /**
   * Get top error types
   */
  private getTopErrorTypes(): Array<{ type: string; count: number; percentage: number }> {
    const typeCounts = new Map<string, number>();
    
    for (const group of this.groups.values()) {
      const count = typeCounts.get(group.errorType) || 0;
      typeCounts.set(group.errorType, count + group.count);
    }
    
    const totalErrors = Array.from(typeCounts.values()).reduce((sum, count) => sum + count, 0);
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get groups by time range
   */
  private getGroupsByTimeRange(): Record<string, number> {
    const now = Date.now();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    
    const result: Record<string, number> = {};
    
    for (const [range, duration] of Object.entries(ranges)) {
      let count = 0;
      for (const group of this.groups.values()) {
        if (now - group.lastSeen <= duration) {
          count += group.count;
        }
      }
      result[range] = count;
    }
    
    return result;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    let errorsInLastHour = 0;
    for (const group of this.groups.values()) {
      if (group.lastSeen >= oneHourAgo) {
        errorsInLastHour += group.count;
      }
    }
    
    return errorsInLastHour / 60; // Errors per minute
  }
}

/**
 * Create a singleton error grouping manager
 */
export const errorGroupingManager = new ErrorGroupingManager();

/**
 * Enhanced error capture with grouping
 */
export function captureErrorWithGrouping(
  error: Error, 
  context?: Record<string, unknown>,
  config?: ErrorGroupConfig
): ErrorGroupingResult {
  const manager = config ? new ErrorGroupingManager(config) : errorGroupingManager;
  return manager.processError(error, context);
}
