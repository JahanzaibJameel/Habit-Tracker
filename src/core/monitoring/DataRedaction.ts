/**
 * Data redaction utilities for sensitive information protection
 * Removes or masks sensitive data before sending to monitoring services
 * 
 * @fileoverview Data redaction and PII protection for monitoring
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

/**
 * Redaction rule configuration
 */
export interface RedactionRule {
  /**
   * Pattern to match (string or RegExp)
   */
  pattern: string | RegExp;
  
  /**
   * Replacement value
   */
  replacement: string;
  
  /**
   * Rule description
   */
  description: string;
  
  /**
   * Whether to apply recursively to nested objects
   */
  recursive?: boolean;
  
  /**
   * Field names to apply this rule to (optional)
   */
  fields?: string[];
}

/**
 * Redaction configuration
 */
export interface RedactionConfig {
  /**
   * Enable/disable redaction
   */
  enabled: boolean;
  
  /**
   * Custom redaction rules
   */
  rules: RedactionRule[];
  
  /**
   * Default replacement for unknown sensitive data
   */
  defaultReplacement: string;
  
  /**
   * Fields to always redact
   */
  sensitiveFields: string[];
  
  /**
   * Maximum string length before truncation
   */
  maxStringLength: number;
  
  /**
   * Whether to truncate long strings
   */
  truncateLongStrings: boolean;
}

/**
 * Redaction result
 */
export interface RedactionResult {
  /**
   * Redacted data
   */
  data: unknown;
  
  /**
   * Number of redactions performed
   */
  redactionCount: number;
  
  /**
   * List of applied rules
   */
  appliedRules: string[];
  
  /**
   * Whether any data was modified
   */
  modified: boolean;
}

/**
 * Default redaction rules for common sensitive data
 */
export const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  // Email addresses
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
    description: 'Email addresses',
    recursive: true,
  },
  
  // Phone numbers (various formats)
  {
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    replacement: '[REDACTED_PHONE]',
    description: 'Phone numbers',
    recursive: true,
  },
  
  // Social Security Numbers
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
    description: 'Social Security Numbers',
    recursive: true,
  },
  
  // Credit card numbers
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_CARD]',
    description: 'Credit card numbers',
    recursive: true,
  },
  
  // API keys and tokens
  {
    pattern: /\b[A-Za-z0-9]{20,}\b/g,
    replacement: '[REDACTED_TOKEN]',
    description: 'API keys and tokens',
    fields: ['token', 'apiKey', 'api_key', 'secret', 'password', 'key'],
  },
  
  // URLs with potential sensitive parameters
  {
    pattern: /\bhttps?:\/\/[^\s]*\?(?:token|key|password|secret)=[^\s&]+/gi,
    replacement: '[REDACTED_URL]',
    description: 'URLs with sensitive parameters',
    recursive: true,
  },
  
  // IP addresses
  {
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[REDACTED_IP]',
    description: 'IP addresses',
    recursive: true,
  },
  
  // JWT tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    replacement: '[REDACTED_JWT]',
    description: 'JWT tokens',
    recursive: true,
  },
];

/**
 * Default sensitive field names
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'sessionId',
  'userId',
  'email',
  'phone',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
  'cvv',
  'expiry',
  'accountNumber',
  'routingNumber',
  'bankAccount',
  'pin',
  'passphrase',
  'privateKey',
  'publicKey',
  'certificate',
  'fingerprint',
  'biometric',
  'hash',
  'salt',
  'nonce',
];

/**
 * Data redactor class
 * 
 * @example
 * const redactor = new DataRedactor({
 *   enabled: true,
 *   rules: DEFAULT_REDACTION_RULES,
 *   sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
 * });
 * 
 * const result = redactor.redact(userData);
 */
export class DataRedactor {
  private config: RedactionConfig;

  constructor(config: Partial<RedactionConfig> = {}) {
    this.config = {
      enabled: true,
      rules: DEFAULT_REDACTION_RULES,
      defaultReplacement: '[REDACTED]',
      sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
      maxStringLength: 1000,
      truncateLongStrings: true,
      ...config,
    };
  }

  /**
   * Redact sensitive data from an object
   */
  redact(data: unknown): RedactionResult {
    if (!this.config.enabled) {
      return {
        data,
        redactionCount: 0,
        appliedRules: [],
        modified: false,
      };
    }

    const result = this.redactValue(data, '');
    return {
      data: result.value,
      redactionCount: result.count,
      appliedRules: result.rules,
      modified: result.count > 0,
    };
  }

  /**
   * Redact a specific string value
   */
  redactString(value: string, context: string = ''): string {
    if (!this.config.enabled || typeof value !== 'string') {
      return value;
    }

    let result = value;
    let redactionCount = 0;
    const appliedRules: string[] = [];

    // Apply each rule
    for (const rule of this.config.rules) {
      const shouldApply = !rule.fields || this.shouldApplyRule(rule, context);
      
      if (shouldApply) {
        const before = result;
        result = result.replace(rule.pattern, rule.replacement);
        
        if (result !== before) {
          redactionCount++;
          appliedRules.push(rule.description);
        }
      }
    }

    return result;
  }

  /**
   * Add a custom redaction rule
   */
  addRule(rule: RedactionRule): void {
    this.config.rules.push(rule);
  }

  /**
   * Remove a redaction rule by description
   */
  removeRule(description: string): boolean {
    const index = this.config.rules.findIndex(rule => rule.description === description);
    if (index > -1) {
      this.config.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get current configuration
   */
  getConfig(): RedactionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RedactionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a field is sensitive
   */
  isSensitiveField(fieldName: string): boolean {
    return this.config.sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Get redaction statistics
   */
  getStats(): {
    totalRules: number;
    sensitiveFields: number;
    enabled: boolean;
  } {
    return {
      totalRules: this.config.rules.length,
      sensitiveFields: this.config.sensitiveFields.length,
      enabled: this.config.enabled,
    };
  }

  /**
   * Recursively redact values in an object
   */
  private redactValue(value: unknown, context: string): {
    value: unknown;
    count: number;
    rules: string[];
  } {
    let totalCount = 0;
    const allAppliedRules: string[] = [];

    if (value === null || value === undefined) {
      return { value, count: 0, rules: [] };
    }

    if (typeof value === 'string') {
      const redacted = this.redactString(value, context);
      const ruleCount = this.countRedactions(value, redacted);
      
      return {
        value: this.truncateIfNeeded(redacted),
        count: ruleCount,
        rules: ruleCount > 0 ? ['string_redaction'] : [],
      };
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return { value, count: 0, rules: [] };
    }

    if (Array.isArray(value)) {
      const redactedArray: unknown[] = [];
      
      for (let i = 0; i < value.length; i++) {
        const result = this.redactValue(value[i], `${context}[${i}]`);
        redactedArray.push(result.value);
        totalCount += result.count;
        allAppliedRules.push(...result.rules);
      }
      
      return {
        value: redactedArray,
        count: totalCount,
        rules: allAppliedRules,
      };
    }

    if (typeof value === 'object') {
      const redactedObj: Record<string, unknown> = {};
      
      for (const [key, val] of Object.entries(value)) {
        const fieldContext = context ? `${context}.${key}` : key;
        
        // Check if this field should be completely redacted
        if (this.isSensitiveField(key)) {
          redactedObj[key] = this.config.defaultReplacement;
          totalCount++;
          allAppliedRules.push(`field_redaction: ${key}`);
        } else {
          const result = this.redactValue(val, fieldContext);
          redactedObj[key] = result.value;
          totalCount += result.count;
          allAppliedRules.push(...result.rules);
        }
      }
      
      return {
        value: redactedObj,
        count: totalCount,
        rules: allAppliedRules,
      };
    }

    return { value, count: 0, rules: [] };
  }

  /**
   * Check if a rule should be applied based on field context
   */
  private shouldApplyRule(rule: RedactionRule, context: string): boolean {
    if (!rule.fields || rule.fields.length === 0) {
      return true;
    }

    const fieldName = context.split('.').pop() || '';
    return rule.fields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Count how many redactions were performed
   */
  private countRedactions(original: string, redacted: string): number {
    const redactionMarkers = [
      '[REDACTED_EMAIL]',
      '[REDACTED_PHONE]',
      '[REDACTED_SSN]',
      '[REDACTED_CARD]',
      '[REDACTED_TOKEN]',
      '[REDACTED_URL]',
      '[REDACTED_IP]',
      '[REDACTED_JWT]',
      '[REDACTED]',
    ];

    let count = 0;
    for (const marker of redactionMarkers) {
      const matches = redacted.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      count += matches ? matches.length : 0;
    }

    return count;
  }

  /**
   * Truncate string if it's too long
   */
  private truncateIfNeeded(value: string): string {
    if (!this.config.truncateLongStrings || value.length <= this.config.maxStringLength) {
      return value;
    }

    const truncated = value.substring(0, this.config.maxStringLength - 3) + '...';
    return truncated;
  }
}

/**
 * Factory function for creating data redactors
 */
export function createDataRedactor(config?: Partial<RedactionConfig>): DataRedactor {
  return new DataRedactor(config);
}

/**
 * Default data redactor instance
 */
export const defaultDataRedactor = createDataRedactor();

/**
 * Quick redaction function for one-off use
 * 
 * @example
 * const safeData = redactSensitiveData(userData);
 */
export function redactSensitiveData(data: unknown, config?: Partial<RedactionConfig>): unknown {
  const redactor = createDataRedactor(config);
  const result = redactor.redact(data);
  return result.data;
}

/**
 * Check if data contains sensitive information
 */
export function containsSensitiveData(data: unknown): boolean {
  const redactor = createDataRedactor({ enabled: true });
  const result = redactor.redact(data);
  return result.modified;
}

/**
 * Extract sensitive patterns from data (for analysis)
 */
export function extractSensitivePatterns(data: unknown): {
  emails: string[];
  phones: string[];
  tokens: string[];
  urls: string[];
  ips: string[];
} {
  const dataString = JSON.stringify(data);
  
  return {
    emails: (dataString.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || []),
    phones: (dataString.match(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g) || []),
    tokens: (dataString.match(/\b[A-Za-z0-9]{20,}\b/g) || []),
    urls: (dataString.match(/\bhttps?:\/\/[^\s]*\?(?:token|key|password|secret)=[^\s&]+/gi) || []),
    ips: (dataString.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g) || []),
  };
}

/**
 * Validate redaction rules
 */
export function validateRedactionRules(rules: RedactionRule[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.pattern) {
      errors.push(`Rule "${rule.description}" missing pattern`);
    }

    if (!rule.replacement) {
      errors.push(`Rule "${rule.description}" missing replacement`);
    }

    if (!rule.description) {
      errors.push('Rule missing description');
    }

    if (rule.pattern instanceof RegExp && rule.pattern.source === '') {
      errors.push(`Rule "${rule.description}" has empty regex pattern`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create redaction rules for custom fields
 */
export function createCustomFieldRules(fields: string[], replacement?: string): RedactionRule[] {
  return fields.map(field => ({
    pattern: new RegExp(`\\b${field}\\b`, 'gi'),
    replacement: replacement || `[REDACTED_${field.toUpperCase()}]`,
    description: `Custom field: ${field}`,
    fields: [field],
  }));
}

/**
 * Merge multiple redaction configurations
 */
export function mergeRedactionConfigs(...configs: Partial<RedactionConfig>[]): RedactionConfig {
  const merged: Partial<RedactionConfig> = {
    enabled: true,
    rules: [],
    defaultReplacement: '[REDACTED]',
    sensitiveFields: [],
    maxStringLength: 1000,
    truncateLongStrings: true,
  };

  for (const config of configs) {
    if (config.enabled !== undefined) merged.enabled = config.enabled;
    if (config.defaultReplacement !== undefined) merged.defaultReplacement = config.defaultReplacement;
    if (config.maxStringLength !== undefined) merged.maxStringLength = config.maxStringLength;
    if (config.truncateLongStrings !== undefined) merged.truncateLongStrings = config.truncateLongStrings;
    
    if (config.rules) {
      merged.rules = [...(merged.rules || []), ...config.rules];
    }
    
    if (config.sensitiveFields) {
      merged.sensitiveFields = [...(merged.sensitiveFields || []), ...config.sensitiveFields];
    }
  }

  return merged as RedactionConfig;
}
