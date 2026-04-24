/**
 * Enterprise-grade Schema Validation System
 * - Runtime validation pipeline
 * - Schema versioning and migration
 * - Graceful degradation for corrupted data
 * - Comprehensive error reporting
 */

import type { ZodError, ZodSchema } from 'zod';

export interface SchemaVersion {
  version: string;
  schema: ZodSchema<any>;
  migration?: (data: any) => any;
  deprecationDate?: Date;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: ZodError;
  fallbackData?: T;
  warnings: string[];
  version: string;
}

export interface ValidationConfig {
  enableStrictMode: boolean;
  enableFallbackData: boolean;
  enableWarnings: boolean;
  maxValidationTime: number;
  retryAttempts: number;
}

export class SchemaValidator<T = any> {
  private versions: Map<string, SchemaVersion> = new Map();
  private currentVersion: string;
  private config: ValidationConfig;
  private fallbackData?: T;
  private validationCache: Map<string, ValidationResult<T>> = new Map();

  constructor(currentVersion: string, config: Partial<ValidationConfig> = {}, fallbackData?: T) {
    this.currentVersion = currentVersion;
    this.fallbackData = fallbackData as T;
    this.config = {
      enableStrictMode: true,
      enableFallbackData: true,
      enableWarnings: true,
      maxValidationTime: 1000, // 1 second
      retryAttempts: 3,
      ...config,
    };
  }

  // Register a new schema version
  registerVersion(version: SchemaVersion): void {
    this.versions.set(version.version, version);
  }

  // Get current schema
  getCurrentSchema(): ZodSchema<T> | null {
    const version = this.versions.get(this.currentVersion);
    return version?.schema || null;
  }

  // Validate data with comprehensive error handling
  async validate(data: any, targetVersion?: string): Promise<ValidationResult<T>> {
    const version = targetVersion || this.currentVersion;
    const schemaVersion = this.versions.get(version);

    if (!schemaVersion) {
      return {
        isValid: false,
        warnings: [`Schema version ${version} not found`],
        version,
      };
    }

    // Check cache first
    const cacheKey = `${version}:${JSON.stringify(data)}`;
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const startTime = performance.now();
    let attempts = 0;
    const warnings: string[] = [];

    while (attempts < this.config.retryAttempts) {
      try {
        // Check validation timeout
        if (performance.now() - startTime > this.config.maxValidationTime) {
          warnings.push('Validation timeout exceeded');
          break;
        }

        // Apply migration if needed
        let processedData = data;
        if (schemaVersion.migration && typeof schemaVersion.migration === 'function') {
          try {
            processedData = schemaVersion.migration(data);
            warnings.push(`Data migrated from previous version`);
          } catch (migrationError) {
            warnings.push(`Migration failed: ${migrationError}`);
          }
        }

        // Validate with Zod
        const result = schemaVersion.schema.safeParse(processedData);

        if (result.success) {
          const validation: ValidationResult<T> = {
            isValid: true,
            data: result.data,
            warnings,
            version,
          };

          // Cache successful validation
          this.validationCache.set(cacheKey, validation);
          return validation;
        } else {
          // Handle validation errors
          if (this.config.enableFallbackData && this.fallbackData) {
            warnings.push('Using fallback data due to validation failure');
            const validation: ValidationResult<T> = {
              isValid: false,
              error: result.error,
              fallbackData: this.fallbackData,
              warnings,
              version,
            };
            return validation;
          }

          if (this.config.enableStrictMode) {
            const validation: ValidationResult<T> = {
              isValid: false,
              error: result.error,
              warnings,
              version,
            };
            return validation;
          } else {
            // In non-strict mode, try to fix common issues
            const fixedData = this.attemptDataFix(result.error, processedData);
            if (fixedData !== null) {
              warnings.push('Data automatically fixed in non-strict mode');
              const retryResult = schemaVersion.schema.safeParse(fixedData);
              if (retryResult.success) {
                const validation: ValidationResult<T> = {
                  isValid: true,
                  data: retryResult.data,
                  warnings,
                  version,
                };
                this.validationCache.set(cacheKey, validation);
                return validation;
              }
            }
          }
        }

        attempts++;
      } catch (error) {
        warnings.push(`Validation attempt ${attempts + 1} failed: ${error}`);
        attempts++;
      }
    }

    // All attempts failed
    const validation: ValidationResult<T> = {
      isValid: false,
      warnings: warnings.length > 0 ? warnings : ['All validation attempts failed'],
      version,
    };

    if (this.config.enableFallbackData && this.fallbackData) {
      validation.fallbackData = this.fallbackData;
    }

    return validation;
  }

  // Attempt to fix common data issues
  private attemptDataFix(error: ZodError<any>, data: any): any | null {
    try {
      const fixedData = { ...data };

      // Fix missing required fields with sensible defaults
      error.issues.forEach((err: any) => {
        if (err.code === 'invalid_type' && err.received === 'undefined') {
          const path = err.path.join('.');
          switch (err.expected) {
            case 'string':
              this.setNestedProperty(fixedData, path, '');
              break;
            case 'number':
              this.setNestedProperty(fixedData, path, 0);
              break;
            case 'boolean':
              this.setNestedProperty(fixedData, path, false);
              break;
            case 'array':
              this.setNestedProperty(fixedData, path, []);
              break;
            case 'object':
              this.setNestedProperty(fixedData, path, {});
              break;
          }
        }
      });

      return fixedData;
    } catch {
      return null;
    }
  }

  // Helper to set nested properties
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue;

      if (!(key in current) || typeof (current as any)[key] !== 'object') {
        (current as any)[key] = {};
      }
      current = (current as any)[key];
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  // Batch validation for arrays
  async validateBatch(dataArray: any[], targetVersion?: string): Promise<ValidationResult<T>[]> {
    const results: ValidationResult<T>[] = [];

    for (const data of dataArray) {
      const result = await this.validate(data, targetVersion);
      results.push(result);
    }

    return results;
  }

  // Get validation statistics
  getValidationStats(): {
    totalValidations: number;
    successRate: number;
    averageValidationTime: number;
    cacheHitRate: number;
  } {
    const validations = Array.from(this.validationCache.values());
    const successful = validations.filter((v) => v.isValid).length;
    const total = validations.length;

    return {
      totalValidations: total,
      successRate: total > 0 ? successful / total : 0,
      averageValidationTime: 0, // Could be implemented with timing
      cacheHitRate: 0, // Could be implemented with cache tracking
    };
  }

  // Clear validation cache
  clearCache(): void {
    this.validationCache.clear();
  }

  // Export schema registry
  exportRegistry(): Record<string, string> {
    const registry: Record<string, string> = {};
    this.versions.forEach((version, key) => {
      registry[key] = version.schema.toString();
    });
    return registry;
  }
}

// Global schema validation registry
export class SchemaValidationRegistry {
  private static instance: SchemaValidationRegistry;
  private validators: Map<string, SchemaValidator> = new Map();

  static getInstance(): SchemaValidationRegistry {
    if (!SchemaValidationRegistry.instance) {
      SchemaValidationRegistry.instance = new SchemaValidationRegistry();
    }
    return SchemaValidationRegistry.instance;
  }

  registerValidator(key: string, validator: SchemaValidator): void {
    this.validators.set(key, validator);
  }

  getValidator(key: string): SchemaValidator | undefined {
    return this.validators.get(key);
  }

  validateData<T>(key: string, data: any, targetVersion?: string): Promise<ValidationResult<T>> {
    const validator = this.validators.get(key);
    if (!validator) {
      return Promise.resolve({
        isValid: false,
        warnings: [`Validator for ${key} not found`],
        version: targetVersion || 'unknown',
      });
    }
    return validator.validate(data, targetVersion);
  }

  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.validators.forEach((validator, key) => {
      stats[key] = validator.getValidationStats();
    });
    return stats;
  }
}

// Factory functions for common validators
export function createHabitValidator(): SchemaValidator {
  const validator = new SchemaValidator(
    '1.0',
    {
      enableStrictMode: true,
      enableFallbackData: true,
      enableWarnings: true,
      maxValidationTime: 500,
      retryAttempts: 3,
    },
    {
      id: '',
      name: 'Default Habit',
      icon: 'default',
      color: '#000000',
      category: 'general',
      target: 1,
      unit: 'unit',
      frequency: 'daily',
      createdAt: new Date(),
      updatedAt: new Date(),
      position: 0,
      isPublic: false,
      tags: [],
    }
  );

  // Register current version
  validator.registerVersion({
    version: '1.0',
    schema: require('../../contracts/habit-schema').habitSchema,
  });

  return validator;
}

export function createPreferencesValidator(): SchemaValidator {
  const validator = new SchemaValidator(
    '1.0',
    {
      enableStrictMode: true,
      enableFallbackData: true,
      enableWarnings: true,
    },
    {
      theme: 'system',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        enabled: false,
        reminders: [],
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
      },
      privacy: {
        shareAnalytics: false,
        publicProfile: false,
        dataRetention: 365,
      },
      ui: {
        compactMode: false,
        showAnimations: true,
        defaultView: 'grid',
        heatmapEnabled: true,
      },
    }
  );

  validator.registerVersion({
    version: '1.0',
    schema: require('../../contracts/habit-schema').userPreferencesSchema,
  });

  return validator;
}

// Global instances
export const schemaRegistry = SchemaValidationRegistry.getInstance();
export const habitValidator = createHabitValidator();
export const preferencesValidator = createPreferencesValidator();

// Register validators
schemaRegistry.registerValidator('habit', habitValidator);
schemaRegistry.registerValidator('preferences', preferencesValidator);
