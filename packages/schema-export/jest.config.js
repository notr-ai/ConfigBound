/* eslint-disable @typescript-eslint/naming-convention */

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/*.spec.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          isolatedModules: false
        },
        diagnostics: {
          ignoreCodes: [151002]
        }
      }
    ]
  }
};
