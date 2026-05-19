import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginJest from 'eslint-plugin-jest';
import pluginJsdoc from 'eslint-plugin-jsdoc';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**']
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
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test.ts'],
    plugins: { jsdoc: pluginJsdoc },
    settings: {
      jsdoc: { mode: 'typescript' }
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            ClassDeclaration: true,
            MethodDefinition: true,
            FunctionDeclaration: true
          },
          checkConstructors: false,
          checkGetters: false,
          checkSetters: false
        }
      ],
      'jsdoc/require-description': ['error', { descriptionStyle: 'body' }],
      'jsdoc/require-param': ['error', { checkDestructured: false }],
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': ['error', { forceReturnsWithAsync: false }],
      'jsdoc/require-returns-description': 'error'
    }
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.node }
  },
  js.configs.recommended,
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
  ...tseslint.configs.recommended,
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  eslintConfigPrettier
];





