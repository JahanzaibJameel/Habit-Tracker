/**
 * SSR-safe utility functions
 * Prevents hydration mismatches and runtime errors
 */

/**
 * Safe window access with fallback
 */
export function safeWindow(): Window | null {
  if (typeof window !== 'undefined') {
    return window;
  }
  return null;
}

/**
 * Safe document access with fallback
 */
export function safeDocument(): Document | null {
  if (typeof document !== 'undefined') {
    return document;
  }
  return null;
}

/**
 * Safe navigator access with fallback
 */
export function safeNavigator(): Navigator | null {
  if (typeof navigator !== 'undefined') {
    return navigator;
  }
  return null;
}

/**
 * Safe localStorage access with fallback
 */
export function safeLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Safe sessionStorage access with fallback
 */
export function safeSessionStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

/**
 * Safe location access with fallback
 */
export function safeLocation(): Location | null {
  if (typeof window !== 'undefined' && window.location) {
    return window.location;
  }
  return null;
}

/**
 * Safe Date.now() with consistent server/client values
 */
export function safeNow(): number {
  return Date.now();
}

/**
 * Safe Math.random() - returns 0 on server to prevent hydration mismatches
 */
export function safeRandom(): number {
  if (typeof window === 'undefined') {
    return 0; // Consistent value for SSR
  }
  return Math.random();
}

/**
 * Safe crypto.randomUUID() with fallback
 */
export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers or SSR
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (safeRandom() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safe device pixel ratio detection
 */
export function safeDevicePixelRatio(): number {
  if (typeof window !== 'undefined' && window.devicePixelRatio) {
    return window.devicePixelRatio;
  }
  return 1; // Default for SSR
}

/**
 * Safe screen dimensions
 */
export function safeScreenSize(): { width: number; height: number } {
  if (typeof window !== 'undefined' && window.screen) {
    return {
      width: window.screen.width,
      height: window.screen.height,
    };
  }
  return { width: 1920, height: 1080 }; // Default for SSR
}

/**
 * Safe viewport dimensions
 */
export function safeViewportSize(): { width: number; height: number } {
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth || 0,
      height: window.innerHeight || 0,
    };
  }
  return { width: 1920, height: 1080 }; // Default for SSR
}

/**
 * Safe online status
 */
export function safeOnlineStatus(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
    return navigator.onLine;
  }
  return true; // Default for SSR
}

/**
 * Safe user agent
 */
export function safeUserAgent(): string {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent;
  }
  return 'SSR-Agent'; // Default for SSR
}

/**
 * Safe language detection
 */
export function safeLanguage(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en-US'; // Default for SSR
}

/**
 * Safe timezone detection
 */
export function safeTimezone(): string {
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC'; // Default for SSR
}

/**
 * Safe color scheme detection
 */
export function safeColorScheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light'; // Default for SSR
}

/**
 * Safe reduced motion detection
 */
export function safeReducedMotion(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false; // Default for SSR
}
