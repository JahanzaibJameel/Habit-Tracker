/**
 * Enterprise-grade resilient storage layer
 * - Corruption detection and recovery
 * - Automatic backup and restore
 * - Schema validation
 * - Graceful degradation
 */

import { safeLocalStorage } from '../utils/ssr-safe';
import type { DataValidator } from './data-safety';

export interface StorageConfig {
  key: string;
  validator?: DataValidator<any>;
  backupEnabled?: boolean;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface StorageMetadata {
  version: string;
  timestamp: number;
  checksum: string;
  compressed?: boolean;
  encrypted?: boolean;
  backupCount?: number;
}

export class ResilientStorage {
  private static instances: Map<string, ResilientStorage> = new Map();
  private config: StorageConfig;
  private backupKey: string;
  private corruptionKey: string;
  private maxBackups = 5;

  constructor(config: StorageConfig) {
    this.config = {
      backupEnabled: true,
      compressionEnabled: false,
      encryptionEnabled: false,
      maxRetries: 3,
      retryDelay: 100,
      ...config,
    };

    this.backupKey = `${config.key}_backup`;
    this.corruptionKey = `${config.key}_corruption`;
  }

  static getInstance(config: StorageConfig): ResilientStorage {
    if (!this.instances.has(config.key)) {
      this.instances.set(config.key, new ResilientStorage(config));
    }
    return this.instances.get(config.key)!;
  }

  // Calculate checksum for data integrity
  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Compress data (simple implementation)
  private compress(data: string): string {
    if (!this.config.compressionEnabled) return data;
    // In production, use proper compression library
    return btoa(data);
  }

  // Decompress data
  private decompress(data: string): string {
    if (!this.config.compressionEnabled) return data;
    try {
      return atob(data);
    } catch {
      return data; // Fallback if not compressed
    }
  }

  // Encrypt data (simple implementation)
  private encrypt(data: string): string {
    if (!this.config.encryptionEnabled) return data;
    // In production, use proper encryption
    return btoa(data);
  }

  // Decrypt data
  private decrypt(data: string): string {
    if (!this.config.encryptionEnabled) return data;
    try {
      return atob(data);
    } catch {
      return data; // Fallback if not encrypted
    }
  }

  // Create backup of current data
  private createBackup(data: any): void {
    if (!this.config.backupEnabled) return;

    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const backups = this.getBackups();
      const newBackup = {
        data,
        timestamp: Date.now(),
        version: '1.0',
      };

      backups.push(newBackup);

      // Keep only recent backups
      if (backups.length > this.maxBackups) {
        backups.splice(0, backups.length - this.maxBackups);
      }

      storage.setItem(this.backupKey, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  // Get all backups
  private getBackups(): any[] {
    const storage = safeLocalStorage();
    if (!storage) return [];

    try {
      const backupsJson = storage.getItem(this.backupKey);
      return backupsJson ? JSON.parse(backupsJson) : [];
    } catch {
      return [];
    }
  }

  // Restore from most recent backup
  private restoreFromBackup(): any | null {
    const backups = this.getBackups();
    if (backups.length === 0) return null;

    const latestBackup = backups[backups.length - 1];
    return latestBackup.data;
  }

  // Log corruption for debugging
  private logCorruption(error: Error, data: string): void {
    const storage = safeLocalStorage();
    if (!storage) return;

    try {
      const corruptionLog = {
        timestamp: Date.now(),
        error: error.message,
        data: data.substring(0, 1000), // Limit size
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      };

      const logs = JSON.parse(storage.getItem(this.corruptionKey) || '[]');
      logs.push(corruptionLog);

      // Keep only last 10 corruption logs
      if (logs.length > 10) {
        logs.splice(0, logs.length - 10);
      }

      storage.setItem(this.corruptionKey, JSON.stringify(logs));
    } catch (logError) {
      console.error('Failed to log corruption:', logError);
    }
  }

  // Store data with all safety measures
  async setItem<T>(data: T): Promise<boolean> {
    const storage = safeLocalStorage();
    if (!storage) return false;

    let retries = 0;
    const maxRetries = this.config.maxRetries ?? 3;

    while (retries < maxRetries) {
      try {
        // Validate data if validator provided
        if (this.config.validator && !this.config.validator.validate(data)) {
          console.error('Data validation failed');
          return false;
        }

        // Create backup before overwriting
        this.createBackup(data);

        // Serialize and prepare data
        const serializedData = JSON.stringify(data);
        const checksum = this.calculateChecksum(serializedData);

        const metadata: StorageMetadata = {
          version: '1.0',
          timestamp: Date.now(),
          checksum,
          ...(this.config.compressionEnabled && { compressed: true }),
          ...(this.config.encryptionEnabled && { encrypted: true }),
          backupCount: this.getBackups().length,
        };

        // Process data
        let processedData = serializedData;
        processedData = this.compress(processedData);
        processedData = this.encrypt(processedData);

        // Store with metadata
        const storageItem = {
          metadata,
          data: processedData,
        };

        storage.setItem(this.config.key, JSON.stringify(storageItem));
        return true;
      } catch (error) {
        retries++;
        console.error(`Storage attempt ${retries} failed:`, error);

        if (retries >= maxRetries) {
          this.logCorruption(error as Error, JSON.stringify(data));
          return false;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay ?? 100));
      }
    }

    return false;
  }

  // Retrieve data with corruption detection
  async getItem<T>(): Promise<T | null> {
    const storage = safeLocalStorage();
    if (!storage) return null;

    try {
      const storageItemJson = storage.getItem(this.config.key);
      if (!storageItemJson) return null;

      const storageItem = JSON.parse(storageItemJson);
      const { metadata, data: processedData } = storageItem;

      // Validate metadata
      if (!metadata || !metadata.checksum || !metadata.timestamp) {
        console.error('Invalid storage metadata');
        return this.attemptRecovery<T>();
      }

      // Process data
      let data = processedData;
      data = this.decrypt(data);
      data = this.decompress(data);

      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(data);
      if (calculatedChecksum !== metadata.checksum) {
        console.error('Data corruption detected - checksum mismatch');
        return this.attemptRecovery<T>();
      }

      // Parse data
      const parsedData = JSON.parse(data);

      // Validate parsed data
      if (this.config.validator && !this.config.validator.validate(parsedData)) {
        console.error('Data validation failed after retrieval');
        return this.attemptRecovery<T>();
      }

      return parsedData;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return this.attemptRecovery<T>();
    }
  }

  // Attempt recovery from backup
  private attemptRecovery<T>(): T | null {
    console.log('Attempting data recovery from backup...');

    const backupData = this.restoreFromBackup();
    if (backupData) {
      console.log('Successfully recovered from backup');

      // Restore the backup data
      this.setItem(backupData).catch((error) => {
        console.error('Failed to restore backup data:', error);
      });

      return backupData as T;
    }

    console.log('No backup available, returning null');
    return null;
  }

  // Remove item and its backups
  async removeItem(): Promise<boolean> {
    const storage = safeLocalStorage();
    if (!storage) return false;

    try {
      storage.removeItem(this.config.key);
      storage.removeItem(this.backupKey);
      storage.removeItem(this.corruptionKey);
      return true;
    } catch (error) {
      console.error('Failed to remove storage item:', error);
      return false;
    }
  }

  // Get storage health information
  async getHealthInfo(): Promise<{
    isHealthy: boolean;
    hasBackup: boolean;
    corruptionCount: number;
    lastBackup?: number;
    size?: number;
  }> {
    const storage = safeLocalStorage();
    if (!storage) {
      return { isHealthy: false, hasBackup: false, corruptionCount: 0 };
    }

    try {
      const item = storage.getItem(this.config.key);
      const backups = this.getBackups();
      const corruptionLogs = JSON.parse(storage.getItem(this.corruptionKey) || '[]');

      let size = 0;
      if (item) {
        size = item.length;
      }

      return {
        isHealthy: !!item,
        hasBackup: backups.length > 0,
        corruptionCount: corruptionLogs.length,
        lastBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : undefined,
        size,
      };
    } catch (error) {
      console.error('Failed to get health info:', error);
      return { isHealthy: false, hasBackup: false, corruptionCount: 0 };
    }
  }

  // Clear all corruption logs
  clearCorruptionLogs(): void {
    const storage = safeLocalStorage();
    if (storage) {
      storage.removeItem(this.corruptionKey);
    }
  }
}

// Factory for creating resilient storage instances
export function createResilientStorage(config: StorageConfig): ResilientStorage {
  return ResilientStorage.getInstance(config);
}

// Pre-configured instances for common use cases
export const habitStorage = createResilientStorage({
  key: 'habit-store',
  backupEnabled: true,
  compressionEnabled: false,
  maxRetries: 3,
});

export const preferencesStorage = createResilientStorage({
  key: 'user-preferences',
  backupEnabled: true,
  compressionEnabled: false,
  maxRetries: 3,
});

export const analyticsStorage = createResilientStorage({
  key: 'analytics-data',
  backupEnabled: true,
  compressionEnabled: true, // Analytics can be large
  maxRetries: 3,
});
