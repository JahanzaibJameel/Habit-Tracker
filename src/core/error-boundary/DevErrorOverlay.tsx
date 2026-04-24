/**
 * Development Error Overlay with VSCode Integration
 * Provides rich error information and one-click navigation to source files
 * 
 * @fileoverview Development error overlay component
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import React, { useState, useEffect } from 'react';
import { ErrorInfo } from 'react';

/**
 * Error overlay configuration
 */
export interface DevErrorOverlayConfig {
  /**
   * Enable VSCode integration
   */
  enableVSCodeIntegration?: boolean;
  
  /**
   * Show error overlay in development only
   */
  developmentOnly?: boolean;
  
  /**
   * Custom error formatter
   */
  formatError?: (error: Error, errorInfo?: ErrorInfo) => string;
  
  /**
   * Enable error grouping
   */
  enableGrouping?: boolean;
  
  /**
   * Maximum number of errors to display
   */
  maxErrors?: number;
  
  /**
   * Auto-hide timeout (in milliseconds)
   */
  autoHideTimeout?: number;
  
  /**
   * Custom VSCode URL template
   */
  vscodeUrlTemplate?: string;
}

/**
 * Parsed error information
 */
export interface ParsedError {
  id: string;
  error: Error;
  errorInfo?: ErrorInfo;
  timestamp: number;
  stackTrace: string[];
  componentStack: string[];
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  errorType: string;
  severity: 'error' | 'warning' | 'info';
  groupId?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DevErrorOverlayConfig = {
  enableVSCodeIntegration: true,
  developmentOnly: true,
  enableGrouping: true,
  maxErrors: 10,
  autoHideTimeout: 0, // No auto-hide by default
  vscodeUrlTemplate: 'vscode://file/{filePath}:{lineNumber}:{columnNumber}',
};

/**
 * Development Error Overlay Component
 */
export function DevErrorOverlay({
  errors,
  config = DEFAULT_CONFIG,
  onDismiss,
  onClear,
}: {
  errors: ParsedError[];
  config?: DevErrorOverlayConfig;
  onDismiss?: (errorId: string) => void;
  onClear?: () => void;
}) {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings'>('all');

  // Auto-hide functionality
  useEffect(() => {
    if (config.autoHideTimeout && config.autoHideTimeout > 0) {
      const timer = setTimeout(() => {
        if (onClear) {
          onClear();
        }
      }, config.autoHideTimeout);

      return () => clearTimeout(timer);
    }
  }, [errors.length, config.autoHideTimeout, onClear]);

  // Check if we should show the overlay
  if (config.developmentOnly && process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (errors.length === 0) {
    return null;
  }

  const filteredErrors = errors.filter(error => {
    if (filter === 'all') return true;
    if (filter === 'errors') return error.severity === 'error';
    if (filter === 'warnings') return error.severity === 'warning';
    return true;
  });

  const groupedErrors = config.enableGrouping 
    ? groupErrors(filteredErrors)
    : filteredErrors.map(error => ({ group: error.id, errors: [error] }));

  const toggleExpanded = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const openInVSCode = (error: ParsedError) => {
    if (!config.enableVSCodeIntegration || !error.fileName) {
      return;
    }

    try {
      const url = config.vscodeUrlTemplate!
        .replace('{filePath}', error.fileName)
        .replace('{lineNumber}', (error.lineNumber || 1).toString())
        .replace('{columnNumber}', (error.columnNumber || 1).toString());

      window.open(url, '_blank');
    } catch (vscodeError) {
      console.error('Failed to open VSCode:', vscodeError);
      // Fallback: try to open the file directly
      if (error.fileName) {
        window.open(`file://${error.fileName}:${error.lineNumber || 1}`, '_blank');
      }
    }
  };

  const copyErrorDetails = (error: ParsedError) => {
    const details = {
      message: error.error.message,
      stack: error.error.stack,
      componentStack: error.errorInfo?.componentStack,
      fileName: error.fileName,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber,
      timestamp: new Date(error.timestamp).toISOString(),
      errorType: error.errorType,
    };

    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => {
        // Show success feedback (could add a toast notification)
        console.log('Error details copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy error details:', err);
      });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '80vh',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        fontFamily: 'Monaco, Menlo, monospace',
        fontSize: '12px',
        zIndex: 99999,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#fff', fontWeight: 'bold' }}>
          Development Errors ({filteredErrors.length})
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
            }}
          >
            <option value="all">All</option>
            <option value="errors">Errors</option>
            <option value="warnings">Warnings</option>
          </select>
          <button
            onClick={onClear}
            style={{
              backgroundColor: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Error List */}
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {groupedErrors.slice(0, config.maxErrors).map(({ group, errors: groupErrors }) => (
          <div
            key={group}
            style={{
              borderBottom: '1px solid #333',
              backgroundColor: selectedError === group ? '#2a2a2a' : 'transparent',
            }}
          >
            {/* Error Summary */}
            <div
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
              onClick={() => setSelectedError(selectedError === group ? null : group)}
            >
              <div style={{ flex: 1, marginRight: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: groupErrors[0] ? getSeverityColor(groupErrors[0].severity) : '#666',
                      marginRight: '8px',
                    }}
                  />
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>
                    {groupErrors[0]?.errorType || 'Unknown'}
                  </span>
                  {groupErrors.length > 1 && (
                    <span style={{ color: '#888', marginLeft: '8px' }}>
                      ({groupErrors.length})
                    </span>
                  )}
                </div>
                <div style={{ color: '#ccc', fontSize: '11px', marginBottom: '4px' }}>
                  {groupErrors[0]?.error.message?.split('\n')[0] || 'Unknown error'}
                </div>
                {groupErrors[0]?.fileName && groupErrors[0]?.lineNumber && (
                  <div style={{ color: '#888', fontSize: '10px' }}>
                    {groupErrors[0].fileName}:{groupErrors[0].lineNumber}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {config.enableVSCodeIntegration && groupErrors[0]?.fileName && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      groupErrors[0] && openInVSCode(groupErrors[0]);
                    }}
                    style={{
                      backgroundColor: '#007acc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                    title="Open in VSCode"
                  >
                    VSCode
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(group);
                  }}
                  style={{
                    backgroundColor: '#555',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {expandedErrors.has(group) ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDismiss && groupErrors[0]) {
                      onDismiss(groupErrors[0].id);
                    }
                  }}
                  style={{
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedErrors.has(group) && (
              <div style={{ padding: '0 16px 12px', backgroundColor: '#1a1a1a' }}>
                {groupErrors.map((error, index) => (
                  <div key={error.id} style={{ marginBottom: index < groupErrors.length - 1 ? '12px' : '0' }}>
                    {/* Stack Trace */}
                    {error.stackTrace.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ color: '#888', marginBottom: '4px' }}>Stack Trace:</div>
                        <div style={{ backgroundColor: '#0a0a0a', padding: '8px', borderRadius: '4px' }}>
                          {error.stackTrace.slice(0, 5).map((line, i) => (
                            <div
                              key={i}
                              style={{
                                color: line.includes('at ') ? '#888' : '#fff',
                                fontSize: '10px',
                                marginBottom: '2px',
                                cursor: line.includes('at ') && line.includes('(') ? 'pointer' : 'default',
                              }}
                              onClick={() => {
                                if (line.includes('at ') && line.includes('(')) {
                                  // Try to extract file info from stack trace
                                  const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
                                  if (match) {
                                    const [, , fileName, lineNumber, columnNumber] = match;
                                    openInVSCode({
                                      ...error,
                                      fileName,
                                      lineNumber: lineNumber ? parseInt(lineNumber) : 0,
                                      columnNumber: columnNumber ? parseInt(columnNumber) : 0,
                                    });
                                  }
                                }
                              }}
                            >
                              {line}
                            </div>
                          ))}
                          {error.stackTrace.length > 5 && (
                            <div style={{ color: '#888', fontSize: '10px', fontStyle: 'italic' }}>
                              ... and {error.stackTrace.length - 5} more lines
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Component Stack */}
                    {error.componentStack && error.componentStack.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ color: '#888', marginBottom: '4px' }}>Component Stack:</div>
                        <div style={{ backgroundColor: '#0a0a0a', padding: '8px', borderRadius: '4px' }}>
                          {error.componentStack.slice(0, 5).map((line, i) => (
                            <div key={i} style={{ color: '#ccc', fontSize: '10px', marginBottom: '2px' }}>
                              {line}
                            </div>
                          ))}
                          {error.componentStack.length > 5 && (
                            <div style={{ color: '#888', fontSize: '10px', fontStyle: 'italic' }}>
                              ... and {error.componentStack.length - 5} more lines
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => copyErrorDetails(error)}
                        style={{
                          backgroundColor: '#555',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Copy Details
                      </button>
                      {config.enableVSCodeIntegration && error.fileName && (
                        <button
                          onClick={() => openInVSCode(error)}
                          style={{
                            backgroundColor: '#007acc',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          Open in VSCode
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {filteredErrors.length > (config.maxErrors || 10) && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#2a2a2a',
            borderTop: '1px solid #333',
            color: '#888',
            fontSize: '10px',
            textAlign: 'center',
          }}
        >
          Showing {config.maxErrors || 10} of {filteredErrors.length} errors
        </div>
      )}
    </div>
  );
}

/**
 * Parse error information for display
 */
export function parseError(error: Error, errorInfo?: ErrorInfo): ParsedError {
  const errorId = generateErrorId(error);
  const stackTrace = parseStackTrace(error.stack || '');
  const componentStack = parseComponentStack(errorInfo?.componentStack || '');
  
  // Extract file information from stack trace
  const { fileName, lineNumber, columnNumber } = extractFileInfo(stackTrace);
  
  // Determine error type
  const errorType = error.constructor.name || 'Error';
  
  // Determine severity
  const severity = error.name === 'Warning' || error.name === 'DeprecatedWarning' 
    ? 'warning' as const 
    : 'error' as const;

  return {
    id: errorId,
    error,
    errorInfo,
    timestamp: Date.now(),
    stackTrace,
    componentStack,
    fileName,
    lineNumber,
    columnNumber,
    errorType,
    severity,
  };
}

/**
 * Generate unique error ID
 */
function generateErrorId(error: Error): string {
  const message = error.message || '';
  const stack = error.stack || '';
  const hash = simpleHash(message + stack);
  return `error_${hash}`;
}

/**
 * Simple hash function for error grouping
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse stack trace into array of lines
 */
function parseStackTrace(stack: string): string[] {
  return stack.split('\n').filter(line => line.trim());
}

/**
 * Parse component stack into array of lines
 */
function parseComponentStack(componentStack: string): string[] {
  return componentStack.split('\n').filter(line => line.trim());
}

/**
 * Extract file information from stack trace
 */
function extractFileInfo(stackTrace: string[]): {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
} {
  for (const line of stackTrace) {
    const match = line.match(/at\s+(.+)\s+\(([^)]+):(\d+):(\d+)\)/);
    if (match) {
      const [, , fileName, lineNumber, columnNumber] = match;
      const result: { fileName?: string; lineNumber: number; columnNumber: number } = {
        fileName: fileName && fileName.includes('http') ? fileName : undefined,
        lineNumber: lineNumber ? parseInt(lineNumber, 10) : 0,
        columnNumber: columnNumber ? parseInt(columnNumber, 10) : 0,
      };
      return result;
    }
  }
  
  return {};
}

/**
 * Group similar errors together
 */
function groupErrors(errors: ParsedError[]): Array<{ group: string; errors: ParsedError[] }> {
  const groups = new Map<string, ParsedError[]>();
  
  for (const error of errors) {
    const groupKey = `${error.errorType}:${error.error.message}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(error);
  }
  
  return Array.from(groups.entries()).map(([group, errors]) => ({ group, errors }));
}

/**
 * Hook for managing error overlay state
 */
export function useDevErrorOverlay(config?: DevErrorOverlayConfig) {
  const [errors, setErrors] = useState<ParsedError[]>([]);
  
  const addError = (error: Error, errorInfo?: ErrorInfo) => {
    const parsedError = parseError(error, errorInfo);
    setErrors(prev => {
      // Check if this error already exists
      const existingIndex = prev.findIndex(e => e.id === parsedError.id);
      if (existingIndex >= 0) {
        // Update existing error
        const updated = [...prev];
        updated[existingIndex] = parsedError;
        return updated;
      }
      
      // Add new error
      return [...prev, parsedError].sort((a, b) => b.timestamp - a.timestamp);
    });
  };
  
  const dismissError = (errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  };
  
  const clearErrors = () => {
    setErrors([]);
  };
  
  return {
    errors,
    addError,
    dismissError,
    clearErrors,
  };
}
