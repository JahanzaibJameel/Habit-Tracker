/**
 * Storage system type definitions
 * Provides comprehensive interfaces for storage backends and migrations
 * 
 * @fileoverview Storage system types and interfaces
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { z } from 'zod';

/**
 * Available storage backends
 */
export type StorageBackend = 'localStorage' | 'sessionStorage' | 'indexedDB';

/**
 * Storage operation result with metadata
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
    backend: StorageBackend;
    key: string;
    size?: number; // in bytes
  };
}

/**
 * Migration function type for transforming data
 */
export type MigrationFunction<T> = (oldData: unknown, fromVersion: number, toVersion: number, context?: MigrationContext) => T;

/**
 * Migration context provides additional information during migration
 */
export interface MigrationContext {
  backend: StorageBackend;
  key: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Migration definition with metadata
 */
export interface Migration<T> {
  fromVersion: number;
  toVersion: number;
  migrate: MigrationFunction<T>;
  description: string;
  estimatedTime?: number; // in milliseconds
  critical?: boolean; // Critical migrations cannot be skipped
  rollback?: MigrationFunction<T>; // Optional rollback function
}

/**
 * Storage configuration options
 */
export interface StorageConfig {
  /**
   * Default backend to use
   */
  backend: StorageBackend;
  
  /**
   * Namespace prefix for all keys
   */
  namespace: string;
  
  /**
   * Default TTL for items in milliseconds (0 = no expiration)
   */
  defaultTtl?: number;
  
  /**
   * Maximum storage size in bytes (0 = unlimited)
   */
  maxSize?: number;
  
  /**
   * Enable compression for large items
   */
  compression?: boolean;
  
  /**
   * Compression threshold in bytes
   */
  compressionThreshold?: number;
  
  /**
   * Enable encryption for sensitive data
   */
  encryption?: boolean;
  
  /**
   * Encryption key (required if encryption enabled)
   */
  encryptionKey?: string;
  
  /**
   * Enable automatic cleanup of expired items
   */
  autoCleanup?: boolean;
  
  /**
   * Cleanup interval in milliseconds
   */
  cleanupInterval?: number;
  
  /**
   * Error handling strategy
   */
  errorHandling?: 'throw' | 'log' | 'silent';
  
  /**
   * Migration strategy
   */
  migrationStrategy?: 'auto' | 'manual' | 'prompt';
  
  /**
   * Enable cross-tab synchronization
   */
  crossTabSync?: boolean;
  
  /**
   * IndexedDB configuration
   */
  indexedDB?: {
    databaseName: string;
    version: number;
    storeName: string;
  };
}

/**
 * Storage item with metadata
 */
export interface StorageItem<T> {
  data: T;
  metadata: {
    version: number;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    size: number;
    checksum: string;
    encrypted?: boolean;
    compressed?: boolean;
  };
}

/**
 * Storage statistics
 */
export interface StorageStats {
  backend: StorageBackend;
  totalItems: number;
  totalSize: number; // in bytes
  usedQuota: number; // percentage
  oldestItem?: string;
  newestItem?: string;
  itemsByType: Record<string, number>;
  itemsByVersion: Record<number, number>;
  expiredItems: number;
  corruptedItems: number;
}

/**
 * Storage quota information
 */
export interface StorageQuota {
  used: number;
  available: number;
  total: number;
  percentage: number;
  backend: string;
}

/**
 * Storage event types
 */
export type StorageEventType = 'set' | 'remove' | 'clear' | 'migrate' | 'cleanup' | 'quota_exceeded';

/**
 * Storage event payload
 */
export interface StorageEvent<T = unknown> {
  type: StorageEventType;
  key: string;
  backend: StorageBackend;
  timestamp: string;
  data?: T;
  oldValue?: T;
  metadata?: StorageItem<T>['metadata'];
  error?: string;
}

/**
 * Storage event listener
 */
export type StorageEventListener<T = unknown> = (event: StorageEvent<T>) => void;

/**
 * Batch operation options
 */
export interface BatchOperation<T> {
  type: 'set' | 'remove' | 'clear';
  key?: string;
  data?: T;
  ttl?: number;
  options?: StorageOperationOptions;
}

/**
 * Storage operation options
 */
export interface StorageOperationOptions {
  ttl?: number;
  compress?: boolean;
  encrypt?: boolean;
  version?: number;
  skipValidation?: boolean;
  skipMigration?: boolean;
}

/**
 * Storage health check result
 */
export interface StorageHealthCheck {
  backend: StorageBackend;
  available: boolean;
  quota: StorageQuota;
  performance: {
    readTime: number;
    writeTime: number;
    averageTime: number;
  };
  integrity: {
    corruptedItems: number;
    totalItems: number;
    integrityScore: number; // 0-100
  };
  errors: string[];
  warnings: string[];
}

/**
 * Storage backup/restore options
 */
export interface BackupOptions {
  includeMetadata?: boolean;
  includeExpired?: boolean;
  compression?: boolean;
  encryption?: boolean;
  format?: 'json' | 'binary';
}

/**
 * Storage backup data
 */
export interface StorageBackup {
  version: string;
  timestamp: string;
  backend: StorageBackend;
  namespace: string;
  items: Array<{
    key: string;
    item: StorageItem<unknown>;
  }>;
  metadata: {
    totalItems: number;
    totalSize: number;
    checksum: string;
  };
}

/**
 * Schema validation for storage items
 */
export const StorageItemSchema = z.object({
  data: z.unknown(),
  metadata: z.object({
    version: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    expiresAt: z.string().datetime().optional(),
    size: z.number().nonnegative(),
    checksum: z.string(),
    encrypted: z.boolean().optional(),
    compressed: z.boolean().optional(),
  }),
});

/**
 * Schema validation for storage configuration
 */
export const StorageConfigSchema = z.object({
  backend: z.enum(['localStorage', 'sessionStorage', 'indexedDB']),
  namespace: z.string().min(1),
  defaultTtl: z.number().nonnegative().optional(),
  maxSize: z.number().nonnegative().optional(),
  compression: z.boolean().optional(),
  compressionThreshold: z.number().positive().optional(),
  encryption: z.boolean().optional(),
  encryptionKey: z.string().optional(),
  autoCleanup: z.boolean().optional(),
  cleanupInterval: z.number().positive().optional(),
  errorHandling: z.enum(['throw', 'log', 'silent']).optional(),
  migrationStrategy: z.enum(['auto', 'manual', 'prompt']).optional(),
  crossTabSync: z.boolean().optional(),
  indexedDB: z.object({
    databaseName: z.string(),
    version: z.number().positive(),
    storeName: z.string(),
  }).optional(),
});

/**
 * Type guards and utilities
 */
export function isStorageBackend(value: unknown): value is StorageBackend {
  return typeof value === 'string' && 
         ['localStorage', 'sessionStorage', 'indexedDB'].includes(value);
}

export function isValidStorageResult<T>(result: unknown): result is StorageResult<T> {
  return typeof result === 'object' && result !== null &&
         'success' in result && typeof (result as any).success === 'boolean';
}

export function isStorageEvent<T>(event: unknown): event is StorageEvent<T> {
  return typeof event === 'object' && event !== null &&
         'type' in event && 'key' in event && 'backend' in event &&
         'timestamp' in event;
}

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: Partial<StorageConfig> = {
  backend: 'localStorage',
  namespace: 'app',
  defaultTtl: 0, // No expiration by default
  maxSize: 0, // Unlimited by default
  compression: false,
  compressionThreshold: 1024, // Compress items larger than 1KB
  encryption: false,
  autoCleanup: true,
  cleanupInterval: 60000, // Clean up every minute
  errorHandling: 'log',
  migrationStrategy: 'auto',
  crossTabSync: true,
  indexedDB: {
    databaseName: 'AppStorage',
    version: 1,
    storeName: 'app_storage',
  },
};

/**
 * Storage error codes
 */
export enum StorageErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  BACKEND_UNAVAILABLE = 'BACKEND_UNAVAILABLE',
  INVALID_KEY = 'INVALID_KEY',
  INVALID_DATA = 'INVALID_DATA',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  CORRUPTION_DETECTED = 'CORRUPTION_DETECTED',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Storage priority levels for cleanup
 */
export enum StoragePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Storage item with priority
 */
export interface PriorityStorageItem<T> extends StorageItem<T> {
  priority: StoragePriority;
  accessCount: number;
  lastAccessedAt: string;
}

/**
 * LRU cache configuration
 */
export interface LRUCacheConfig {
  maxSize: number;
  maxAge: number;
  priority: boolean;
  statistics: boolean;
}

/**
 * Storage transaction options
 */
export interface StorageTransaction {
  id: string;
  operations: BatchOperation<unknown>[];
  rollback?: () => Promise<void>;
  commit?: () => Promise<void>;
  timestamp: string;
  timeout?: number;
}

/**
 * Storage lock for concurrent access control
 */
export interface StorageLock {
  key: string;
  owner: string;
  timestamp: string;
  timeout: number;
  acquired: boolean;
}

/**
 * Type exports
 */
export type { StorageItem as BaseStorageItem };
export type { StorageEvent as BaseStorageEvent };
export type { StorageConfig as BaseStorageConfig };
