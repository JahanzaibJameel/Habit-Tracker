import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Test render utility that provides all required providers
 */
const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

/**
 * Custom render function with all providers
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export { customRender as render };
