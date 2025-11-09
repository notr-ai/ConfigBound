/* eslint-disable @typescript-eslint/naming-convention */

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          isolatedModules: false
        },
        diagnostics: {
          ignoreCodes: [151002]
        }
      }
    ]
  }
};
