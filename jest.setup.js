import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock IndexedDB
class MockIDBFactory {
  constructor() {
    this.databases = new Map();
  }

  open(name, version) {
    if (!this.databases.has(name)) {
      this.databases.set(name, {
        version: version || 1,
        objectStores: new Map(),
      });
    }
    return Promise.resolve({
      result: {
        objectStoreNames: [],
        transaction: () => ({
          objectStore: () => ({}),
        }),
      },
    });
  }

  deleteDatabase(name) {
    this.databases.delete(name);
    return Promise.resolve();
  }
}

global.indexedDB = new MockIDBFactory();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));