import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

let tailwindcss = null;

try {
  ({ default: tailwindcss } = await import('eslint-plugin-tailwindcss'));
} catch {
  tailwindcss = null;
}

export default [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'node_modules/**',
      'src/core/**',
      'src/**/__tests__/**',
      'src/**/*.test.*',
      'src/**/*.spec.*',
      'public/**/*.js',
      'scripts/**/*.js',
      'commitlint.config.js',
      'cz.config.js',
      'eslint.config.js',
      'eslint.config.mjs',
      'jest.config.js',
      'jest.setup.js',
      'lighthouserc.js',
      'next-env.d.ts',
      'next.config.js',
      'tailwind.config.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
      'unused-imports': unusedImports,
      'simple-import-sort': simpleImportSort,
      prettier,
      ...(tailwindcss ? { tailwindcss } : {}),
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'import/no-unresolved': 'off',
      'import/named': 'off',
      'import/default': 'off',
      'import/export': 'off',
      'import/no-duplicates': 'error',
      'unused-imports/no-unused-imports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react', '^next', '^@?\\w'],
            ['^@/'],
            ['^\\.\\./', '^\\.\\/'],
            ['^\\u0000'],
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'no-console': 'off',
      'no-debugger': 'off',
      'no-alert': 'off',
      'no-case-declarations': 'off',
      'no-dupe-else-if': 'off',
      'no-unused-vars': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'dot-notation': 'error',
      ...(tailwindcss
        ? {
            'tailwindcss/classnames-order': 'warn',
            'tailwindcss/no-custom-classname': 'warn',
            'tailwindcss/no-contradicting-classname': 'error',
          }
        : {}),
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },
  {
    files: ['*.ts', '*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
    },
  },
  {
    files: ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*', '**/*.{test,spec}.*'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
  prettierConfig,
];
