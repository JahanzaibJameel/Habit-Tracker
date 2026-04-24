/**
 * Error Context for centralized error handling and reporting
 * Provides global error state management and recovery coordination
 * 
 * @fileoverview Error context for global error handling
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode, JSX } from 'react';
import { ErrorRecoveryStrategy } from './ErrorBoundary';

/**
 * Error entry structure
 */
export interface ErrorEntry {
  id: string;
  timestamp: number;
  error: Error;
  errorInfo?: {
    componentStack: string;
    boundaryId: string;
  };
  boundaryId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  recoveryStrategy?: ErrorRecoveryStrategy;
  userAgent: string;
  url: string;
  userId?: string;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByBoundary: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: number; // Last hour
  errorRate: number; // Errors per minute
  lastErrorTime: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: number;
  }>;
}

/**
 * Error context state
 */
export interface ErrorContextState {
  errors: ErrorEntry[];
  stats: ErrorStats;
  isMonitoring: boolean;
  filters: {
    severity: string[];
    boundaries: string[];
    timeRange: number; // Hours
  };
  settings: {
    maxErrors: number;
    enableAutoReporting: boolean;
    enableRecoverySuggestions: boolean;
    samplingRate: number;
  };
}

/**
 * Error context actions
 */
export type ErrorContextAction =
  | { type: 'ADD_ERROR'; payload: ErrorEntry }
  | { type: 'RESOLVE_ERROR'; payload: string }
  | { type: 'RESOLVE_ERRORS'; payload: string[] }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ErrorContextState['settings']> }
  | { type: 'UPDATE_FILTERS'; payload: Partial<ErrorContextState['filters']> }
  | { type: 'SET_MONITORING'; payload: boolean }
  | { type: 'APPLY_RECOVERY'; payload: { errorId: string; strategy: ErrorRecoveryStrategy } };

/**
 * Error context value
 */
export interface ErrorContextValue {
  state: ErrorContextState;
  actions: {
    addError: (error: Error, boundaryId: string, severity?: ErrorEntry['severity']) => void;
    resolveError: (errorId: string) => void;
    resolveAllErrors: () => void;
    clearErrors: () => void;
    applyRecovery: (errorId: string, strategy: ErrorRecoveryStrategy) => void;
    getFilteredErrors: () => ErrorEntry[];
    exportErrors: () => string;
    importErrors: (data: string) => void;
    updateSettings: (settings: Partial<ErrorContextState['settings']>) => void;
    updateFilters: (filters: Partial<ErrorContextState['filters']>) => void;
    setMonitoring: (enabled: boolean) => void;
  };
}

/**
 * Error context reducer
 */
function errorReducer(state: ErrorContextState, action: ErrorContextAction): ErrorContextState {
  switch (action.type) {
    case 'ADD_ERROR': {
      const newError = action.payload;
      const updatedErrors = [...state.errors, newError];
      
      // Trim errors if exceeding max limit
      const maxErrors = state.settings.maxErrors;
      const trimmedErrors = updatedErrors.length > maxErrors 
        ? updatedErrors.slice(-maxErrors)
        : updatedErrors;
      
      return {
        ...state,
        errors: trimmedErrors,
        stats: calculateStats(trimmedErrors),
      };
    }

    case 'RESOLVE_ERROR': {
      const updatedErrors = state.errors.map(error =>
        error.id === action.payload ? { ...error, resolved: true } : error
      );
      
      return {
        ...state,
        errors: updatedErrors,
        stats: calculateStats(updatedErrors),
      };
    }

    case 'RESOLVE_ERRORS': {
      const errorIds = new Set(action.payload);
      const updatedErrors = state.errors.map(error =>
        errorIds.has(error.id) ? { ...error, resolved: true } : error
      );
      
      return {
        ...state,
        errors: updatedErrors,
        stats: calculateStats(updatedErrors),
      };
    }

    case 'CLEAR_ERRORS': {
      return {
        ...state,
        errors: [],
        stats: calculateStats([]),
      };
    }

    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      return {
        ...state,
        settings: newSettings,
        errors: newSettings.maxErrors < state.errors.length 
          ? state.errors.slice(-newSettings.maxErrors)
          : state.errors,
      };
    }

    case 'UPDATE_FILTERS': {
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    }

    case 'SET_MONITORING': {
      return {
        ...state,
        isMonitoring: action.payload,
      };
    }

    case 'APPLY_RECOVERY': {
      const { errorId, strategy } = action.payload;
      const updatedErrors = state.errors.map(error =>
        error.id === errorId 
          ? { ...error, resolved: true, recoveryStrategy: strategy }
          : error
      );
      
      return {
        ...state,
        errors: updatedErrors,
        stats: calculateStats(updatedErrors),
      };
    }

    default:
      return state;
  }
}

/**
 * Calculates error statistics
 */
function calculateStats(errors: ErrorEntry[]): ErrorStats {
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const recentErrors = errors.filter(e => e.timestamp > oneHourAgo);
  
  const errorsByBoundary = errors.reduce((acc, error) => {
    acc[error.boundaryId] = (acc[error.boundaryId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const errorsBySeverity = errors.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate top errors by message
  const errorCounts = errors.reduce((acc, error) => {
    const key = error.error.message;
    if (!acc[key]) {
      acc[key] = { count: 0, lastOccurrence: 0 };
    }
    acc[key].count++;
    acc[key].lastOccurrence = Math.max(acc[key].lastOccurrence, error.timestamp);
    return acc;
  }, {} as Record<string, { count: number; lastOccurrence: number }>);

  const topErrors = Object.entries(errorCounts)
    .map(([message, data]) => ({ message, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const errorRate = recentErrors.length / 60; // Errors per minute

  return {
    totalErrors: errors.length,
    errorsByBoundary,
    errorsBySeverity,
    recentErrors: recentErrors.length,
    errorRate,
    lastErrorTime: errors.length > 0 ? Math.max(...errors.map(e => e.timestamp)) : 0,
    topErrors,
  };
}

/**
 * Error context
 */
export const ErrorContext = createContext<ErrorContextValue | null>(null);

/**
 * Error context provider
 */
export function ErrorContextProvider({ 
  children, 
  userId 
}: { 
  children: ReactNode; 
  userId?: string;
}): JSX.Element {
  const initialState: ErrorContextState = {
    errors: [],
    stats: calculateStats([]),
    isMonitoring: true,
    filters: {
      severity: [],
      boundaries: [],
      timeRange: 24,
    },
    settings: {
      maxErrors: 1000,
      enableAutoReporting: true,
      enableRecoverySuggestions: true,
      samplingRate: 1.0,
    },
  };

  const [state, dispatch] = useReducer(errorReducer, initialState);

  // Generate unique error ID
  const generateErrorId = useCallback(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add error to context
  const addError = useCallback((
    error: Error, 
    boundaryId: string, 
    severity: ErrorEntry['severity'] = 'medium'
  ) => {
    if (!state.isMonitoring) return;

    // Apply sampling rate
    if (Math.random() > state.settings.samplingRate) return;

    const errorEntry: ErrorEntry = {
      id: generateErrorId(),
      timestamp: Date.now(),
      error,
      boundaryId,
      severity,
      resolved: false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userId,
    };

    dispatch({ type: 'ADD_ERROR', payload: errorEntry });

    // Auto-report if enabled
    if (state.settings.enableAutoReporting) {
      // Send to monitoring service
      console.warn('Auto-reporting error:', errorEntry);
    }
  }, [state.isMonitoring, state.settings.samplingRate, state.settings.enableAutoReporting, generateErrorId, userId]);

  // Resolve specific error
  const resolveError = useCallback((errorId: string) => {
    dispatch({ type: 'RESOLVE_ERROR', payload: errorId });
  }, []);

  // Resolve all errors
  const resolveAllErrors = useCallback(() => {
    const unresolvedErrorIds = state.errors
      .filter(error => !error.resolved)
      .map(error => error.id);
    
    dispatch({ type: 'RESOLVE_ERRORS', payload: unresolvedErrorIds });
  }, [state.errors]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  // Apply recovery strategy
  const applyRecovery = useCallback((errorId: string, strategy: ErrorRecoveryStrategy) => {
    dispatch({ type: 'APPLY_RECOVERY', payload: { errorId, strategy } });
  }, []);

  // Get filtered errors
  const getFilteredErrors = useCallback(() => {
    const { severity, boundaries, timeRange } = state.filters;
    const now = Date.now();
    const timeThreshold = now - (timeRange * 3600000);

    return state.errors.filter(error => {
      // Time filter
      if (error.timestamp < timeThreshold) return false;
      
      // Severity filter
      if (severity.length > 0 && !severity.includes(error.severity)) return false;
      
      // Boundary filter
      if (boundaries.length > 0 && !boundaries.includes(error.boundaryId)) return false;
      
      return true;
    });
  }, [state.errors, state.filters]);

  // Export errors for debugging
  const exportErrors = useCallback(() => {
    const exportData = {
      timestamp: Date.now(),
      state,
      filteredErrors: getFilteredErrors(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [state, getFilteredErrors]);

  // Import errors for debugging
  const importErrors = useCallback((data: string) => {
    try {
      const importData = JSON.parse(data);
      if (importData.state) {
        // Restore state (for debugging purposes)
        console.log('Importing error state for debugging');
      }
    } catch (error) {
      console.error('Failed to import error data:', error);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((settings: Partial<ErrorContextState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  // Update filters
  const updateFilters = useCallback((filters: Partial<ErrorContextState['filters']>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  }, []);

  // Set monitoring state
  const setMonitoring = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_MONITORING', payload: enabled });
  }, []);

  // Auto-cleanup old errors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 3600000);
      
      const oldErrors = state.errors.filter(error => error.timestamp < twentyFourHoursAgo);
      if (oldErrors.length > 0) {
        // Keep only recent errors
        const recentErrors = state.errors.filter(error => error.timestamp >= twentyFourHoursAgo);
        dispatch({ type: 'CLEAR_ERRORS' });
        recentErrors.forEach(error => {
          dispatch({ type: 'ADD_ERROR', payload: error });
        });
      }
    }, 3600000); // Check every hour

    return () => clearInterval(interval);
  }, [state.errors]);

  const contextValue: ErrorContextValue = {
    state,
    actions: {
      addError,
      resolveError,
      resolveAllErrors,
      clearErrors,
      applyRecovery,
      getFilteredErrors,
      exportErrors,
      importErrors,
      updateSettings,
      updateFilters,
      setMonitoring,
    },
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook to use error context
 */
export function useErrorContext(): ErrorContextValue {
  const context = useContext(ErrorContext);
  
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorContextProvider');
  }
  
  return context;
}

/**
 * Hook for error reporting with automatic context integration
 */
export function useErrorReporter(boundaryId: string) {
  const { actions } = useErrorContext();
  
  return {
    reportError: (error: Error, severity?: ErrorEntry['severity']) => {
      actions.addError(error, boundaryId, severity);
    },
    reportWarning: (message: string) => {
      actions.addError(new Error(message), boundaryId, 'low');
    },
    reportCritical: (error: Error) => {
      actions.addError(error, boundaryId, 'critical');
    },
  };
}

/**
 * Error recovery suggestions based on error patterns
 */
export class ErrorRecoverySuggestions {
  /**
   * Get recovery suggestions for an error
   */
  static getSuggestions(error: Error, boundaryId: string): Array<{
    strategy: ErrorRecoveryStrategy;
    reason: string;
    confidence: number;
  }> {
    const suggestions: Array<{
      strategy: ErrorRecoveryStrategy;
      reason: string;
      confidence: number;
    }> = [];

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push({
        strategy: ErrorRecoveryStrategy.RETRY,
        reason: 'Network errors are often temporary',
        confidence: 0.8,
      });
    }

    // Timeout errors
    if (message.includes('timeout')) {
      suggestions.push({
        strategy: ErrorRecoveryStrategy.RETRY,
        reason: 'Timeout errors may resolve with retry',
        confidence: 0.7,
      });
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized')) {
      suggestions.push({
        strategy: ErrorRecoveryStrategy.RESET,
        reason: 'Permission errors may require re-authentication',
        confidence: 0.9,
      });
    }

    // Memory errors
    if (message.includes('memory') || message.includes('out of memory')) {
      suggestions.push({
        strategy: ErrorRecoveryStrategy.RESET,
        reason: 'Memory issues require component reset',
        confidence: 0.9,
      });
    }

    // Validation errors
    if (name.includes('validation') || message.includes('validation')) {
      suggestions.push({
        strategy: ErrorRecoveryStrategy.FALLBACK,
        reason: 'Validation errors should not be retried',
        confidence: 0.8,
      });
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push({
        strategy: ErrorRecoveryStrategy.RETRY,
        reason: 'Unknown error, trying retry first',
        confidence: 0.5,
      });
      
      suggestions.push({
        strategy: ErrorRecoveryStrategy.RESET,
        reason: 'If retry fails, reset component',
        confidence: 0.4,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get automatic recovery strategy
   */
  static getAutomaticStrategy(error: Error): ErrorRecoveryStrategy | null {
    const suggestions = this.getSuggestions(error, '');
    const bestSuggestion = suggestions[0];
    
    return bestSuggestion && bestSuggestion.confidence > 0.8 
      ? bestSuggestion.strategy 
      : null;
  }
}
