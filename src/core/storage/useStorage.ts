/**
 * React hook for reactive storage access
 * Provides real-time updates and automatic migrations
 * 
 * @fileoverview React storage hook with reactive updates
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageEngine, StorageResult, createStorageEngine, StorageConfig } from './StorageEngine';

/**
 * Hook options for storage
 */
export interface UseStorageOptions<T> {
  /**
   * Whether to sync across tabs/windows
   */
  syncAcrossTabs?: boolean;
  
  /**
   * Debounce time for writes in milliseconds
   */
  debounceMs?: number;
  
  /**
   * Whether to persist data immediately or wait
   */
  immediate?: boolean;
  
  /**
   * Callback for storage errors
   */
  onError?: (error: Error) => void;
  
  /**
   * Callback for successful writes
   */
  onSuccess?: (key: string, data: T) => void;
  
  /**
   * Callback for migration events
   */
  onMigration?: (key: string, fromVersion: number, toVersion: number) => void;
}

/**
 * Storage state interface
 */
export interface StorageState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  lastUpdated: Date | null;
  metadata?: {
    version: number;
    timestamp: string;
    migrated: boolean;
    fromVersion?: number;
  };
}

/**
 * Storage actions interface
 */
export interface StorageActions<T> {
  set: (data: T) => Promise<void>;
  get: () => Promise<T | null>;
  remove: () => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: (defaultValue?: T) => void;
}

/**
 * React hook for reactive storage access
 * 
 * @example
 * const { state, actions } = useStorage('settings', settingsConfig, {
 *   syncAcrossTabs: true,
 *   debounceMs: 500
 * });
 * 
 * @param key - Storage key
 * @param config - Storage configuration
 * @param options - Hook options
 * @returns Storage state and actions
 */
export function useStorage<T>(
  key: string,
  config: StorageConfig<T>,
  options: UseStorageOptions<T> = {}
): {
  state: StorageState<T>;
  actions: StorageActions<T>;
  engine: StorageEngine<T>;
} {
  const {
    syncAcrossTabs = false,
    debounceMs = 0,
    immediate = true,
    onError,
    onSuccess,
    onMigration,
  } = options;

  // Create storage engine instance
  const engineRef = useRef<StorageEngine<T> | null>(null);
  if (!engineRef.current) {
    engineRef.current = createStorageEngine(config);
  }
  const engine = engineRef.current;

  // State management
  const [state, setState] = useState<StorageState<T>>({
    data: null,
    loading: true,
    error: null,
    isDirty: false,
    lastUpdated: null,
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  // Pending data ref for debounced writes
  const pendingDataRef = useRef<T | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Load data from storage
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await engine.get(key);
      
      if (result.success && result.data !== undefined) {
        setState(prev => ({
          ...prev,
          data: result.data || null,
          loading: false,
          error: null,
          lastUpdated: result.metadata?.timestamp ? new Date(result.metadata.timestamp) : null,
          metadata: result.metadata,
        }));

        // Trigger migration callback if migration occurred
        if (result.metadata?.migrated && onMigration) {
          onMigration(key, result.metadata.fromVersion || 0, result.metadata.version);
        }
      } else {
        setState(prev => ({
          ...prev,
          data: config.defaultValue,
          loading: false,
          error: result.error || null,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        data: config.defaultValue,
      }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }, [engine, key, config.defaultValue, onMigration, onError]);

  // Save data to storage
  const saveData = useCallback(async (data: T) => {
    try {
      const result = await engine.set(key, data);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          data: result.data || null,
          error: null,
          isDirty: false,
          lastUpdated: result.metadata?.timestamp ? new Date(result.metadata.timestamp) : new Date(),
          metadata: result.metadata,
        }));
        
        if (onSuccess) {
          onSuccess(key, data);
        }
      } else {
        const error = new Error(result.error || 'Failed to save data');
        setState(prev => ({ ...prev, error: error.message }));
        
        if (onError) {
          onError(error);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }, [engine, key, onSuccess, onError]);

  // Debounced save function
  const debouncedSave = useCallback((data: T) => {
    pendingDataRef.current = data;
    setState(prev => ({ ...prev, isDirty: true }));
    
    if (debounceMs > 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          saveData(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, debounceMs);
    } else {
      saveData(data);
    }
  }, [debounceMs, saveData]);

  // Storage actions
  const actions: StorageActions<T> = {
    set: immediate ? saveData : debouncedSave,
    
    get: async (): Promise<T | null> => {
      const result = await engine.get(key);
      return result.success && result.data !== undefined ? result.data : null;
    },
    
    remove: async (): Promise<void> => {
      try {
        await engine.remove(key);
        setState(prev => ({
          ...prev,
          data: config.defaultValue,
          error: null,
          isDirty: false,
          lastUpdated: new Date(),
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({ ...prev, error: errorMessage }));
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    },
    
    clear: async (): Promise<void> => {
      try {
        await engine.clear();
        setState(prev => ({
          ...prev,
          data: config.defaultValue,
          error: null,
          isDirty: false,
          lastUpdated: new Date(),
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState(prev => ({ ...prev, error: errorMessage }));
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    },
    
    refresh: loadData,
    
    reset: (defaultValue?: T) => {
      const resetValue = defaultValue !== undefined ? defaultValue : config.defaultValue;
      setState(prev => ({
        ...prev,
        data: resetValue,
        error: null,
        isDirty: false,
        lastUpdated: new Date(),
      }));
      
      if (immediate) {
        saveData(resetValue);
      } else {
        debouncedSave(resetValue);
      }
    },
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle cross-tab synchronization
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `${config.keyPrefix}:${key}`) {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncAcrossTabs, config.keyPrefix, key, loadData]);

  return { state, actions, engine };
}

/**
 * Hook for multiple storage keys
 * 
 * @example
 * const { settings, user } = useMultiStorage({
 *   settings: { key: 'settings', config: settingsConfig },
 *   user: { key: 'user', config: userConfig }
 * });
 */
export function useMultiStorage<T extends Record<string, any>>(
  storageMap: {
    [K in keyof T]: {
      key: string;
      config: StorageConfig<T[K]>;
      options?: UseStorageOptions<T[K]>;
    };
  }
): {
  [K in keyof T]: {
    state: StorageState<T[K]>;
    actions: StorageActions<T[K]>;
    engine: StorageEngine<T[K]>;
  };
} {
  const hooks = {} as any;
  
  for (const [name, config] of Object.entries(storageMap)) {
    const hook = useStorage(config.key, config.config, config.options);
    hooks[name] = hook;
  }
  
  return hooks;
}

/**
 * Hook for storage statistics and monitoring
 */
export function useStorageStats(engine: StorageEngine<any>) {
  const [stats, setStats] = useState({
    size: { bytes: 0, entries: 0 },
    quota: { used: 0, available: 0, percentage: 0 },
    available: true,
  });

  const updateStats = useCallback(async () => {
    try {
      const [size, quota, available] = await Promise.all([
        engine.getSize(),
        engine.getQuota(),
        engine.isAvailable(),
      ]);
      
      setStats({
        size,
        quota,
        available,
      });
    } catch (error) {
      setStats(prev => ({
        ...prev,
        available: false,
      }));
    }
  }, [engine]);

  useEffect(() => {
    updateStats();
    
    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    ...stats,
    refresh: updateStats,
  };
}

/**
 * Hook for storage debugging and development
 */
export function useStorageDebug(engine: StorageEngine<any>) {
  const [debugInfo, setDebugInfo] = useState({
    keys: [] as string[],
    exportData: {} as Record<string, any>,
    lastOperation: null as string | null,
  });

  const refreshDebugInfo = useCallback(async () => {
    try {
      const [keys, exportData] = await Promise.all([
        engine.getKeys(),
        engine.export(),
      ]);
      
      setDebugInfo(prev => ({
        ...prev,
        keys,
        exportData,
      }));
    } catch (error) {
      console.error('Failed to refresh debug info:', error);
    }
  }, [engine]);

  const clearAll = useCallback(async () => {
    try {
      await engine.clear();
      await refreshDebugInfo();
      setDebugInfo(prev => ({ ...prev, lastOperation: 'clear_all' }));
    } catch (error) {
      console.error('Failed to clear all data:', error);
      setDebugInfo(prev => ({ ...prev, lastOperation: 'clear_failed' }));
    }
  }, [engine, refreshDebugInfo]);

  const importData = useCallback(async (data: Record<string, any>) => {
    try {
      await engine.import(data);
      await refreshDebugInfo();
      setDebugInfo(prev => ({ ...prev, lastOperation: 'import_success' }));
    } catch (error) {
      console.error('Failed to import data:', error);
      setDebugInfo(prev => ({ ...prev, lastOperation: 'import_failed' }));
    }
  }, [engine, refreshDebugInfo]);

  useEffect(() => {
    refreshDebugInfo();
  }, [refreshDebugInfo]);

  return {
    ...debugInfo,
    refresh: refreshDebugInfo,
    clearAll,
    importData,
  };
}
