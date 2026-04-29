import type { ReactElement } from 'react';
import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MonitoringProvider } from '@/core/monitoring/MonitoringProvider';
import { MonitoringService } from '@/core/monitoring/MonitoringService';
import { createOfflineQueue } from '@/core/monitoring/OfflineQueue';

/**
 * Mock monitoring service for tests
 */
const mockMonitoringService = new MonitoringService({
  serviceName: 'test-service',
  serviceVersion: '1.0.0',
  enableOfflineQueue: true,
  maxQueueSize: 100,
  flushInterval: 1000,
});

/**
 * Mock offline queue for tests
 */
const mockOfflineQueue = createOfflineQueue({
  storageKey: 'test_offline_queue',
  maxMemoryEvents: 100,
  maxStorageSize: 1000000,
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
  retention: {
    maxAge: 86400000, // 24 hours
    maxCount: 1000,
  },
});

/**
 * Test render utility that provides all required providers
 */
const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <MonitoringProvider
    service={mockMonitoringService}
    offlineQueue={mockOfflineQueue}
    trackErrors={true}
    trackPerformance={true}
    trackUserActions={true}
  >
    {children}
  </MonitoringProvider>
);

/**
 * Custom render function with all providers
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from @testing-library/react except render
export {
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
  within,
  configure,
} from '@testing-library/react';
export { customRender as render };
