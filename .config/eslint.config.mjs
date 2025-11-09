/* eslint-disable @typescript-eslint/naming-convention */
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import pluginJest from 'eslint-plugin-jest';
import turbo from 'eslint-plugin-turbo';

export default defineConfig([
  {
    ignores: ['**/dist/**', 'docs/**', 'examples/**']
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    rules: {
      '@typescript-eslint/naming-convention': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@/no-duplicate-imports': 'error',
      '@/eol-last': 'error',
      '@/no-trailing-spaces': 'error',
      '@/prefer-const': 'error'
    }
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    plugins: { js },
    extends: ['js/recommended']
  },
  {
    files: ['**/*.spec.{js,ts}', '**/*.test.{js,ts}'],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals
    },
    rules: {
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error'
    }
  },
  {
    plugins: {
      turbo
    },
    files: ['**/*.{js,mjs,cjs,ts}'],
    ignores: ['**/*.spec.{js,ts}', '**/*.test.{js,ts}'],
    rules: {
      'turbo/no-undeclared-env-vars': 'warn'
    }
  },
  tseslint.configs.recommended,
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  eslintConfigPrettier
]);
