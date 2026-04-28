import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      include: ['src/app/**', 'src/lib/**', 'src/components/**'],
      exclude: [
        '**/*.stories.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/node_modules/**',
        '**/.next/**',
        '**/.storybook/**',
      ],
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
