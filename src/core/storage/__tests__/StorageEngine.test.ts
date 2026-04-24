/**
 * Unit tests for Storage Engine
 * Tests storage adapters, migrations, and data integrity
 * 
 * @fileoverview Storage engine tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { z } from 'zod';
import { StorageEngine, createStorageEngine, StorageConfig, StorageBackend } from '../StorageEngine';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

// Setup mocks
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('StorageEngine', () => {
  let storageEngine: StorageEngine;
  let testSchema: z.ZodSchema;
  let testConfig: StorageConfig<any>;

  beforeEach(() => {
    // Clear all mocks
    localStorageMock.clear();
    sessionStorageMock.clear();
    jest.clearAllMocks();

    // Create test schema
    testSchema = z.object({
      _version: z.literal(1),
      _createdAt: z.string(),
      _updatedAt: z.string(),
      id: z.string(),
      name: z.string(),
      value: z.number(),
    });

    // Create test config
    testConfig = {
      backend: 'localStorage' as StorageBackend,
      keyPrefix: 'test',
      schema: testSchema,
      currentVersion: 1,
      migrations: [],
      defaultValue: {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'default',
        name: 'Default',
        value: 0,
      },
    };

    storageEngine = createStorageEngine(testConfig);
  });

  afterEach(() => {
    storageEngine.clear();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve data', async () => {
      const testData = {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'test-1',
        name: 'Test Item',
        value: 42,
      };

      const setResult = await storageEngine.set('test-key', testData);
      expect(setResult.success).toBe(true);
      expect(setResult.data).toEqual(testData);

      const getResult = await storageEngine.get('test-key');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testData);
    });

    test('should return default value for non-existent key', async () => {
      const result = await storageEngine.get('non-existent-key');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testConfig.defaultValue);
    });

    test('should remove data', async () => {
      const testData = {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'test-1',
        name: 'Test Item',
        value: 42,
      };

      await storageEngine.set('test-key', testData);
      await storageEngine.remove('test-key');

      const result = await storageEngine.get('test-key');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testConfig.defaultValue);
    });

    test('should clear all data', async () => {
      await storageEngine.set('key1', { ...testConfig.defaultValue, id: '1' });
      await storageEngine.set('key2', { ...testConfig.defaultValue, id: '2' });

      await storageEngine.clear();

      const result1 = await storageEngine.get('key1');
      const result2 = await storageEngine.get('key2');

      expect(result1.data).toEqual(testConfig.defaultValue);
      expect(result2.data).toEqual(testConfig.defaultValue);
    });
  });

  describe('Schema Validation', () => {
    test('should reject invalid data', async () => {
      const invalidData = {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'test-1',
        name: 'Test Item',
        // Missing required 'value' field
      };

      const result = await storageEngine.set('test-key', invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate data on retrieval', async () => {
      // Manually store invalid data
      localStorageMock.setItem('test:test-key', JSON.stringify({
        data: {
          _version: 1,
          _createdAt: new Date().toISOString(),
          _updatedAt: new Date().toISOString(),
          id: 'test-1',
          name: 'Test Item',
          // Missing 'value' field
        },
        version: 1,
        timestamp: new Date().toISOString(),
      }));

      const result = await storageEngine.get('test-key');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Migrations', () => {
    test('should migrate data from older version', async () => {
      // Create schema with migration
      const v2Schema = z.object({
        _version: z.literal(2),
        _createdAt: z.string(),
        _updatedAt: z.string(),
        id: z.string(),
        name: z.string(),
        value: z.number(),
        newValue: z.string().optional(), // New field in v2
      });

      const configWithMigration: StorageConfig<any> = {
        ...testConfig,
        schema: v2Schema,
        currentVersion: 2,
        migrations: [
          {
            fromVersion: 1,
            toVersion: 2,
            description: 'Add newValue field',
            migrate: (oldData: any) => ({
              ...oldData,
              _version: 2,
              _updatedAt: new Date().toISOString(),
              newValue: `migrated-${oldData.name}`,
            }),
          },
        ],
      };

      const migrationEngine = createStorageEngine(configWithMigration);

      // Store v1 data manually
      const v1Data = {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'test-1',
        name: 'Test Item',
        value: 42,
      };

      localStorageMock.setItem('test:test-key', JSON.stringify({
        data: v1Data,
        version: 1,
        timestamp: new Date().toISOString(),
      }));

      // Retrieve and migrate
      const result = await migrationEngine.get('test-key');
      expect(result.success).toBe(true);
      expect(result.data?._version).toBe(2);
      expect(result.data?.newValue).toBe('migrated-Test Item');
      expect(result.metadata?.migrated).toBe(true);
      expect(result.metadata?.fromVersion).toBe(1);
    });

    test('should handle migration failure gracefully', async () => {
      const configWithBadMigration: StorageConfig<any> = {
        ...testConfig,
        currentVersion: 2,
        migrations: [
          {
            fromVersion: 1,
            toVersion: 2,
            description: 'Bad migration',
            migrate: () => {
              throw new Error('Migration failed');
            },
          },
        ],
      };

      const badEngine = createStorageEngine(configWithBadMigration);

      // Store v1 data manually
      const v1Data = {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'test-1',
        name: 'Test Item',
        value: 42,
      };

      localStorageMock.setItem('test:test-key', JSON.stringify({
        data: v1Data,
        version: 1,
        timestamp: new Date().toISOString(),
      }));

      const result = await badEngine.get('test-key');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration from v1 to v2 failed');
    });
  });

  describe('SessionStorage Backend', () => {
    test('should work with sessionStorage', async () => {
      const sessionConfig = {
        ...testConfig,
        backend: 'sessionStorage' as StorageBackend,
        keyPrefix: 'session-test',
      };

      const sessionEngine = createStorageEngine(sessionConfig);
      const testData = { ...testConfig.defaultValue, id: 'session-test' };

      await sessionEngine.set('key', testData);
      const result = await sessionEngine.get('key');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(sessionStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle storage quota exceeded', async () => {
      // Mock QuotaExceededError
      const quotaError = new Error('Storage quota exceeded');
      quotaError.name = 'QuotaExceededError';
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw quotaError;
      });

      const testData = { ...testConfig.defaultValue, id: 'test' };
      const result = await storageEngine.set('test-key', testData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage quota exceeded');
    });

    test('should handle corrupted data', async () => {
      // Store corrupted JSON
      localStorageMock.setItem('test:test-key', 'invalid-json');

      const result = await storageEngine.get('test-key');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Deserialization failed');
    });

    test('should handle missing payload structure', async () => {
      // Store invalid payload
      localStorageMock.setItem('test:test-key', JSON.stringify({
        invalid: 'structure',
      }));

      const result = await storageEngine.get('test-key');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid storage payload structure');
    });
  });

  describe('Utility Methods', () => {
    test('should get storage keys', async () => {
      await storageEngine.set('key1', { ...testConfig.defaultValue, id: '1' });
      await storageEngine.set('key2', { ...testConfig.defaultValue, id: '2' });

      const keys = await storageEngine.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    test('should get storage size', async () => {
      await storageEngine.set('key1', { ...testConfig.defaultValue, id: '1' });
      await storageEngine.set('key2', { ...testConfig.defaultValue, id: '2' });

      const size = await storageEngine.getSize();
      expect(size.bytes).toBeGreaterThan(0);
      expect(size.entries).toBe(2);
    });

    test('should check storage availability', async () => {
      const isAvailable = await storageEngine.isAvailable();
      expect(isAvailable).toBe(true);
    });

    test('should export and import data', async () => {
      await storageEngine.set('key1', { ...testConfig.defaultValue, id: '1' });
      await storageEngine.set('key2', { ...testConfig.defaultValue, id: '2' });

      const exportData = await storageEngine.export();
      expect(exportData).toHaveProperty('key1');
      expect(exportData).toHaveProperty('key2');

      // Clear and import
      await storageEngine.clear();
      await storageEngine.import(exportData);

      const result1 = await storageEngine.get('key1');
      const result2 = await storageEngine.get('key2');

      expect(result1.data?.id).toBe('1');
      expect(result2.data?.id).toBe('2');
    });
  });

  describe('Data Serialization', () => {
    test('should properly serialize and deserialize data', async () => {
      const testData = {
        _version: 1,
        _createdAt: '2023-01-01T00:00:00.000Z',
        _updatedAt: '2023-01-01T00:00:00.000Z',
        id: 'test-1',
        name: 'Test Item',
        value: 42,
      };

      await storageEngine.set('test-key', testData);

      // Check the stored data structure
      const storedData = localStorageMock.getItem('test:test-key');
      expect(storedData).toBeDefined();

      const parsed = JSON.parse(storedData!);
      expect(parsed).toHaveProperty('data');
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.data).toEqual(testData);
      expect(parsed.version).toBe(1);
    });

    test('should handle special characters in data', async () => {
      const specialData = {
        _version: 1,
        _createdAt: new Date().toISOString(),
        _updatedAt: new Date().toISOString(),
        id: 'special-chars',
        name: 'Test Ñiño "quotes" & symbols',
        value: 42,
      };

      const setResult = await storageEngine.set('special', specialData);
      expect(setResult.success).toBe(true);

      const getResult = await storageEngine.get('special');
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(specialData);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent set operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const data = { ...testConfig.defaultValue, id: `concurrent-${i}` };
        promises.push(storageEngine.set(`key-${i}`, data));
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);

      // Verify all data was stored
      for (let i = 0; i < 10; i++) {
        const result = await storageEngine.get(`key-${i}`);
        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(`concurrent-${i}`);
      }
    });

    test('should handle concurrent get operations', async () => {
      // Pre-populate data
      await storageEngine.set('shared-key', { ...testConfig.defaultValue, id: 'shared' });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storageEngine.get('shared-key'));
      }

      const results = await Promise.all(promises);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.data?.id === 'shared')).toBe(true);
    });
  });
});
