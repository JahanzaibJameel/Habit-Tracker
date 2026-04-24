/**
 * Security utilities for input validation, XSS prevention, and data sanitization
 */

// XSS prevention utilities
export const sanitizeInput = {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  string: (input: string): string => {
    if (typeof input !== 'string') return '';

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .trim();
  },

  /**
   * Sanitize HTML content
   */
  html: (input: string): string => {
    if (typeof input !== 'string') return '';

    // Basic HTML sanitization - in production, use a library like DOMPurify
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = input;
      return div.innerHTML;
    }

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },

  /**
   * Sanitize URL to prevent malicious URLs
   */
  url: (input: string): string => {
    if (typeof input !== 'string') return '';

    try {
      const url = new URL(
        input,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      );

      // Only allow http, https, and relative protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }

      // Remove javascript: and data: URLs
      if (url.protocol === 'javascript:' || url.protocol === 'data:') {
        return '';
      }

      return url.toString();
    } catch {
      return '';
    }
  },
};

// Input validation utilities
export const validateInput = {
  /**
   * Validate email format
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  /**
   * Validate habit name
   */
  habitName: (name: string): boolean => {
    return (
      typeof name === 'string' &&
      name.trim().length > 0 &&
      name.trim().length <= 100 &&
      !/[<>]/.test(name)
    );
  },

  /**
   * Validate habit description
   */
  habitDescription: (description: string): boolean => {
    return typeof description === 'string' && description.length <= 500;
  },

  /**
   * Validate category
   */
  category: (category: string): boolean => {
    const validCategories = [
      'health',
      'fitness',
      'learning',
      'work',
      'personal',
      'social',
      'creativity',
      'mindfulness',
      'finance',
      'habits',
      'other',
    ];
    return typeof category === 'string' && validCategories.includes(category.toLowerCase());
  },

  /**
   * Validate target value
   */
  target: (target: number): boolean => {
    return typeof target === 'number' && target > 0 && target <= 10000;
  },

  /**
   * Validate frequency
   */
  frequency: (frequency: string): boolean => {
    return ['daily', 'weekly', 'monthly'].includes(frequency);
  },
};

// CSRF protection utilities
export const csrfProtection = {
  /**
   * Generate CSRF token
   */
  generateToken: (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback for older browsers
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  },

  /**
   * Validate CSRF token
   */
  validateToken: (token: string, sessionToken: string): boolean => {
    return token === sessionToken && token.length > 0;
  },
};

// Rate limiting utilities
export const rateLimit = {
  /**
   * Simple in-memory rate limiter
   */
  createLimiter: (maxRequests: number, windowMs: number) => {
    const requests = new Map<string, number[]>();

    return {
      isAllowed: (identifier: string): boolean => {
        const now = Date.now();
        const userRequests = requests.get(identifier) || [];

        // Remove old requests outside the window
        const validRequests = userRequests.filter((time) => now - time < windowMs);

        if (validRequests.length >= maxRequests) {
          return false;
        }

        validRequests.push(now);
        requests.set(identifier, validRequests);
        return true;
      },

      reset: (identifier: string): void => {
        requests.delete(identifier);
      },
    };
  },
};

// Content Security Policy helpers
export const csp = {
  /**
   * Generate nonce for CSP
   */
  generateNonce: (): string => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array));
    }

    return Math.random().toString(36).substring(2, 15);
  },

  /**
   * Validate script nonce
   */
  validateNonce: (nonce: string, expectedNonce: string): boolean => {
    return nonce === expectedNonce && nonce.length > 0;
  },
};

// Data sanitization for API responses
export const sanitizeApiResponse = {
  /**
   * Sanitize habit data from API
   */
  habit: (habit: any) => {
    return {
      id: typeof habit.id === 'string' ? sanitizeInput.string(habit.id) : '',
      name: validateInput.habitName(habit.name)
        ? sanitizeInput.string(habit.name)
        : 'Untitled Habit',
      description: validateInput.habitDescription(habit.description || '')
        ? sanitizeInput.html(habit.description || '')
        : '',
      icon: typeof habit.icon === 'string' ? sanitizeInput.string(habit.icon) : 'default',
      color: typeof habit.color === 'string' ? sanitizeInput.string(habit.color) : '#6b7280',
      category: validateInput.category(habit.category || 'other') ? habit.category : 'other',
      target: validateInput.target(Number(habit.target)) ? Number(habit.target) : 1,
      unit: typeof habit.unit === 'string' ? sanitizeInput.string(habit.unit) : 'times',
      frequency: validateInput.frequency(habit.frequency) ? habit.frequency : 'daily',
      createdAt: habit.createdAt instanceof Date ? habit.createdAt : new Date(),
      updatedAt: habit.updatedAt instanceof Date ? habit.updatedAt : new Date(),
      archivedAt: habit.archivedAt instanceof Date ? habit.archivedAt : undefined,
      position: typeof habit.position === 'number' ? habit.position : 0,
      isPublic: Boolean(habit.isPublic),
      tags: Array.isArray(habit.tags)
        ? habit.tags.map((tag: any) => sanitizeInput.string(tag)).filter(Boolean)
        : [],
    };
  },

  /**
   * Sanitize completion data from API
   */
  completion: (completion: any) => {
    return {
      id: typeof completion.id === 'string' ? sanitizeInput.string(completion.id) : '',
      habitId:
        typeof completion.habitId === 'string' ? sanitizeInput.string(completion.habitId) : '',
      value: validateInput.target(Number(completion.value)) ? Number(completion.value) : 1,
      completedAt: completion.completedAt instanceof Date ? completion.completedAt : new Date(),
      notes: typeof completion.notes === 'string' ? sanitizeInput.html(completion.notes) : '',
      metadata:
        typeof completion.metadata === 'object' && completion.metadata !== null
          ? completion.metadata
          : {},
    };
  },
};

// Security headers utilities
export const securityHeaders = {
  /**
   * Get security headers for API responses
   */
  getHeaders: () => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }),
};
