/**
 * Unit tests for validation schemas
 * Tests schema validation, type inference, and edge cases
 * 
 * @fileoverview Schema validation tests
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { describe, test, expect } from '@jest/globals';
import { z } from 'zod';
import {
  BaseSchema,
  UserSchema,
  AppSettingsSchema,
  FeatureFlagsSchema,
  HabitSchema,
  HabitEntrySchema,
  ApiResponseSchema,
  FormInputSchema,
  UrlParamsSchema,
} from '../schemas';

describe('BaseSchema', () => {
  test('should validate base schema structure', () => {
    const validBase = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(BaseSchema.parse(validBase)).toEqual(validBase);
  });

  test('should reject invalid version', () => {
    const invalidBase = {
      _version: 2,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(() => BaseSchema.parse(invalidBase)).toThrow();
  });

  test('should reject missing required fields', () => {
    const incompleteBase = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
    };

    expect(() => BaseSchema.parse(incompleteBase)).toThrow();
  });

  test('should reject invalid date format', () => {
    const invalidDate = {
      _version: 1,
      _createdAt: 'invalid-date',
      _updatedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(() => BaseSchema.parse(invalidDate)).toThrow();
  });
});

describe('UserSchema', () => {
  test('should validate complete user object', () => {
    const validUser = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      preferences: {
        theme: 'dark' as const,
        language: 'en',
        timezone: 'UTC',
      },
    };

    expect(UserSchema.parse(validUser)).toEqual(validUser);
  });

  test('should accept user with minimal required fields', () => {
    const minimalUser = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    const result = UserSchema.parse(minimalUser);
    expect(result).toEqual(minimalUser);
    expect(result.preferences).toBeDefined();
  });

  test('should reject invalid email', () => {
    const invalidUser = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'invalid-email',
      name: 'Test User',
    };

    expect(() => UserSchema.parse(invalidUser)).toThrow();
  });

  test('should reject invalid theme', () => {
    const invalidUser = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      preferences: {
        theme: 'invalid' as any,
        language: 'en',
        timezone: 'UTC',
      },
    };

    expect(() => UserSchema.parse(invalidUser)).toThrow();
  });
});

describe('AppSettingsSchema', () => {
  test('should validate complete settings object', () => {
    const validSettings = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      featureFlags: {
        enableDarkMode: true,
        enableNotifications: false,
        enableBetaFeatures: true,
      },
      ui: {
        density: 'compact' as const,
        animations: true,
        reducedMotion: false,
        highContrast: false,
      },
      api: {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
        retryAttempts: 3,
      },
      security: {
        sessionTimeout: 3600,
        requireMfa: true,
        allowedOrigins: ['https://example.com'],
      },
    };

    expect(AppSettingsSchema.parse(validSettings)).toEqual(validSettings);
  });

  test('should accept settings with default values', () => {
    const minimalSettings = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = AppSettingsSchema.parse(minimalSettings);
    expect(result.featureFlags).toBeDefined();
    expect(result.ui).toBeDefined();
    expect(result.api).toBeDefined();
    expect(result.security).toBeDefined();
  });

  test('should reject invalid API timeout', () => {
    const invalidSettings = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      api: {
        baseUrl: 'https://api.example.com',
        timeout: -1000,
        retryAttempts: 3,
      },
    };

    expect(() => AppSettingsSchema.parse(invalidSettings)).toThrow();
  });

  test('should reject invalid density', () => {
    const invalidSettings = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      ui: {
        density: 'invalid' as any,
        animations: true,
        reducedMotion: false,
        highContrast: false,
      },
    };

    expect(() => AppSettingsSchema.parse(invalidSettings)).toThrow();
  });
});

describe('FeatureFlagsSchema', () => {
  test('should validate feature flags', () => {
    const validFlags = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      enableDarkMode: true,
      enableNotifications: false,
      enableBetaFeatures: true,
      enableAnalytics: true,
      enableDebugMode: false,
    };

    expect(FeatureFlagsSchema.parse(validFlags)).toEqual(validFlags);
  });

  test('should accept feature flags with defaults', () => {
    const minimalFlags = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = FeatureFlagsSchema.parse(minimalFlags);
    expect(typeof result.enableDarkMode).toBe('boolean');
    expect(typeof result.enableNotifications).toBe('boolean');
  });
});

describe('HabitSchema', () => {
  test('should validate complete habit object', () => {
    const validHabit = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'habit-123',
      userId: 'user-123',
      title: 'Exercise',
      description: 'Daily exercise routine',
      category: 'health' as const,
      frequency: {
        type: 'daily' as const,
        value: 1,
        daysOfWeek: [1, 2, 3, 4, 5],
      },
      target: {
        type: 'count' as const,
        value: 30,
        unit: 'minutes',
      },
      streak: {
        current: 5,
        longest: 10,
        lastCompletedAt: '2023-01-01T00:00:00.000Z',
      },
      isActive: true,
    };

    expect(HabitSchema.parse(validHabit)).toEqual(validHabit);
  });

  test('should accept habit with minimal required fields', () => {
    const minimalHabit = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'habit-123',
      userId: 'user-123',
      title: 'Exercise',
      category: 'other' as const,
      frequency: {
        type: 'daily' as const,
        value: 1,
      },
      target: {
        type: 'boolean' as const,
        value: 1,
      },
      streak: {
        current: 0,
        longest: 0,
      },
      isActive: true,
    };

    const result = HabitSchema.parse(minimalHabit);
    expect(result).toEqual(minimalHabit);
  });

  test('should reject invalid category', () => {
    const invalidHabit = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'habit-123',
      userId: 'user-123',
      title: 'Exercise',
      category: 'invalid' as any,
      frequency: {
        type: 'daily' as const,
        value: 1,
      },
      target: {
        type: 'boolean' as const,
        value: 1,
      },
      streak: {
        current: 0,
        longest: 0,
      },
      isActive: true,
    };

    expect(() => HabitSchema.parse(invalidHabit)).toThrow();
  });

  test('should reject invalid frequency type', () => {
    const invalidHabit = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'habit-123',
      userId: 'user-123',
      title: 'Exercise',
      category: 'health' as const,
      frequency: {
        type: 'invalid' as any,
        value: 1,
      },
      target: {
        type: 'boolean' as const,
        value: 1,
      },
      streak: {
        current: 0,
        longest: 0,
      },
      isActive: true,
    };

    expect(() => HabitSchema.parse(invalidHabit)).toThrow();
  });
});

describe('HabitEntrySchema', () => {
  test('should validate complete habit entry', () => {
    const validEntry = {
      _version: 1,
      id: 'entry-123',
      habitId: 'habit-123',
      userId: 'user-123',
      value: 30,
      completedAt: '2023-01-01T00:00:00.000Z',
      notes: 'Great workout!',
      metadata: {
        calories: 200,
        distance: 5000,
      },
    };

    expect(HabitEntrySchema.parse(validEntry)).toEqual(validEntry);
  });

  test('should accept entry with minimal required fields', () => {
    const minimalEntry = {
      _version: 1,
      id: 'entry-123',
      habitId: 'habit-123',
      userId: 'user-123',
      value: 1,
      completedAt: '2023-01-01T00:00:00.000Z',
    };

    const result = HabitEntrySchema.parse(minimalEntry);
    expect(result).toEqual(minimalEntry);
    expect(result.notes).toBeUndefined();
    expect(result.metadata).toBeUndefined();
  });

  test('should reject negative value', () => {
    const invalidEntry = {
      _version: 1,
      id: 'entry-123',
      habitId: 'habit-123',
      userId: 'user-123',
      value: -5,
      completedAt: '2023-01-01T00:00:00.000Z',
    };

    expect(() => HabitEntrySchema.parse(invalidEntry)).toThrow();
  });
});

describe('ApiResponseSchema', () => {
  test('should validate successful response', () => {
    const validResponse = {
      success: true,
      data: { id: '123', name: 'Test' },
      message: 'Success',
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect(ApiResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  test('should validate error response', () => {
    const errorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: { resourceId: '123' },
      },
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect(ApiResponseSchema.parse(errorResponse)).toEqual(errorResponse);
  });

  test('should reject response without success field', () => {
    const invalidResponse = {
      data: { id: '123', name: 'Test' },
      message: 'Success',
      timestamp: '2023-01-01T00:00:00.000Z',
    };

    expect(() => ApiResponseSchema.parse(invalidResponse)).toThrow();
  });
});

describe('FormInputSchema', () => {
  test('should validate text input', () => {
    const textInput = {
      type: 'text' as const,
      name: 'username',
      value: 'testuser',
      required: true,
      minLength: 3,
      maxLength: 20,
    };

    expect(FormInputSchema.parse(textInput)).toEqual(textInput);
  });

  test('should validate email input', () => {
    const emailInput = {
      type: 'email' as const,
      name: 'email',
      value: 'test@example.com',
      required: true,
    };

    expect(FormInputSchema.parse(emailInput)).toEqual(emailInput);
  });

  test('should validate checkbox input', () => {
    const checkboxInput = {
      type: 'checkbox' as const,
      name: 'agree',
      value: true,
      required: true,
    };

    expect(FormInputSchema.parse(checkboxInput)).toEqual(checkboxInput);
  });

  test('should reject invalid input type', () => {
    const invalidInput = {
      type: 'invalid' as any,
      name: 'test',
      value: 'test',
    };

    expect(() => FormInputSchema.parse(invalidInput)).toThrow();
  });
});

describe('UrlParamsSchema', () => {
  test('should validate complete URL parameters', () => {
    const validParams = {
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
      filter: 'active',
      search: 'test query',
    };

    expect(UrlParamsSchema.parse(validParams)).toEqual(validParams);
  });

  test('should accept parameters with defaults', () => {
    const minimalParams = {};
    const result = UrlParamsSchema.parse(minimalParams);
    
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sort).toBe('createdAt');
    expect(result.order).toBe('desc');
  });

  test('should reject invalid page number', () => {
    const invalidParams = {
      page: 0,
    };

    expect(() => UrlParamsSchema.parse(invalidParams)).toThrow();
  });

  test('should reject invalid order', () => {
    const invalidParams = {
      order: 'invalid',
    };

    expect(() => UrlParamsSchema.parse(invalidParams)).toThrow();
  });
});

describe('Schema Type Inference', () => {
  test('should correctly infer types from schemas', () => {
    // Test that TypeScript correctly infers types
    const user: z.infer<typeof UserSchema> = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
  });

  test('should provide type safety for nested objects', () => {
    const settings: z.infer<typeof AppSettingsSchema> = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
    };

    // TypeScript should infer these types correctly
    expect(typeof settings.featureFlags.enableDarkMode).toBe('boolean');
    expect(typeof settings.ui.density).toBe('string');
    expect(typeof settings.api.timeout).toBe('number');
  });
});

describe('Schema Edge Cases', () => {
  test('should handle empty strings', () => {
    const userWithEmptyName = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'test@example.com',
      name: '',
    };

    expect(UserSchema.parse(userWithEmptyName)).toEqual(userWithEmptyName);
  });

  test('should handle maximum values', () => {
    const maxParams = {
      page: Number.MAX_SAFE_INTEGER,
      limit: 100,
      sort: 'createdAt',
      order: 'desc' as const,
    };

    expect(UrlParamsSchema.parse(maxParams)).toEqual(maxParams);
  });

  test('should handle special characters in strings', () => {
    const userWithSpecialChars = {
      _version: 1,
      _createdAt: '2023-01-01T00:00:00.000Z',
      _updatedAt: '2023-01-01T00:00:00.000Z',
      id: 'user-123',
      email: 'test+tag@example.com',
      name: 'Test User Ñiño',
    };

    expect(UserSchema.parse(userWithSpecialChars)).toEqual(userWithSpecialChars);
  });
});
