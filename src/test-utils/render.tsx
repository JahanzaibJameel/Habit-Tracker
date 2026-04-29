import type { ReactElement } from 'react';
import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';

/**
 * Test render utility that provides minimal providers for testing
 * For now, we'll skip the complex MonitoringProvider to avoid build issues
 */
const AllProviders = ({ children }: { children: React.ReactNode }) => <>{children}</>;

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
