/**
 * Runtime schema definitions with versioning support.
 * Provides single source of truth for all data shapes in the application.
 * 
 * @fileoverview Core schema definitions with versioning and migration support
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { z } from 'zod';

/**
 * Base schema with versioning metadata
 * All schemas should extend this to enable migration detection
 */
const BaseSchema = z.object({
  _version: z.number().default(1),
  _createdAt: z.string().datetime().optional(),
  _updatedAt: z.string().datetime().optional(),
});

/**
 * User entity schema with comprehensive validation
 * Represents user data throughout the application lifecycle
 */
export const UserSchema = BaseSchema.extend({
  _version: z.literal(1),
  id: z.string().uuid('Invalid user ID format'),
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  profile: z.object({
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    avatar: z.string().url('Invalid avatar URL').optional(),
    bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    language: z.string().length(2, 'Language must be 2-character ISO code').default('en'),
    timezone: z.string().min(1, 'Timezone is required').default('UTC'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sms: z.boolean().default(false),
    }).default({ email: true, push: true, sms: false }),
  }).default({ theme: 'auto', language: 'en', timezone: 'UTC', notifications: { email: true, push: true, sms: false } }),
  roles: z.array(z.enum(['user', 'admin', 'moderator'])).default(['user']),
  isActive: z.boolean().default(true),
  lastLoginAt: z.string().datetime().optional(),
});

/**
 * Application settings schema with device-specific configurations
 */
export const AppSettingsSchema = BaseSchema.extend({
  _version: z.literal(1),
  featureFlags: z.record(z.string(), z.boolean()).default({}),
  ui: z.object({
    density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
    animations: z.boolean().default(true),
    reducedMotion: z.boolean().default(false),
    highContrast: z.boolean().default(false),
  }).default({ density: 'comfortable', animations: true, reducedMotion: false, highContrast: false }),
  api: z.object({
    baseUrl: z.string().url('Invalid API base URL'),
    timeout: z.number().min(1000, 'Timeout must be at least 1 second').max(30000, 'Timeout cannot exceed 30 seconds'),
    retryAttempts: z.number().min(0, 'Retry attempts cannot be negative').max(5, 'Retry attempts cannot exceed 5'),
  }).default({ baseUrl: 'https://api.example.com', timeout: 10000, retryAttempts: 3 }),
  security: z.object({
    sessionTimeout: z.number().min(300, 'Session timeout must be at least 5 minutes').default(3600),
    requireMfa: z.boolean().default(false),
    allowedOrigins: z.array(z.string().url()).default([]),
  }).default({ sessionTimeout: 3600, requireMfa: false, allowedOrigins: [] }),
});

/**
 * Feature flags schema for dynamic feature toggling
 */
export const FeatureFlagsSchema = BaseSchema.extend({
  _version: z.literal(1),
  flags: z.record(z.string(), z.object({
    enabled: z.boolean(),
    rolloutPercentage: z.number().min(0).max(100).default(100),
    conditions: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).default({}),
  userSegments: z.array(z.string()).default([]),
});

/**
 * Habit tracking schema for the core application domain
 */
export const HabitSchema = BaseSchema.extend({
  _version: z.literal(1),
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1, 'Habit title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.enum(['health', 'productivity', 'learning', 'fitness', 'mindfulness', 'other']),
  frequency: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    value: z.number().min(1, 'Frequency value must be positive'),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  }),
  target: z.object({
    type: z.enum(['boolean', 'count', 'duration', 'custom']),
    value: z.number().min(0, 'Target value must be non-negative'),
    unit: z.string().optional(),
  }),
  streak: z.object({
    current: z.number().min(0).default(0),
    longest: z.number().min(0).default(0),
    lastCompletedAt: z.string().datetime().optional(),
  }).default({ current: 0, longest: 0 }),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Habit entry/check-in schema
 */
export const HabitEntrySchema = BaseSchema.extend({
  _version: z.literal(1),
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  userId: z.string().uuid(),
  value: z.number().min(0, 'Entry value must be non-negative'),
  completedAt: z.string().datetime(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * API response wrapper schema
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  meta: z.object({
    timestamp: z.string().datetime(),
    requestId: z.string().optional(),
    version: z.string().optional(),
  }).default({ timestamp: new Date().toISOString() }),
});

/**
 * Form input schemas for validation
 */
export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  rememberMe: z.boolean().default(false),
});

export const RegisterFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const HabitFormSchema = z.object({
  title: z.string().min(1, 'Habit title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.enum(['health', 'productivity', 'learning', 'fitness', 'mindfulness', 'other']),
  frequency: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    value: z.number().min(1, 'Frequency value must be positive'),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  }),
  target: z.object({
    type: z.enum(['boolean', 'count', 'duration', 'custom']),
    value: z.number().min(0, 'Target value must be non-negative'),
    unit: z.string().optional(),
  }),
});

/**
 * URL parameter schemas
 */
export const UrlParamsSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default(1),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default(20),
  sort: z.enum(['createdAt', 'updatedAt', 'title', 'streak']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  category: z.enum(['health', 'productivity', 'learning', 'fitness', 'mindfulness', 'other']).optional(),
  search: z.string().max(100, 'Search term too long').optional(),
});

/**
 * Type exports from schemas
 */
export type User = z.infer<typeof UserSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type HabitEntry = z.infer<typeof HabitEntrySchema>;
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & { data?: T };
export type LoginFormData = z.infer<typeof LoginFormSchema>;
export type RegisterFormData = z.infer<typeof RegisterFormSchema>;
export type HabitFormData = z.infer<typeof HabitFormSchema>;
export type UrlParams = z.infer<typeof UrlParamsSchema>;

/**
 * Schema registry for dynamic schema access
 */
export const SchemaRegistry = {
  User: UserSchema,
  AppSettings: AppSettingsSchema,
  FeatureFlags: FeatureFlagsSchema,
  Habit: HabitSchema,
  HabitEntry: HabitEntrySchema,
  ApiResponse: ApiResponseSchema,
  LoginForm: LoginFormSchema,
  RegisterForm: RegisterFormSchema,
  HabitForm: HabitFormSchema,
  UrlParams: UrlParamsSchema,
} as const;

/**
 * Schema version mapping for migration support
 */
export const SchemaVersions = {
  User: 1,
  AppSettings: 1,
  FeatureFlags: 1,
  Habit: 1,
  HabitEntry: 1,
} as const;

export type SchemaName = keyof typeof SchemaRegistry;
