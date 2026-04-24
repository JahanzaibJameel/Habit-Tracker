/**
 * Type-safe fetch wrapper with schema validation
 * Provides guaranteed data integrity for all API calls
 * 
 * @fileoverview Safe fetch implementation with Zod validation
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { z } from 'zod';
import { ValidationError, NetworkValidationError, ValidationErrorFactory, ValidationTimeoutError } from './errors';

/**
 * Configuration options for safe fetch operations
 */
export interface SafeFetchOptions extends RequestInit {
  /**
   * Timeout in milliseconds for the request
   */
  timeout?: number;
  
  /**
   * Number of retry attempts on failure
   */
  retryAttempts?: number;
  
  /**
   * Delay between retry attempts in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Whether to validate response status
   */
  validateStatus?: boolean;
  
  /**
   * Custom headers to include
   */
  headers?: Record<string, string>;
  
  /**
   * Request ID for tracking
   */
  requestId?: string;
  
  /**
   * Expected API version for version mismatch detection
   */
  apiVersion?: string;
  
  /**
   * Callback for API version mismatch handling
   */
  onVersionMismatch?: (expected: string, actual: string) => void | Promise<void>;
  
  /**
   * Whether to enable partial success handling
   */
  enablePartialSuccess?: boolean;
  
  /**
   * Custom version header name
   */
  versionHeader?: string;
}

/**
 * Default configuration for safe fetch
 */
const DEFAULT_CONFIG: Required<Omit<SafeFetchOptions, keyof RequestInit>> = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  validateStatus: true,
  requestId: '',
  apiVersion: '',
  enablePartialSuccess: false,
  versionHeader: 'X-API-Version',
  onVersionMismatch: async () => {},
};

/**
 * Validates HTTP response status
 */
function validateStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Creates a timeout promise for fetch operations
 */
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ValidationTimeoutError({
        operation: 'fetch',
        timeout,
      }));
    }, timeout);
  });
}

/**
 * Delays execution for retry attempts
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Fetches JSON from an endpoint and validates it against a Zod schema
 * Throws ValidationError if schema fails or network error occurs
 * 
 * @example
 * const user = await safeFetchJson('/api/user/1', UserSchema);
 * 
 * @param input - URL or Request object
 * @param schema - Zod schema to validate against
 * @param options - Fetch configuration options
 * @returns Validated and typed data
 */
export async function safeFetchJson<T extends z.ZodTypeAny>(
  input: RequestInfo,
  schema: T,
  options: SafeFetchOptions = {}
): Promise<z.infer<T>> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const requestId = config.requestId || generateRequestId();
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    try {
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers,
      };

      // Create fetch request with timeout
      const fetchPromise = fetch(input, {
        ...config,
        headers,
      });

      const response = await Promise.race([
        fetchPromise,
        createTimeoutPromise(config.timeout),
      ]) as Response;

      // Validate response status if enabled
      if (config.validateStatus && !validateStatus(response.status)) {
        throw ValidationErrorFactory.network({
          message: `HTTP ${response.status}: ${response.statusText}`,
          url: typeof input === 'string' ? input : input.url,
          status: response.status,
          statusText: response.statusText,
          requestId,
        });
      }

      // Check API version if configured
      if (config.apiVersion) {
        const actualVersion = response.headers.get(config.versionHeader);
        if (actualVersion && actualVersion !== config.apiVersion) {
          // Trigger version mismatch callback
          if (config.onVersionMismatch) {
            await config.onVersionMismatch(config.apiVersion, actualVersion);
          }
          
          // Log version mismatch for monitoring
          console.warn(`API version mismatch: expected ${config.apiVersion}, got ${actualVersion}`, {
            url: typeof input === 'string' ? input : input.url,
            requestId,
          });
        }
      }

      // Parse JSON response
      let data: unknown;
      try {
        data = await response.json();
      } catch (parseError) {
        throw ValidationErrorFactory.network({
          message: 'Failed to parse JSON response',
          url: typeof input === 'string' ? input : input.url,
          status: response.status,
          statusText: response.statusText,
          requestId,
        });
      }

      // Validate data against schema
      try {
        const validatedData = schema.parse(data);
        return validatedData as z.infer<T>;
      } catch (schemaError) {
        if (schemaError instanceof z.ZodError) {
          throw ValidationErrorFactory.fromZodError(schemaError, schema.constructor.name);
        }
        throw new ValidationError({
          message: 'Schema validation failed',
          code: 'SCHEMA_VALIDATION_ERROR',
          path: [],
          expected: schema.constructor.name,
          received: data,
          schema: schema.constructor.name,
          context: { schemaError: schemaError instanceof Error ? schemaError.message : 'Unknown schema error' },
        });
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on validation errors (4xx status codes or schema issues)
      if (error instanceof ValidationError || error instanceof NetworkValidationError) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === config.retryAttempts) {
        throw lastError;
      }
      
      // Wait before retrying
      await delay(config.retryDelay * (attempt + 1)); // Exponential backoff
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unknown error occurred during fetch');
}

/**
 * Interface for partial success responses
 */
export interface PartialSuccessResult<T> {
  valid: T[];
  invalid: ValidationError[];
  total: number;
  successRate: number;
}

/**
 * Fetches and validates an API response with partial success handling
 * Returns both valid and invalid items instead of failing the entire request
 * 
 * @example
 * const result = await safeFetchJsonPartial('/api/users', UserSchema, {
 *   enablePartialSuccess: true,
 *   apiVersion: 'v1'
 * });
 * console.log(`Valid: ${result.valid.length}, Invalid: ${result.invalid.length}`);
 */
export async function safeFetchJsonPartial<T extends z.ZodTypeAny>(
  input: RequestInfo,
  schema: T,
  options: SafeFetchOptions = {}
): Promise<PartialSuccessResult<z.infer<T>>> {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  if (!config.enablePartialSuccess) {
    throw new Error('enablePartialSuccess must be true for partial success handling');
  }

  // Use the existing fetch logic but handle validation differently
  const requestId = config.requestId || generateRequestId();
  
  try {
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };

    // Create fetch request with timeout
    const fetchPromise = fetch(input, {
      ...config,
      headers,
    });

    const response = await Promise.race([
      fetchPromise,
      createTimeoutPromise(config.timeout),
    ]) as Response;

    // Validate response status if enabled
    if (config.validateStatus && !validateStatus(response.status)) {
      throw ValidationErrorFactory.network({
        message: `HTTP ${response.status}: ${response.statusText}`,
        url: typeof input === 'string' ? input : input.url,
        status: response.status,
        statusText: response.statusText,
        requestId,
      });
    }

    // Check API version if configured
    if (config.apiVersion) {
      const actualVersion = response.headers.get(config.versionHeader);
      if (actualVersion && actualVersion !== config.apiVersion) {
        // Trigger version mismatch callback
        if (config.onVersionMismatch) {
          await config.onVersionMismatch(config.apiVersion, actualVersion);
        }
        
        console.warn(`API version mismatch: expected ${config.apiVersion}, got ${actualVersion}`, {
          url: typeof input === 'string' ? input : input.url,
          requestId,
        });
      }
    }

    // Parse JSON response
    let data: unknown;
    let parseError: Error | unknown;
    try {
      data = await response.json();
    } catch (error) {
      parseError = error;
      throw ValidationErrorFactory.network({
        message: 'Failed to parse JSON response',
        url: typeof input === 'string' ? input : input.url,
        status: response.status,
        statusText: response.statusText,
        requestId,
      });
    }

    // Handle partial success - expect array of items
    if (!Array.isArray(data)) {
      throw new ValidationError({
        message: 'Partial success handling requires an array response',
        code: 'PARTIAL_SUCCESS_ARRAY_REQUIRED',
        path: [],
        expected: 'array',
        received: typeof data,
        schema: 'array',
        context: { 
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
      });
    }

    // Validate each item individually
    const valid: any[] = [];
    const invalid: ValidationError[] = [];
    
    for (let i = 0; i < (data as any[]).length; i++) {
      try {
        const validatedItem = schema.parse((data as any[])[i]);
        valid.push(validatedItem as z.infer<T>);
      } catch (schemaError) {
        if (schemaError instanceof z.ZodError) {
          const validationError = ValidationErrorFactory.fromZodError(schemaError, schema.constructor.name);
          const updatedError = new ValidationError({
            ...validationError,
            path: [i.toString(), ...validationError.path], // Include array index
          });
          invalid.push(updatedError);
        } else {
          invalid.push(new ValidationError({
            message: 'Schema validation failed',
            code: 'SCHEMA_VALIDATION_ERROR',
            path: [i.toString()],
            expected: schema.constructor.name,
            received: (data as any[])[i],
            schema: schema.constructor.name,
            context: { schemaError: schemaError instanceof Error ? schemaError.message : 'Unknown schema error' },
          }));
        }
      }
    }

    const total = (data as any[]).length;
    const successRate = total > 0 ? valid.length / total : 0;

    return {
      valid,
      invalid,
      total,
      successRate,
    };

  } catch (error) {
    // For partial success, we want to wrap any network errors in a way that
    // the calling code can handle them appropriately
    if (error instanceof ValidationError || error instanceof NetworkValidationError) {
      throw error;
    }
    
    throw new ValidationError({
      message: 'Partial success fetch failed',
      code: 'PARTIAL_SUCCESS_FETCH_ERROR',
      path: [],
      expected: 'successful fetch',
      received: error instanceof Error ? error.message : 'Unknown error',
      schema: 'fetch',
      context: { originalError: error instanceof Error ? error.message : 'Unknown error' },
    });
  }
}

/**
 * Fetches and validates an API response wrapper
 * 
 * @param input - URL or Request object
 * @param dataSchema - Schema for the data field
 * @param options - Fetch configuration options
 * @returns Validated API response with typed data
 */
export async function safeFetchApiResponse<T extends z.ZodTypeAny>(
  input: RequestInfo,
  dataSchema: T,
  options: SafeFetchOptions = {}
): Promise<{ success: boolean; data?: z.infer<T>; error?: { code: string; message: string } }> {
  const response = await safeFetchJson(
    input,
    z.object({
      success: z.boolean(),
      data: dataSchema.optional(),
      error: z.object({
        code: z.string(),
        message: z.string(),
      }).optional(),
    }),
    options
  );

  // Fix exactOptionalPropertyTypes error by conditionally including data
  const result: any = {
    success: response.success,
  };
  
  if (response.data !== undefined) {
    result.data = response.data;
  }
  
  if (response.error) {
    result.error = response.error;
  }

  return result;
}

/**
 * Batch fetch multiple endpoints with schema validation
 * 
 * @param requests - Array of fetch requests with schemas
 * @param options - Common fetch options
 * @returns Array of validated responses
 */
export async function safeFetchBatch<T extends z.ZodTypeAny>(
  requests: Array<{
    input: RequestInfo;
    schema: T;
    options?: SafeFetchOptions;
  }>,
  options: SafeFetchOptions = {}
): Promise<Array<z.infer<T>>> {
  const promises = requests.map(async ({ input, schema, options: requestOptions }) => {
    return safeFetchJson(input, schema, { ...options, ...requestOptions });
  });

  try {
    return await Promise.all(promises);
  } catch (error) {
    // Re-throw the first error that occurred
    throw error;
  }
}

/**
 * Streaming fetch with incremental validation
 * Useful for large datasets or real-time data
 * 
 * @param input - URL or Request object
 * @param schema - Schema for individual items
 * @param options - Fetch configuration options
 * @returns Async generator of validated items
 */
export async function* safeFetchStream<T extends z.ZodTypeAny>(
  input: RequestInfo,
  schema: T,
  options: SafeFetchOptions = {}
): AsyncGenerator<z.infer<T>, void, unknown> {
  const config = { ...DEFAULT_CONFIG, ...options };
  const requestId = config.requestId || generateRequestId();
  
  try {
    const response = await Promise.race([
      fetch(input, config),
      createTimeoutPromise(config.timeout),
    ]) as Response;

    if (!response.ok) {
      throw ValidationErrorFactory.network({
        message: `HTTP ${response.status}: ${response.statusText}`,
        url: typeof input === 'string' ? input : input.url,
        status: response.status,
        statusText: response.statusText,
        requestId,
      });
    }

    if (!response.body) {
      throw new ValidationError({
        message: 'Response body is null',
        code: 'NULL_RESPONSE_BODY',
        path: [],
        expected: 'ReadableStream',
        received: 'null',
        schema: 'Stream',
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines (assuming newline-delimited JSON)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            const validatedData = schema.parse(data) as z.infer<T>;
            yield validatedData;
          } catch (error) {
            if (error instanceof z.ZodError) {
              throw ValidationErrorFactory.fromZodError(error, schema.constructor.name);
            }
            throw new ValidationError({
              message: 'Failed to parse stream data',
              code: 'STREAM_PARSE_ERROR',
              path: [],
              expected: 'Valid JSON',
              received: line,
              schema: schema.constructor.name,
              context: { line, error: error instanceof Error ? error.message : 'Unknown error' },
            });
          }
        }
      }
    }
    
    // Process any remaining buffer content
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        const validatedData = schema.parse(data) as z.infer<T>;
        yield validatedData;
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw ValidationErrorFactory.fromZodError(error, schema.constructor.name);
        }
        throw new ValidationError({
          message: 'Failed to parse final stream data',
          code: 'STREAM_PARSE_ERROR',
          path: [],
          expected: 'Valid JSON',
          received: buffer,
          schema: schema.constructor.name,
          context: { buffer, error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
    
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError({
      message: 'Stream fetch failed',
      code: 'STREAM_FETCH_ERROR',
      path: [],
      expected: 'Successful stream',
      received: error instanceof Error ? error.message : 'Unknown error',
      schema: 'Stream',
      context: { error: error instanceof Error ? error.message : 'Unknown error', requestId },
    });
  }
}

/**
 * Cache for validated responses to avoid redundant fetches
 */
class ResponseCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  
  /**
   * Gets cached response if valid
   */
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Sets cached response with TTL
   */
  set(key: string, data: unknown, ttl: number = 300000): void { // 5 minutes default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  /**
   * Clears cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Gets cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const responseCache = new ResponseCache();

/**
 * Fetch with caching support
 * 
 * @param input - URL or Request object
 * @param schema - Schema to validate against
 * @param options - Fetch configuration options
 * @param cacheTTL - Cache time-to-live in milliseconds
 * @returns Validated data from cache or network
 */
export async function safeFetchCached<T extends z.ZodTypeAny>(
  input: RequestInfo,
  schema: T,
  options: SafeFetchOptions = {},
  cacheTTL: number = 300000
): Promise<z.infer<T>> {
  const key = typeof input === 'string' ? input : input.url;
  
  // Check cache first
  const cached = responseCache.get(key);
  if (cached) {
    try {
      return schema.parse(cached) as z.infer<T>;
    } catch (error) {
      // Cache validation failed, remove and fetch fresh
      responseCache.clear();
    }
  }
  
  // Fetch fresh data
  const data = await safeFetchJson(input, schema, options);
  responseCache.set(key, data, cacheTTL);
  
  return data;
}
