/**
 * Frontend-only data safety utilities
 * - localStorage safety with corruption recovery
 * - IndexedDB wrapper with error handling
 * - Data validation and migration
 * - Offline-safe behavior
 */

import { safeLocalStorage as safeStorage } from '../utils/ssr-safe';

// Data validation utilities
export interface DataValidator<T> {
  validate: (data: unknown) => data is T;
  sanitize?: (data: unknown) => T;
  migrate?: (data: any, version: number) => T;
}

export class DataValidatorRegistry {
  private static validators: Map<string, DataValidator<any>> = new Map();

  static register<T>(key: string, validator: DataValidator<T>): void {
    this.validators.set(key, validator);
  }

  static get<T>(key: string): DataValidator<T> | undefined {
    return this.validators.get(key);
  }

  static validate<T>(key: string, data: unknown): T | null {
    const validator = this.get<T>(key);
    if (!validator) return null;

    if (validator.validate(data)) {
      return data;
    }

    if (validator.sanitize) {
      try {
        return validator.sanitize(data);
      } catch (error) {
        console.error(`Failed to sanitize data for key ${key}:`, error);
        return null;
      }
    }

    return null;
  }
}

// Safe localStorage wrapper
export class SafeLocalStorage {
  private static instance: SafeLocalStorage;
  private storage: Storage | null;
  private prefix: string;

  private constructor(prefix: string = 'app_') {
    this.storage = safeStorage();
    this.prefix = prefix;
  }

  static getInstance(prefix?: string): SafeLocalStorage {
    if (!SafeLocalStorage.instance) {
      SafeLocalStorage.instance = new SafeLocalStorage(prefix);
    }
    return SafeLocalStorage.instance;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  setItem<T>(key: string, value: T, validator?: DataValidator<T>): boolean {
    if (!this.storage) return false;

    try {
      const serializedValue = JSON.stringify(value);

      // Validate before storing
      if (validator && !validator.validate(value)) {
        console.error(`Validation failed for key ${key}`);
        return false;
      }

      this.storage.setItem(this.getKey(key), serializedValue);
      return true;
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      return false;
    }
  }

  getItem<T>(key: string, validator?: DataValidator<T>): T | null {
    if (!this.storage) return null;

    try {
      const serializedValue = this.storage.getItem(this.getKey(key));
      if (serializedValue === null) return null;

      const parsedValue = JSON.parse(serializedValue);

      // Validate after parsing
      if (validator) {
        const validatedValue = DataValidatorRegistry.validate(key, parsedValue);
        if (validatedValue === null) {
          console.error(`Validation failed for retrieved item ${key}, removing corrupted data`);
          this.removeItem(key);
          return null;
        }
        return validatedValue as T;
      }

      return parsedValue as T;
    } catch (error) {
      console.error(`Failed to get item ${key}, removing corrupted data:`, error);
      this.removeItem(key);
      return null;
    }
  }

  removeItem(key: string): boolean {
    if (!this.storage) return false;

    try {
      this.storage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      return false;
    }
  }

  clear(): boolean {
    if (!this.storage) return false;

    try {
      // Only clear items with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key !== null && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => this.storage!.removeItem(key));
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  getAllKeys(): string[] {
    if (!this.storage) return [];

    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  getStorageInfo(): { used: number; available: number; total: number } | null {
    if (!this.storage) return null;

    try {
      let used = 0;
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          const value = this.storage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Estimate available space (localStorage typically has 5-10MB limit)
      const estimated = 5 * 1024 * 1024; // 5MB
      return {
        used,
        available: Math.max(0, estimated - used),
        total: estimated,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}

// IndexedDB wrapper
export interface IndexedDBSchema {
  name: string;
  version: number;
  stores: {
    [key: string]: {
      keyPath?: string;
      autoIncrement?: boolean;
      indexes?: {
        name: string;
        keyPath: string;
        unique?: boolean;
      }[];
    };
  };
}

export class SafeIndexedDB {
  private db: IDBDatabase | null = null;
  private schema: IndexedDBSchema;
  private initPromise: Promise<void> | null = null;

  constructor(schema: IndexedDBSchema) {
    this.schema = schema;
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.schema.name, this.schema.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.entries(this.schema.stores).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const storeOptions: IDBObjectStoreParameters = {};
            if (config.keyPath !== undefined) {
              storeOptions.keyPath = config.keyPath;
            }
            if (config.autoIncrement !== undefined) {
              storeOptions.autoIncrement = config.autoIncrement;
            }
            const store = db.createObjectStore(storeName, storeOptions);

            // Create indexes
            config.indexes?.forEach((index) => {
              const indexOptions: IDBIndexParameters = {};
              if (index.unique !== undefined) {
                indexOptions.unique = index.unique;
              }
              store.createIndex(index.name, index.keyPath, indexOptions);
            });
          }
        });
      };
    });

    return this.initPromise;
  }

  async add<T>(storeName: string, data: T): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(new Error(`Failed to add data: ${request.error}`));
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(new Error(`Failed to get data: ${request.error}`));
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(new Error(`Failed to get all data: ${request.error}`));
    });
  }

  async update<T>(storeName: string, data: T): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to update data: ${request.error}`));
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete data: ${request.error}`));
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear store: ${request.error}`));
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }
}

// Data backup and recovery
export class DataBackupManager {
  private static instance: DataBackupManager;
  private localStorage: SafeLocalStorage;
  private backupKey = 'data_backup';

  private constructor() {
    this.localStorage = SafeLocalStorage.getInstance();
  }

  static getInstance(): DataBackupManager {
    if (!DataBackupManager.instance) {
      DataBackupManager.instance = new DataBackupManager();
    }
    return DataBackupManager.instance;
  }

  createBackup(data: Record<string, any>): boolean {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data,
      };

      return this.localStorage.setItem(this.backupKey, backup);
    } catch (error) {
      console.error('Failed to create backup:', error);
      return false;
    }
  }

  restoreBackup(): Record<string, any> | null {
    try {
      const backup = this.localStorage.getItem(this.backupKey);
      if (!backup) return null;

      // Validate backup structure
      if (
        typeof backup !== 'object' ||
        backup === null ||
        !('timestamp' in backup) ||
        !('version' in backup) ||
        !('data' in backup)
      ) {
        console.error('Invalid backup structure');
        return null;
      }

      return (backup as any).data;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return null;
    }
  }

  exportBackup(): string | null {
    try {
      const backup = this.localStorage.getItem(this.backupKey);
      if (!backup) return null;

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Failed to export backup:', error);
      return null;
    }
  }

  importBackup(backupJson: string): boolean {
    try {
      const backup = JSON.parse(backupJson);

      // Validate backup structure
      if (!backup.timestamp || !backup.version || !backup.data) {
        console.error('Invalid backup structure');
        return false;
      }

      return this.createBackup(backup.data);
    } catch (error) {
      console.error('Failed to import backup:', error);
      return false;
    }
  }

  clearBackup(): boolean {
    return this.localStorage.removeItem(this.backupKey);
  }
}

// Data migration utilities
export class DataMigrationManager {
  private static migrations: Map<
    string,
    Array<{
      version: number;
      migrate: (data: any) => any;
    }>
  > = new Map();

  static registerMigration(key: string, version: number, migrate: (data: any) => any): void {
    if (!this.migrations.has(key)) {
      this.migrations.set(key, []);
    }

    const migrations = this.migrations.get(key)!;
    migrations.push({ version, migrate });

    // Sort by version
    migrations.sort((a, b) => a.version - b.version);
  }

  static migrate(key: string, data: any, currentVersion: number, targetVersion: number): any {
    const migrations = this.migrations.get(key);
    if (!migrations) return data;

    let result = data;

    for (const migration of migrations) {
      if (migration.version > currentVersion && migration.version <= targetVersion) {
        try {
          result = migration.migrate(result);
        } catch (error) {
          console.error(`Migration failed for ${key} version ${migration.version}:`, error);
          throw error;
        }
      }
    }

    return result;
  }
}

// Offline detection and handling
export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private listeners: ((online: boolean) => void)[] = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;

      window.addEventListener('online', this.handleOnlineChange);
      window.addEventListener('offline', this.handleOnlineChange);
    }
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private handleOnlineChange = () => {
    const wasOnline = this.isOnline;
    this.isOnline = navigator.onLine;

    if (wasOnline !== this.isOnline) {
      this.listeners.forEach((listener) => listener(this.isOnline));
    }
  };

  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineChange);
      window.removeEventListener('offline', this.handleOnlineChange);
    }
    this.listeners = [];
  }
}

// Export instances
export const safeLocalStorage = SafeLocalStorage.getInstance();
export const dataBackupManager = DataBackupManager.getInstance();
export const offlineManager = OfflineManager.getInstance();
export default { safeLocalStorage, dataBackupManager, offlineManager };
