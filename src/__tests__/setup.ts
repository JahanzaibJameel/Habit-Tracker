import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock PerformanceObserver for performance monitoring tests
global.PerformanceObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
} as any;

// Mock performance.now()
Object.defineProperty(global, 'performance', {
  value: {
    ...global.performance,
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock PerformanceEntry
global.PerformanceEntry = class {} as any;

// Mock PerformanceObserver
class MockPerformanceObserver implements PerformanceObserver {
  static supportedEntryTypes: string[] = [];
  constructor(callback: PerformanceObserverCallback) {}
  observe(options?: PerformanceObserverInit) {}
  disconnect() {}
  takeRecords(): PerformanceEntryList { return []; }
}

Object.defineProperty(window, 'PerformanceObserver', {
  value: MockPerformanceObserver,
  writable: true,
});
