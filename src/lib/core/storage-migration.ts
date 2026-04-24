/**
 * Enterprise-grade Storage Migration Engine
 * - Automatic schema versioning
 * - Safe data migration between versions
 * - Rollback capabilities
 * - Corruption detection and recovery
 */

import { safeLocalStorage } from '../utils/ssr-safe';
import { SchemaValidator } from './schema-validation';

export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  migration: (data: any) => Promise<any> | any;
  rollback?: (data: any) => Promise<any> | any;
  estimatedTime: number; // in milliseconds
  critical: boolean; // If true, migration cannot be skipped
}

export interface MigrationMetadata {
  currentVersion: string;
  appliedMigrations: string[];
  lastMigrationTime: number;
  totalMigrationTime: number;
  rollbackAvailable: boolean;
  corruptionDetected: boolean;
  migrationHistory: Array<{
    version: string;
    timestamp: number;
    duration: number;
    success: boolean;
    error?: string;
  }>;
}

export interface StorageMigrationConfig {
  storageKey: string;
  metadataKey: string;
  backupKey: string;
  enableBackups: boolean;
  enableRollback: boolean;
  maxBackupCount: number;
  migrationTimeout: number;
  retryAttempts: number;
}

export class StorageMigrationEngine {
  private config: StorageMigrationConfig;
  private migrations: Map<string, MigrationStep> = new Map();
  private validator: SchemaValidator;
  private isMigrating = false;

  constructor(config: Partial<StorageMigrationConfig> = {}, validator?: SchemaValidator) {
    this.config = {
      storageKey: 'app-data',
      metadataKey: 'migration-metadata',
      backupKey: 'migration-backup',
      enableBackups: true,
      enableRollback: true,
      maxBackupCount: 5,
      migrationTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      ...config,
    };

    this.validator = validator || new SchemaValidator('1.0');
  }

  // Register a migration step
  registerMigration(migration: MigrationStep): void {
    const key = `${migration.fromVersion}->${migration.toVersion}`;
    this.migrations.set(key, migration);
  }

  // Get current metadata
  private getMetadata(): MigrationMetadata {
    const storage = safeLocalStorage();
    if (!storage) {
      return this.getDefaultMetadata();
    }

    try {
      const metadataJson = storage.getItem(this.config.metadataKey);
      return metadataJson ? JSON.parse(metadataJson) : this.getDefaultMetadata();
    } catch (error) {
      console.error('Failed to read migration metadata:', error);
      return this.getDefaultMetadata();
    }
  }

  // Get default metadata
  private getDefaultMetadata(): MigrationMetadata {
    return {
      currentVersion: '1.0',
      appliedMigrations: [],
      lastMigrationTime: 0,
      totalMigrationTime: 0,
      rollbackAvailable: false,
      corruptionDetected: false,
      migrationHistory: [],
    };
  }

  // Save metadata
  private saveMetadata(metadata: MigrationMetadata): boolean {
    const storage = safeLocalStorage();
    if (!storage) return false;

    try {
      storage.setItem(this.config.metadataKey, JSON.stringify(metadata));
      return true;
    } catch (error) {
      console.error('Failed to save migration metadata:', error);
      return false;
    }
  }

  // Create backup before migration
  private async createBackup(data: any): Promise<boolean> {
    if (!this.config.enableBackups) return true;

    const storage = safeLocalStorage();
    if (!storage) return false;

    try {
      const backups = this.getBackups();
      const newBackup = {
        data,
        timestamp: Date.now(),
        version: this.getMetadata().currentVersion,
      };

      backups.push(newBackup);

      // Keep only recent backups
      if (backups.length > this.config.maxBackupCount) {
        backups.splice(0, backups.length - this.config.maxBackupCount);
      }

      storage.setItem(this.config.backupKey, JSON.stringify(backups));
      return true;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return false;
    }
  }

  // Get all backups
  private getBackups(): any[] {
    const storage = safeLocalStorage();
    if (!storage) return [];

    try {
      const backupsJson = storage.getItem(this.config.backupKey);
      return backupsJson ? JSON.parse(backupsJson) : [];
    } catch {
      return [];
    }
  }

  // Restore from backup
  private async restoreFromBackup(version?: string): Promise<any | null> {
    const backups = this.getBackups();
    if (backups.length === 0) return null;

    let targetBackup = backups[backups.length - 1]; // Latest backup

    if (version) {
      const versionedBackup = backups.find((b) => b.version === version);
      if (versionedBackup) {
        targetBackup = versionedBackup;
      }
    }

    return targetBackup.data;
  }

  // Detect data corruption
  private detectCorruption(data: any): boolean {
    try {
      // Basic corruption checks
      if (data === null || data === undefined) return true;
      if (typeof data !== 'object') return true;

      // Check for circular references
      const seen = new WeakSet();
      const checkCircular = (obj: any): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;
        if (seen.has(obj)) return true;
        seen.add(obj);

        for (const value of Object.values(obj)) {
          if (checkCircular(value)) return true;
        }
        return false;
      };

      return checkCircular(data);
    } catch {
      return true;
    }
  }

  // Perform migration from one version to another
  private async performMigration(
    data: any,
    migration: MigrationStep
  ): Promise<{ success: boolean; data: any; error?: string }> {
    const startTime = performance.now();

    try {
      // Timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Migration timeout')), this.config.migrationTimeout);
      });

      // Perform migration
      const migrationPromise = Promise.resolve(migration.migration(data));
      const migratedData = await Promise.race([migrationPromise, timeoutPromise]);

      // Validate migrated data
      const validation = await this.validator.validate(migratedData, migration.toVersion);

      if (!validation.isValid) {
        return {
          success: false,
          data,
          error: `Migration validation failed: ${validation.error?.message || 'Unknown error'}`,
        };
      }

      const duration = performance.now() - startTime;

      return {
        success: true,
        data: validation.data || migratedData,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        success: false,
        data,
        error: `Migration failed: ${error}`,
      };
    }
  }

  // Run migration chain
  async migrate(targetVersion: string): Promise<{
    success: boolean;
    currentVersion: string;
    migrationsApplied: string[];
    error?: string;
  }> {
    if (this.isMigrating) {
      return {
        success: false,
        currentVersion: this.getMetadata().currentVersion,
        migrationsApplied: [],
        error: 'Migration already in progress',
      };
    }

    this.isMigrating = true;
    const metadata = this.getMetadata();
    const currentVersion = metadata.currentVersion;

    if (currentVersion === targetVersion) {
      this.isMigrating = false;
      return {
        success: true,
        currentVersion,
        migrationsApplied: [],
      };
    }

    try {
      // Get current data
      const storage = safeLocalStorage();
      if (!storage) {
        throw new Error('Storage not available');
      }

      const rawData = storage.getItem(this.config.storageKey);
      let data = rawData ? JSON.parse(rawData) : {};

      // Check for corruption
      if (this.detectCorruption(data)) {
        metadata.corruptionDetected = true;
        this.saveMetadata(metadata);

        // Try to restore from backup
        const backupData = await this.restoreFromBackup();
        if (backupData) {
          data = backupData;
          console.log('Restored from backup due to corruption detection');
        } else {
          throw new Error('Data corruption detected and no backup available');
        }
      }

      // Create backup before migration
      await this.createBackup(data);

      // Find migration path
      const migrationPath = this.findMigrationPath(currentVersion, targetVersion);
      if (!migrationPath) {
        throw new Error(`No migration path from ${currentVersion} to ${targetVersion}`);
      }

      // Apply migrations sequentially
      let currentData = data;
      const appliedMigrations: string[] = [];
      const totalMigrationTime = 0;

      for (const migration of migrationPath) {
        console.log(`Applying migration: ${migration.fromVersion} -> ${migration.toVersion}`);

        const result = await this.performMigration(currentData, migration);

        if (!result.success) {
          // Migration failed, attempt rollback if available
          if (migration.rollback && this.config.enableRollback) {
            console.log('Migration failed, attempting rollback...');
            try {
              currentData = await migration.rollback(currentData);
              console.log('Rollback successful');
            } catch (rollbackError) {
              console.error('Rollback failed:', rollbackError);
            }
          }

          throw new Error(result.error || 'Migration failed');
        }

        currentData = result.data;
        appliedMigrations.push(`${migration.fromVersion}->${migration.toVersion}`);

        // Update metadata
        metadata.appliedMigrations.push(`${migration.fromVersion}->${migration.toVersion}`);
        metadata.currentVersion = migration.toVersion;
        metadata.lastMigrationTime = Date.now();

        // Save intermediate state
        storage.setItem(this.config.storageKey, JSON.stringify(currentData));
        this.saveMetadata(metadata);
      }

      // Migration completed successfully
      metadata.rollbackAvailable = this.config.enableRollback;
      metadata.corruptionDetected = false;
      this.saveMetadata(metadata);

      console.log(`Migration completed: ${currentVersion} -> ${targetVersion}`);

      return {
        success: true,
        currentVersion: targetVersion,
        migrationsApplied: appliedMigrations,
      };
    } catch (error) {
      console.error('Migration failed:', error);

      // Update metadata with error
      const metadata = this.getMetadata();
      metadata.migrationHistory.push({
        version: targetVersion,
        timestamp: Date.now(),
        duration: 0,
        success: false,
        error: String(error),
      });
      this.saveMetadata(metadata);

      return {
        success: false,
        currentVersion: metadata.currentVersion,
        migrationsApplied: [],
        error: String(error),
      };
    } finally {
      this.isMigrating = false;
    }
  }

  // Find migration path from current to target version
  private findMigrationPath(fromVersion: string, toVersion: string): MigrationStep[] {
    const path: MigrationStep[] = [];
    const visited = new Set<string>();

    const findPath = (current: string, target: string, currentPath: MigrationStep[]): boolean => {
      if (current === target) {
        path.push(...currentPath);
        return true;
      }

      if (visited.has(current)) return false;
      visited.add(current);

      // Find all migrations from current version
      for (const [key, migration] of this.migrations) {
        if (migration.fromVersion === current) {
          const newPath = [...currentPath, migration];
          if (findPath(migration.toVersion, target, newPath)) {
            return true;
          }
        }
      }

      return false;
    };

    findPath(fromVersion, toVersion, []);
    return path;
  }

  // Rollback to previous version
  async rollback(targetVersion: string): Promise<{
    success: boolean;
    currentVersion: string;
    error?: string;
  }> {
    const metadata = this.getMetadata();

    if (!metadata.rollbackAvailable) {
      return {
        success: false,
        currentVersion: metadata.currentVersion,
        error: 'Rollback not available',
      };
    }

    try {
      // Restore from backup
      const backupData = await this.restoreFromBackup(targetVersion);
      if (!backupData) {
        throw new Error('No backup available for rollback');
      }

      // Save restored data
      const storage = safeLocalStorage();
      if (!storage) {
        throw new Error('Storage not available');
      }

      storage.setItem(this.config.storageKey, JSON.stringify(backupData));

      // Update metadata
      metadata.currentVersion = targetVersion;
      metadata.rollbackAvailable = false;
      this.saveMetadata(metadata);

      console.log(`Rollback completed to version ${targetVersion}`);

      return {
        success: true,
        currentVersion: targetVersion,
      };
    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        currentVersion: metadata.currentVersion,
        error: String(error),
      };
    }
  }

  // Get migration status
  getStatus(): {
    currentVersion: string;
    availableMigrations: string[];
    rollbackAvailable: boolean;
    corruptionDetected: boolean;
    isMigrating: boolean;
  } {
    const metadata = this.getMetadata();

    return {
      currentVersion: metadata.currentVersion,
      availableMigrations: Array.from(this.migrations.keys()),
      rollbackAvailable: metadata.rollbackAvailable,
      corruptionDetected: metadata.corruptionDetected,
      isMigrating: this.isMigrating,
    };
  }

  // Clear all migration data
  clear(): boolean {
    const storage = safeLocalStorage();
    if (!storage) return false;

    try {
      storage.removeItem(this.config.storageKey);
      storage.removeItem(this.config.metadataKey);
      storage.removeItem(this.config.backupKey);
      return true;
    } catch (error) {
      console.error('Failed to clear migration data:', error);
      return false;
    }
  }
}

// Factory for creating migration engines
export function createStorageMigrationEngine(
  config?: Partial<StorageMigrationConfig>,
  validator?: SchemaValidator
): StorageMigrationEngine {
  return new StorageMigrationEngine(config, validator);
}

// Pre-configured migration engine for habits
export const habitMigrationEngine = createStorageMigrationEngine({
  storageKey: 'habit-store',
  metadataKey: 'habit-migration-metadata',
  backupKey: 'habit-migration-backup',
  enableBackups: true,
  enableRollback: true,
  maxBackupCount: 5,
});

// Pre-configured migration engine for preferences
export const preferencesMigrationEngine = createStorageMigrationEngine({
  storageKey: 'user-preferences',
  metadataKey: 'preferences-migration-metadata',
  backupKey: 'preferences-migration-backup',
  enableBackups: true,
  enableRollback: true,
  maxBackupCount: 3,
});
