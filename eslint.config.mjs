import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  'frontend/.next/**',
  '**/*.d.ts',
];

export default [
  {
    ignores: IGNORE_PATTERNS,
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
];
