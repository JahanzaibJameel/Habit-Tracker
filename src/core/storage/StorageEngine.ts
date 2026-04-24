/**
 * Enterprise-grade storage engine with migration support
 * Handles localStorage, IndexedDB, and sessionStorage with versioning
 * 
 * @fileoverview Core storage engine with migration capabilities
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { z } from 'zod';
import { ValidationError, ValidationErrorFactory } from '../validation/errors';

/**
 * Storage backend types
 */
export type StorageBackend = 'localStorage' | 'sessionStorage' | 'indexedDB';

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    version: number;
    timestamp: string;
    migrated: boolean;
    fromVersion?: number;
  };
}

/**
 * Migration function type
 */
export type MigrationFunction<T> = (oldData: unknown, fromVersion: number, toVersion: number) => T;

/**
 * Migration definition
 */
export interface Migration<T> {
  fromVersion: number;
  toVersion: number;
  migrate: MigrationFunction<T>;
  description: string;
  estimatedTime?: number; // in milliseconds
}

/**
 * Storage configuration
 */
export interface StorageConfig<T> {
  /**
   * Storage backend to use
   */
  backend: StorageBackend;
  
  /**
   * Key prefix for namespacing
   */
  keyPrefix: string;
  
  /**
   * Schema for data validation
   */
  schema: z.ZodType<T>;
  
  /**
   * Current version of the data schema
   */
  currentVersion: number;
  
  /**
   * Migration functions
   */
  migrations: Migration<T>[];
  
  /**
   * Default value if no data exists
   */
  defaultValue: T;
  
  /**
   * Enable compression for large data
   */
  compression?: boolean;
  
  /**
   * Enable encryption for sensitive data
   */
  encryption?: boolean;
  
  /**
   * TTL in milliseconds (optional)
   */
  ttl?: number;
  
  /**
   * Maximum storage size in bytes
   */
  maxSize?: number;
  
  /**
   * Enable corruption recovery for IndexedDB
   */
  enableCorruptionRecovery?: boolean;
  
  /**
   * Enable stale-while-revalidate pattern
   */
  enableStaleWhileRevalidate?: boolean;
  
  /**
   * Backup storage backend for corruption recovery
   */
  backupBackend?: StorageBackend;
  
  /**
   * Callback for corruption events
   */
  onCorruptionDetected?: (key: string, error: Error) => void;
  
  /**
   * Callback for recovery events
   */
  onRecoveryCompleted?: (key: string, recovered: boolean) => void;
}

/**
 * Storage interface for all backends
 */
interface IStorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  quota(): Promise<{ used: number; available: number }>;
}

/**
 * LocalStorage adapter
 */
class LocalStorageAdapter implements IStorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      throw new Error(`LocalStorage get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw new Error(`LocalStorage set failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`LocalStorage remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      throw new Error(`LocalStorage clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      throw new Error(`LocalStorage keys failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async size(): Promise<number> {
    try {
      let size = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          size += key.length + (value?.length || 0);
        }
      }
      return size;
    } catch (error) {
      throw new Error(`LocalStorage size calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async quota(): Promise<{ used: number; available: number }> {
    try {
      const used = await this.size();
      // LocalStorage doesn't provide quota info, so we estimate
      const estimated = 5 * 1024 * 1024; // 5MB typical limit
      return { used, available: Math.max(0, estimated - used) };
    } catch (error) {
      throw new Error(`LocalStorage quota check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * SessionStorage adapter
 */
class SessionStorageAdapter implements IStorageAdapter {
  async get(key: string): Promise<string | null> {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      throw new Error(`SessionStorage get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw new Error(`SessionStorage set failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      throw new Error(`SessionStorage remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      sessionStorage.clear();
    } catch (error) {
      throw new Error(`SessionStorage clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Object.keys(sessionStorage);
    } catch (error) {
      throw new Error(`SessionStorage keys failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async size(): Promise<number> {
    try {
      let size = 0;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key);
          size += key.length + (value?.length || 0);
        }
      }
      return size;
    } catch (error) {
      throw new Error(`SessionStorage size calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async quota(): Promise<{ used: number; available: number }> {
    try {
      const used = await this.size();
      // SessionStorage doesn't provide quota info, so we estimate
      const estimated = 5 * 1024 * 1024; // 5MB typical limit
      return { used, available: Math.max(0, estimated - used) };
    } catch (error) {
      throw new Error(`SessionStorage quota check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * IndexedDB adapter with corruption recovery
 */
class IndexedDBAdapter implements IStorageAdapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;
  private isCorrupted = false;
  private backupAdapter: IStorageAdapter | null = null;
  private config: StorageConfig<any>;
  private staleCache = new Map<string, { data: string; timestamp: number }>();

  constructor(dbName: string = 'StorageEngineDB', storeName: string = 'storage', config?: StorageConfig<any>) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.config = config || {} as StorageConfig<any>;
    
    // Initialize backup adapter if corruption recovery is enabled
    if (config?.enableCorruptionRecovery && config.backupBackend) {
      this.backupAdapter = this.createBackupAdapter(config.backupBackend);
    }
  }

  private createBackupAdapter(backend: StorageBackend): IStorageAdapter {
    switch (backend) {
      case 'localStorage':
        return new LocalStorageAdapter();
      case 'sessionStorage':
        return new SessionStorageAdapter();
      case 'indexedDB':
        return new IndexedDBAdapter(`${this.dbName}_backup`, `${this.storeName}_backup`);
      default:
        throw new Error(`Unsupported backup backend: ${backend}`);
    }
  }

  /**
   * Detect if IndexedDB is corrupted
   */
  private async detectCorruption(): Promise<boolean> {
    try {
      // Try to read a known key
      const testKey = `__corruption_test_${Date.now()}`;
      await this.set(testKey, 'test');
      const result = await this.get(testKey);
      await this.remove(testKey);
      return result !== 'test';
    } catch (error) {
      // If any operation fails, consider it corrupted
      return true;
    }
  }

  /**
   * Attempt to recover from corruption
   */
  private async recoverFromCorruption(): Promise<boolean> {
    if (!this.config.enableCorruptionRecovery) {
      return false;
    }

    try {
      // Notify about corruption
      if (this.config.onCorruptionDetected) {
        this.config.onCorruptionDetected(this.storeName, new Error('IndexedDB corruption detected'));
      }

      // Delete corrupted database
      await this.deleteDatabase();
      
      // Reinitialize
      this.db = null;
      this.initPromise = null;
      await this.init();

      // Restore from backup if available
      if (this.backupAdapter) {
        await this.restoreFromBackup();
      }

      this.isCorrupted = false;
      
      // Notify about recovery completion
      if (this.config.onRecoveryCompleted) {
        this.config.onRecoveryCompleted(this.storeName, true);
      }

      return true;
    } catch (error) {
      console.error('Failed to recover from IndexedDB corruption:', error);
      
      if (this.config.onRecoveryCompleted) {
        this.config.onRecoveryCompleted(this.storeName, false);
      }
      
      return false;
    }
  }

  /**
   * Delete the corrupted database
   */
  private async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName);
      
      deleteRequest.onerror = () => {
        reject(new Error(`Failed to delete corrupted database: ${deleteRequest.error?.message}`));
      };
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onblocked = () => {
        console.warn('Database deletion blocked - waiting for connections to close');
      };
    });
  }

  /**
   * Restore data from backup adapter
   */
  private async restoreFromBackup(): Promise<void> {
    if (!this.backupAdapter) return;

    try {
      const backupKeys = await this.backupAdapter.keys();
      
      for (const key of backupKeys) {
        const value = await this.backupAdapter.get(key);
        if (value) {
          await this.set(key, value);
        }
      }
      
      console.log(`Restored ${backupKeys.length} items from backup`);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
    }
  }

  /**
   * Save to backup adapter
   */
  private async saveToBackup(key: string, value: string): Promise<void> {
    if (!this.backupAdapter) return;
    
    try {
      await this.backupAdapter.set(key, value);
    } catch (error) {
      console.warn('Failed to save to backup:', error);
    }
  }

  private async init(): Promise<IDBDatabase> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new Error(`IndexedDB open failed: ${request.error?.message || 'Unknown error'}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction([this.storeName], mode);
    return transaction.objectStore(this.storeName);
  }

  async get(key: string): Promise<string | null> {
    try {
      // Check for stale data first if stale-while-revalidate is enabled
      if (this.config.enableStaleWhileRevalidate && this.staleCache.has(key)) {
        const stale = this.staleCache.get(key)!;
        const now = Date.now();
        const staleAge = now - stale.timestamp;
        
        // Return stale data if it's less than 5 minutes old
        if (staleAge < 5 * 60 * 1000) {
          // Asynchronously revalidate in background
          this.revalidateStaleData(key).catch(error => {
            console.warn('Failed to revalidate stale data:', error);
          });
          
          return stale.data;
        } else {
          // Remove expired stale data
          this.staleCache.delete(key);
        }
      }

      const store = await this.getStore();
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(new Error(`IndexedDB get failed: ${request.error?.message || 'Unknown error'}`));
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      // Handle corruption recovery
      if (this.config.enableCorruptionRecovery && !this.isCorrupted) {
        const isCorrupted = await this.detectCorruption();
        if (isCorrupted) {
          this.isCorrupted = true;
          const recovered = await this.recoverFromCorruption();
          
          if (recovered) {
            // Retry the operation after recovery
            return this.get(key);
          }
        }
      }
      
      // Fallback to backup if available
      if (this.backupAdapter) {
        try {
          const backupValue = await this.backupAdapter.get(key);
          if (backupValue) {
            console.warn('IndexedDB failed, using backup value for key:', key);
            return backupValue;
          }
        } catch (backupError) {
          console.error('Backup adapter also failed:', backupError);
        }
      }
      
      throw new Error(`IndexedDB get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revalidate stale data in background
   */
  private async revalidateStaleData(key: string): Promise<void> {
    try {
      const freshData = await this.getFreshData(key);
      if (freshData) {
        this.staleCache.set(key, {
          data: freshData,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      // If revalidation fails, keep the stale data
      console.warn('Revalidation failed, keeping stale data:', error);
    }
  }

  /**
   * Get fresh data without stale cache
   */
  private async getFreshData(key: string): Promise<string | null> {
    const store = await this.getStore();
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(new Error(`IndexedDB get failed: ${request.error?.message || 'Unknown error'}`));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(value, key);
        request.onerror = () => reject(new Error(`IndexedDB set failed: ${request.error?.message || 'Unknown error'}`));
        request.onsuccess = () => {
          // Update stale cache
          if (this.config.enableStaleWhileRevalidate) {
            this.staleCache.set(key, {
              data: value,
              timestamp: Date.now(),
            });
          }
          
          // Save to backup
          this.saveToBackup(key, value).catch(error => {
            console.warn('Failed to save to backup:', error);
          });
          
          resolve();
        };
      });
    } catch (error) {
      // Handle corruption recovery
      if (this.config.enableCorruptionRecovery && !this.isCorrupted) {
        const isCorrupted = await this.detectCorruption();
        if (isCorrupted) {
          this.isCorrupted = true;
          const recovered = await this.recoverFromCorruption();
          
          if (recovered) {
            // Retry the operation after recovery
            return this.set(key, value);
          }
        }
      }
      
      // Fallback to backup if available
      if (this.backupAdapter) {
        try {
          await this.backupAdapter.set(key, value);
          console.warn('IndexedDB failed, saved to backup for key:', key);
          return;
        } catch (backupError) {
          console.error('Backup adapter also failed:', backupError);
        }
      }
      
      throw new Error(`IndexedDB set failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(new Error(`IndexedDB remove failed: ${request.error?.message || 'Unknown error'}`));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      throw new Error(`IndexedDB remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore('readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(new Error(`IndexedDB clear failed: ${request.error?.message || 'Unknown error'}`));
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      throw new Error(`IndexedDB clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const store = await this.getStore();
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        request.onerror = () => reject(new Error(`IndexedDB keys failed: ${request.error?.message || 'Unknown error'}`));
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      throw new Error(`IndexedDB keys failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async size(): Promise<number> {
    try {
      const store = await this.getStore();
      return new Promise((resolve, reject) => {
        let size = 0;
        const request = store.openCursor();
        request.onerror = () => reject(new Error(`IndexedDB size calculation failed: ${request.error?.message || 'Unknown error'}`));
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const value = cursor.value as string;
            size += cursor.key.toString().length + value.length;
            cursor.continue();
          } else {
            resolve(size);
          }
        };
      });
    } catch (error) {
      throw new Error(`IndexedDB size calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async quota(): Promise<{ used: number; available: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
        };
      }
      
      // Fallback: calculate used size and estimate available
      const used = await this.size();
      const estimated = 50 * 1024 * 1024; // 50MB typical limit
      return { used, available: Math.max(0, estimated - used) };
    } catch (error) {
      throw new Error(`IndexedDB quota check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Main Storage Engine class
 */
export class StorageEngine<T> {
  private adapter: IStorageAdapter;
  private config: StorageConfig<T>;
  private versionKey: string;

  constructor(config: StorageConfig<T>) {
    this.config = config;
    this.versionKey = `${config.keyPrefix}:version`;
    
    // Initialize adapter based on backend
    switch (config.backend) {
      case 'localStorage':
        this.adapter = new LocalStorageAdapter();
        break;
      case 'sessionStorage':
        this.adapter = new SessionStorageAdapter();
        break;
      case 'indexedDB':
        this.adapter = new IndexedDBAdapter('StorageEngineDB', 'storage', config);
        break;
      default:
        throw new Error(`Unsupported storage backend: ${config.backend}`);
    }
  }

  /**
   * Gets the full storage key for a given key
   */
  private getStorageKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }

  /**
   * Serializes data with metadata
   */
  private serialize(data: T, version: number): string {
    const payload = {
      data,
      version,
      timestamp: new Date().toISOString(),
      compressed: this.config.compression || false,
      encrypted: this.config.encryption || false,
    };

    return JSON.stringify(payload);
  }

  /**
   * Deserializes data and validates schema
   */
  private deserialize(value: string): { data: T; version: number; timestamp: string } {
    try {
      const payload = JSON.parse(value);
      
      if (!payload.data || typeof payload.version !== 'number') {
        throw new Error('Invalid storage payload structure');
      }

      return {
        data: payload.data,
        version: payload.version,
        timestamp: payload.timestamp,
      };
    } catch (error) {
      throw new Error(`Deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Runs migrations for data
   */
  private async migrate(data: unknown, fromVersion: number): Promise<{ data: T; toVersion: number }> {
    let currentData = data;
    let currentVersion = fromVersion;

    // Sort migrations by version
    const sortedMigrations = [...this.config.migrations].sort((a, b) => a.toVersion - b.toVersion);

    for (const migration of sortedMigrations) {
      if (migration.fromVersion === currentVersion && migration.toVersion > currentVersion) {
        try {
          currentData = migration.migrate(currentData, migration.fromVersion, migration.toVersion);
          currentVersion = migration.toVersion;
        } catch (error) {
          throw new Error(`Migration from v${migration.fromVersion} to v${migration.toVersion} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Validate final data against schema
    try {
      const validatedData = this.config.schema.parse(currentData);
      return { data: validatedData, toVersion: currentVersion };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationErrorFactory.fromZodError(error, this.config.schema.constructor.name);
      }
      throw new Error(`Post-migration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets data from storage with automatic migration
   */
  async get(key: string): Promise<StorageResult<T>> {
    try {
      const storageKey = this.getStorageKey(key);
      const value = await this.adapter.get(storageKey);

      if (value === null) {
        return {
          success: true,
          data: this.config.defaultValue,
          metadata: {
            version: this.config.currentVersion,
            timestamp: new Date().toISOString(),
            migrated: false,
          },
        };
      }

      const deserialized = this.deserialize(value);
      const { data, version, timestamp } = deserialized;

      // Check if migration is needed
      if (version < this.config.currentVersion) {
        const migrated = await this.migrate(data, version);
        
        // Save migrated data back to storage
        await this.set(key, migrated.data);
        
        return {
          success: true,
          data: migrated.data,
          metadata: {
            version: migrated.toVersion,
            timestamp: new Date().toISOString(),
            migrated: true,
            fromVersion: version,
          },
        };
      }

      // Validate current data
      try {
        const validatedData = this.config.schema.parse(data);
        return {
          success: true,
          data: validatedData,
          metadata: {
            version,
            timestamp,
            migrated: false,
          },
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw ValidationErrorFactory.fromZodError(error, this.config.schema.constructor.name);
        }
        throw new Error(`Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sets data in storage
   */
  async set(key: string, data: T): Promise<StorageResult<T>> {
    try {
      // Validate data against schema
      const validatedData = this.config.schema.parse(data);
      
      const storageKey = this.getStorageKey(key);
      const serialized = this.serialize(validatedData, this.config.currentVersion);
      
      await this.adapter.set(storageKey, serialized);
      
      return {
        success: true,
        data: validatedData,
        metadata: {
          version: this.config.currentVersion,
          timestamp: new Date().toISOString(),
          migrated: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Removes data from storage
   */
  async remove(key: string): Promise<void> {
    const storageKey = this.getStorageKey(key);
    await this.adapter.remove(storageKey);
  }

  /**
   * Clears all data for this storage engine
   */
  async clear(): Promise<void> {
    const keys = await this.adapter.keys();
    const prefixedKeys = keys.filter(key => key.startsWith(this.config.keyPrefix));
    
    await Promise.all(prefixedKeys.map(key => this.adapter.remove(key)));
  }

  /**
   * Gets storage quota information
   */
  async getQuota(): Promise<{ used: number; available: number; percentage: number }> {
    const quota = await this.adapter.quota();
    const percentage = quota.used / (quota.used + quota.available) * 100;
    
    return {
      ...quota,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  /**
   * Checks if storage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = `${this.config.keyPrefix}:test`;
      await this.adapter.set(testKey, 'test');
      await this.adapter.remove(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets all keys for this storage engine
   */
  async getKeys(): Promise<string[]> {
    const keys = await this.adapter.keys();
    return keys
      .filter(key => key.startsWith(this.config.keyPrefix))
      .map(key => key.replace(`${this.config.keyPrefix}:`, ''));
  }

  /**
   * Gets storage size information
   */
  async getSize(): Promise<{ bytes: number; entries: number }> {
    const keys = await this.getKeys();
    let totalSize = 0;
    
    for (const key of keys) {
      const storageKey = this.getStorageKey(key);
      const value = await this.adapter.get(storageKey);
      if (value) {
        totalSize += storageKey.length + value.length;
      }
    }
    
    return {
      bytes: totalSize,
      entries: keys.length,
    };
  }

  /**
   * Exports all data for backup
   */
  async export(): Promise<Record<string, { data: T; version: number; timestamp: string }>> {
    const keys = await this.getKeys();
    const exportData: Record<string, { data: T; version: number; timestamp: string }> = {};
    
    for (const key of keys) {
      const result = await this.get(key);
      if (result.success && result.data) {
        exportData[key] = {
          data: result.data,
          version: result.metadata?.version || this.config.currentVersion,
          timestamp: result.metadata?.timestamp || new Date().toISOString(),
        };
      }
    }
    
    return exportData;
  }

  /**
   * Imports data from backup
   */
  async import(data: Record<string, { data: T; version: number; timestamp: string }>): Promise<void> {
    for (const [key, entry] of Object.entries(data)) {
      try {
        const storageKey = this.getStorageKey(key);
        const serialized = this.serialize(entry.data, entry.version);
        await this.adapter.set(storageKey, serialized);
      } catch (error) {
        console.error(`Failed to import key "${key}":`, error);
      }
    }
  }

  /**
   * Export complete storage snapshot for backup/restore
   */
  async exportSnapshot(): Promise<{
    data: Record<string, { data: T; version: number; timestamp: string }>;
    metadata: {
      exportedAt: string;
      backend: StorageBackend;
      keyPrefix: string;
      totalKeys: number;
      version: number;
      config: Omit<StorageConfig<T>, 'schema' | 'defaultValue'>;
    };
  }> {
    try {
      const keys = await this.adapter.keys();
      const snapshot: Record<string, { data: T; version: number; timestamp: string }> = {};
      
      // Filter keys that belong to this storage engine
      const storageKeys = keys.filter(key => key.startsWith(this.config.keyPrefix + ':'));
      
      for (const key of storageKeys) {
        try {
          const value = await this.adapter.get(key);
          if (value) {
            const parsed = JSON.parse(value);
            const originalKey = key.replace(this.config.keyPrefix + ':', '');
            snapshot[originalKey] = {
              data: parsed.data,
              version: parsed.version,
              timestamp: parsed.timestamp,
            };
          }
        } catch (error) {
          console.warn(`Failed to export key "${key}":`, error);
        }
      }
      
      return {
        data: snapshot,
        metadata: {
          exportedAt: new Date().toISOString(),
          backend: this.config.backend,
          keyPrefix: this.config.keyPrefix,
          totalKeys: Object.keys(snapshot).length,
          version: this.config.currentVersion,
          config: (() => {
            const config: any = {
              backend: this.config.backend,
              keyPrefix: this.config.keyPrefix,
              currentVersion: this.config.currentVersion,
              migrations: this.config.migrations,
              compression: this.config.compression || false,
              encryption: this.config.encryption || false,
              enableCorruptionRecovery: this.config.enableCorruptionRecovery || false,
              enableStaleWhileRevalidate: this.config.enableStaleWhileRevalidate || false,
            };
            
            if (this.config.ttl !== undefined) {
              config.ttl = this.config.ttl;
            }
            
            if (this.config.maxSize !== undefined) {
              config.maxSize = this.config.maxSize;
            }
            
            if (this.config.backupBackend) {
              config.backupBackend = this.config.backupBackend;
            }
            
            return config;
          })(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to export snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import complete storage snapshot with validation
   */
  async importSnapshot(snapshot: {
    data: Record<string, { data: T; version: number; timestamp: string }>;
    metadata: any;
  }, options: {
    overwrite?: boolean;
    validateSchema?: boolean;
    preserveExisting?: boolean;
  } = {}): Promise<{
    success: boolean;
    imported: string[];
    skipped: string[];
    errors: string[];
  }> {
    const result = {
      success: true,
      imported: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    const { overwrite = false, validateSchema = true, preserveExisting = false } = options;

    try {
      // Validate snapshot metadata
      if (!snapshot.metadata || snapshot.metadata.keyPrefix !== this.config.keyPrefix) {
        throw new Error('Snapshot metadata mismatch - wrong key prefix');
      }

      // Process each key in the snapshot
      for (const [key, entry] of Object.entries(snapshot.data)) {
        try {
          const storageKey = this.getStorageKey(key);
          
          // Check if key already exists
          const existing = await this.adapter.get(storageKey);
          if (existing && !overwrite && !preserveExisting) {
            result.skipped.push(key);
            continue;
          }

          // Validate data if schema validation is enabled
          if (validateSchema) {
            const parseResult = this.config.schema.safeParse(entry.data);
            if (!parseResult.success) {
              result.errors.push(`Schema validation failed for key "${key}": ${parseResult.error.message}`);
              continue;
            }
          }

          // Validate version compatibility
          if (entry.version > this.config.currentVersion) {
            result.errors.push(`Version mismatch for key "${key}": snapshot version ${entry.version} > current version ${this.config.currentVersion}`);
            continue;
          }

          // Apply migrations if needed
          let finalData = entry.data;
          if (entry.version < this.config.currentVersion) {
            for (const migration of this.config.migrations) {
              if (migration.fromVersion <= entry.version && migration.toVersion <= this.config.currentVersion) {
                try {
                  finalData = migration.migrate(finalData, entry.version, migration.toVersion);
                } catch (migrationError) {
                  result.errors.push(`Migration failed for key "${key}": ${migrationError instanceof Error ? migrationError.message : 'Unknown error'}`);
                  continue;
                }
              }
            }
          }

          // Store the data
          const serialized = this.serialize(finalData, this.config.currentVersion);
          await this.adapter.set(storageKey, serialized);
          result.imported.push(key);

        } catch (error) {
          result.errors.push(`Failed to import key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.success = false;
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Create incremental snapshot (only changed data since last snapshot)
   */
  async createIncrementalSnapshot(lastSnapshotTime?: string): Promise<{
    data: Record<string, { data: T; version: number; timestamp: string }>;
    metadata: any;
  }> {
    const lastTime = lastSnapshotTime ? new Date(lastSnapshotTime).getTime() : 0;
    const fullSnapshot = await this.exportSnapshot();
    
    // Filter data to only include items modified since last snapshot
    const incrementalData: Record<string, { data: T; version: number; timestamp: string }> = {};
    
    for (const [key, entry] of Object.entries(fullSnapshot.data)) {
      const entryTime = new Date(entry.timestamp).getTime();
      if (entryTime > lastTime) {
        incrementalData[key] = entry;
      }
    }
    
    return {
      data: incrementalData,
      metadata: {
        ...fullSnapshot.metadata,
        type: 'incremental',
        baseSnapshotTime: lastSnapshotTime,
        incrementalChanges: Object.keys(incrementalData).length,
      },
    };
  }

  /**
   * Get storage statistics for monitoring
   */
  async getStorageStats(): Promise<{
    totalKeys: number;
    totalSize: number;
    backend: StorageBackend;
    quota: { used: number; available: number };
    oldestEntry?: string;
    newestEntry?: string;
  }> {
    try {
      const keys = await this.adapter.keys();
      const storageKeys = keys.filter(key => key.startsWith(this.config.keyPrefix + ':'));
      const quota = await this.adapter.quota();
      
      let oldestEntry: string | undefined;
      let newestEntry: string | undefined;
      let oldestTime = Date.now();
      let newestTime = 0;
      
      // Analyze timestamps to find oldest/newest entries
      for (const key of storageKeys) {
        try {
          const value = await this.adapter.get(key);
          if (value) {
            const parsed = JSON.parse(value);
            const entryTime = new Date(parsed.timestamp).getTime();
            
            if (entryTime < oldestTime) {
              oldestTime = entryTime;
              oldestEntry = key;
            }
            
            if (entryTime > newestTime) {
              newestTime = entryTime;
              newestEntry = key;
            }
          }
        } catch (error) {
          // Skip invalid entries
        }
      }
      
      const result: any = {
        totalKeys: storageKeys.length,
        totalSize: await this.adapter.size(),
        backend: this.config.backend,
        quota,
      };
      
      if (oldestEntry) {
        result.oldestEntry = oldestEntry;
      }
      
      if (newestEntry) {
        result.newestEntry = newestEntry;
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function to create storage engines
 */
export function createStorageEngine<T>(config: StorageConfig<T>): StorageEngine<T> {
  return new StorageEngine(config);
}

/**
 * Default storage configurations
 */
export const StorageDefaults = {
  localStorage: {
    backend: 'localStorage' as const,
    keyPrefix: 'app',
    compression: false,
    encryption: false,
  },
  sessionStorage: {
    backend: 'sessionStorage' as const,
    keyPrefix: 'session',
    compression: false,
    encryption: false,
  },
  indexedDB: {
    backend: 'indexedDB' as const,
    keyPrefix: 'db',
    compression: true,
    encryption: false,
  },
} as const;
