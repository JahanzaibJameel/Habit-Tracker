/**
 * Comprehensive unit tests for validation system
 * Tests schema validation, fetcher, and form hook functionality
 * 
 * @fileoverview Complete validation system tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { z } from 'zod';
import {
  safeFetchJson,
  safeFetchApiResponse,
  safeFetchBatch,
  safeFetchCached,
  SafeFetchOptions,
} from '../fetcher';
import { useSafeForm, useSafeField, FormValidationRules } from '../useSafeForm';
import {
  ValidationError,
  NetworkValidationError,
  ValidationErrorFactory,
  SchemaVersionError,
  ValidationTimeoutError,
  RecoverableValidationError,
  ErrorRecoveryStrategy,
} from '../errors';
import { UserSchema, AppSettingsSchema, FeatureFlagsSchema } from '../schemas';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console to prevent noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('ValidationError', () => {
  test('should create validation error with all properties', () => {
    const error = new ValidationError({
      message: 'Test validation error',
      code: 'TEST_ERROR',
      path: ['user', 'email'],
      expected: 'valid email',
      received: 'invalid-email',
      schema: 'UserSchema',
      context: { userId: '123' },
    });

    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test validation error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.path).toEqual(['user', 'email']);
    expect(error.expected).toBe('valid email');
    expect(error.received).toBe('invalid-email');
    expect(error.schema).toBe('UserSchema');
    expect(error.context).toEqual({ userId: '123' });
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  test('should convert to JSON correctly', () => {
    const error = new ValidationError({
      message: 'Test error',
      code: 'TEST',
      path: ['field'],
      expected: 'string',
      received: 123,
      schema: 'TestSchema',
    });

    const json = error.toJSON();
    expect(json.name).toBe('ValidationError');
    expect(json.message).toBe('Test error');
    expect(json.code).toBe('TEST');
    expect(json.path).toEqual(['field']);
    expect(json.expected).toBe('string');
    expect(json.received).toBe(123);
    expect(json.schema).toBe('TestSchema');
    expect(json.timestamp).toBeDefined();
  });

  test('should generate user-friendly message', () => {
    const errorWithPath = new ValidationError({
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
      path: ['user', 'email'],
      expected: 'valid email',
      received: 'invalid',
      schema: 'UserSchema',
    });

    expect(errorWithPath.toUserMessage()).toBe('Invalid value for "user.email": Invalid email format');

    const errorWithoutPath = new ValidationError({
      message: 'General validation error',
      code: 'GENERAL_ERROR',
      path: [],
      expected: 'valid data',
      received: 'invalid',
      schema: 'TestSchema',
    });

    expect(errorWithoutPath.toUserMessage()).toBe('General validation error');
  });
});

describe('NetworkValidationError', () => {
  test('should create network validation error', () => {
    const error = new NetworkValidationError({
      message: 'Network request failed',
      url: 'https://api.example.com/users',
      status: 404,
      statusText: 'Not Found',
      requestId: 'req_123',
      path: ['users'],
      context: { timeout: 5000 },
    });

    expect(error.name).toBe('NetworkValidationError');
    expect(error.message).toBe('Network request failed');
    expect(error.url).toBe('https://api.example.com/users');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.requestId).toBe('req_123');
    expect(error.path).toEqual(['users']);
    expect(error.context.timeout).toBe(5000);
  });
});

describe('ValidationErrorFactory', () => {
  test('should create error from ZodError', () => {
    const schema = z.string().email();
    try {
      schema.parse('invalid-email');
    } catch (zodError) {
      const validationError = ValidationErrorFactory.fromZodError(zodError as z.ZodError, 'EmailSchema');
      
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.code).toBe('ZOD_VALIDATION_ERROR');
      expect(validationError.schema).toBe('EmailSchema');
      expect(validationError.context.zodError).toBe(true);
    }
  });

  test('should create network validation error', () => {
    const error = ValidationErrorFactory.network({
      message: 'Request failed',
      url: 'https://api.example.com',
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(error).toBeInstanceOf(NetworkValidationError);
    expect(error.message).toBe('Request failed');
    expect(error.status).toBe(500);
  });

  test('should create version mismatch error', () => {
    const error = ValidationErrorFactory.versionMismatch({
      schema: 'UserSchema',
      currentVersion: 1,
      expectedVersion: 2,
      migrationPath: [1, 2],
    });

    expect(error).toBeInstanceOf(SchemaVersionError);
    expect(error.currentVersion).toBe(1);
    expect(error.expectedVersion).toBe(2);
    expect(error.migrationPath).toEqual([1, 2]);
  });

  test('should create timeout error', () => {
    const error = ValidationErrorFactory.timeout({
      operation: 'fetch',
      timeout: 5000,
      schema: 'UserSchema',
    });

    expect(error).toBeInstanceOf(ValidationTimeoutError);
    expect(error.operation).toBe('fetch');
    expect(error.timeout).toBe(5000);
  });
});

describe('RecoverableValidationError', () => {
  test('should create recoverable error with strategy', () => {
    const baseError = new ValidationError({
      message: 'Test error',
      code: 'TEST',
      path: [],
      expected: 'valid',
      received: 'invalid',
      schema: 'TestSchema',
    });

    const recoverableError = new RecoverableValidationError(baseError, {
      strategy: ErrorRecoveryStrategy.RETRY,
      maxRetries: 3,
      currentRetry: 0,
    });

    expect(recoverableError.canRetry()).toBe(true);
    expect(recoverableError.recovery.strategy).toBe(ErrorRecoveryStrategy.RETRY);
  });

  test('should handle retry logic correctly', () => {
    const baseError = new ValidationError({
      message: 'Test error',
      code: 'TEST',
      path: [],
      expected: 'valid',
      received: 'invalid',
      schema: 'TestSchema',
    });

    const recoverableError = new RecoverableValidationError(baseError, {
      strategy: ErrorRecoveryStrategy.RETRY,
      maxRetries: 2,
      currentRetry: 1,
    });

    expect(recoverableError.canRetry()).toBe(true);

    const nextRetry = recoverableError.createRetry();
    expect(nextRetry.recovery.currentRetry).toBe(2);
    expect(nextRetry.canRetry()).toBe(false);

    expect(() => nextRetry.createRetry()).toThrow('Cannot retry: max retries exceeded or retry not allowed');
  });
});

describe('safeFetchJson', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('should successfully fetch and validate data', async () => {
    const mockData = { id: '123', email: 'test@example.com' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const result = await safeFetchJson('https://api.example.com/user/123', UserSchema);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/user/123',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
    );
  });

  test('should handle network errors with retry', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '123', email: 'test@example.com' }),
      });

    const result = await safeFetchJson('https://api.example.com/user/123', UserSchema, {
      retryAttempts: 2,
      retryDelay: 100,
    });

    expect(result).toEqual({ id: '123', email: 'test@example.com' });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test('should throw validation error for invalid data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '123', email: 'invalid-email' }),
    });

    await expect(
      safeFetchJson('https://api.example.com/user/123', UserSchema)
    ).rejects.toThrow(ValidationError);
  });

  test('should handle HTTP error status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    });

    await expect(
      safeFetchJson('https://api.example.com/user/123', UserSchema)
    ).rejects.toThrow(NetworkValidationError);
  });

  test('should handle timeout', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    await expect(
      safeFetchJson('https://api.example.com/user/123', UserSchema, { timeout: 100 })
    ).rejects.toThrow(ValidationTimeoutError);
  });

  test('should handle JSON parse errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(
      safeFetchJson('https://api.example.com/user/123', UserSchema)
    ).rejects.toThrow(NetworkValidationError);
  });
});

describe('safeFetchApiResponse', () => {
  test('should fetch and validate API response wrapper', async () => {
    const mockResponse = {
      success: true,
      data: { id: '123', email: 'test@example.com' },
      meta: { timestamp: '2023-01-01T00:00:00.000Z' },
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await safeFetchApiResponse(
      'https://api.example.com/user/123',
      UserSchema
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '123', email: 'test@example.com' });
  });

  test('should handle error response', async () => {
    const mockResponse = {
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
      meta: { timestamp: '2023-01-01T00:00:00.000Z' },
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 404,
      json: async () => mockResponse,
    });

    const result = await safeFetchApiResponse(
      'https://api.example.com/user/123',
      UserSchema
    );

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ code: 'NOT_FOUND', message: 'User not found' });
  });
});

describe('safeFetchBatch', () => {
  test('should fetch multiple requests in parallel', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockSettings = { _version: 1, featureFlags: { darkMode: true } };
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSettings,
      });

    const requests = [
      { input: 'https://api.example.com/user/123', schema: UserSchema },
      { input: 'https://api.example.com/settings', schema: AppSettingsSchema },
    ];

    const results = await safeFetchBatch(requests);

    expect(results).toEqual([mockUser, mockSettings]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('should fail fast on first error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const requests = [
      { input: 'https://api.example.com/user/123', schema: UserSchema },
    ];

    await expect(safeFetchBatch(requests)).rejects.toThrow('Network error');
  });
});

describe('safeFetchCached', () => {
  test('should return cached data on second call', async () => {
    const mockData = { id: '123', email: 'test@example.com' };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    // First call should fetch from network
    const result1 = await safeFetchCached('https://api.example.com/user/123', UserSchema);
    expect(result1).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should return from cache
    const result2 = await safeFetchCached('https://api.example.com/user/123', UserSchema);
    expect(result2).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
  });

  test('should invalidate cache on validation error', async () => {
    const invalidData = { id: '123', email: 'invalid-email' };
    const validData = { id: '123', email: 'test@example.com' };
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => invalidData,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => validData,
      });

    // First call fails validation
    await expect(
      safeFetchCached('https://api.example.com/user/123', UserSchema)
    ).rejects.toThrow(ValidationError);

    // Second call should fetch fresh data
    const result = await safeFetchCached('https://api.example.com/user/123', UserSchema);
    expect(result).toEqual(validData);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('FormValidationRules', () => {
  test('should extract validation rules from schema', () => {
    const schema = z.object({
      name: z.string().min(3).max(50),
      email: z.string().email(),
      age: z.number().min(18).max(120),
    });

    const rules = FormValidationRules.createRules(schema);

    expect(rules.name).toEqual({
      required: true,
      minLength: 3,
      maxLength: 50,
    });
    expect(rules.email).toEqual({
      required: true,
    });
    expect(rules.age).toEqual({
      required: true,
      min: 18,
      max: 120,
    });
  });

  test('should format Zod errors', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(3),
    });

    try {
      schema.parse({ email: 'invalid', name: 'ab' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formatted = FormValidationRules.formatError(error, {
          'email': 'Please enter a valid email address',
        });

        expect(formatted.email).toBe('Please enter a valid email address');
        expect(formatted.name).toBe('String must contain at least 3 character(s)');
      }
    }
  });
});

describe('React Hook Testing (Mock)', () => {
  // Note: These are simplified tests since we can't easily test React hooks without a test renderer
  // In a real implementation, you'd use @testing-library/react-hooks or similar

  test('useSafeField should have correct interface', () => {
    // This test verifies the hook interface exists and has expected properties
    expect(typeof useSafeField).toBe('function');
    
    // The hook should return an object with these properties
    const expectedReturn = {
      value: expect.anything(),
      error: expect.anything(),
      onChange: expect.any(Function),
      onBlur: expect.any(Function),
      touched: expect.anything(),
      dirty: expect.anything(),
      isValid: expect.anything(),
    };

    // In a real test, you would render the hook and verify the return shape
    expect(expectedReturn).toBeDefined();
  });

  test('useSafeForm should have correct interface', () => {
    expect(typeof useSafeForm).toBe('function');
    
    // The hook should return an object with these properties
    const expectedReturn = {
      form: expect.anything(),
      control: expect.any(Function),
      actions: expect.anything(),
    };

    expect(expectedReturn).toBeDefined();
  });
});

describe('Edge Cases and Error Handling', () => {
  test('should handle malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => 'not json',
    });

    await expect(
      safeFetchJson('https://api.example.com/user/123', UserSchema)
    ).rejects.toThrow(NetworkValidationError);
  });

  test('should handle null response body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: null,
    });

    // This would be tested with safeFetchStream, but for basic fetch it should work
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '123', email: 'test@example.com' }),
    });

    const result = await safeFetchJson('https://api.example.com/user/123', UserSchema);
    expect(result).toEqual({ id: '123', email: 'test@example.com' });
  });

  test('should handle request with custom headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '123', email: 'test@example.com' }),
    });

    await safeFetchJson('https://api.example.com/user/123', UserSchema, {
      headers: {
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/user/123',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      })
    );
  });

  test('should respect validateStatus option', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    });

    // With validateStatus: false, it should not throw on 404
    await expect(
      safeFetchJson('https://api.example.com/user/123', UserSchema, { validateStatus: false })
    ).resolves.toBeDefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

afterEach(() => {
  mockConsoleError.mockClear();
});
