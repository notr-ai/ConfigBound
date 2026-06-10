# @config-bound/nestjs

## 1.0.0

### Patch Changes

- Updated dependencies [87d2ab6]
  - @config-bound/core@1.0.0

## 0.3.0

### Minor Changes

- 0a6960f: Add synchronous cache API for constructor-safe config reads.

  Introduces `getFromCache()`, `getOrThrowFromCache()`, `populateCache()`, and `isCacheReady()` on both `TypedConfigBound` and `ConfigBoundService`. A `cacheMode` option (`'eager' | 'manual'`) controls whether the cache is populated automatically at startup (`eager`, default) or on demand (`manual`). This enables config reads in NestJS constructors and other sync-only call sites that cannot `await`.

### Patch Changes

- Updated dependencies [0a6960f]
  - @config-bound/config-bound@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [02b3369]
- Updated dependencies [ac54dea]
- Updated dependencies [0f899ee]
  - @config-bound/config-bound@0.2.0

## 0.1.0

### Minor Changes

- 3c2cf21: Add a CLI to export and interact with configuration schemas
- de1dc3b: Add @config-bound/nestjs package for NestJS integration
  - Add ConfigBoundModule with forRoot() and forRootAsync() methods
  - Add ConfigBoundService for dependency injection
  - Support for both synchronous and asynchronous configuration
  - Full TypeScript type safety and inference
  - Integration with NestJS dependency injection system

### Patch Changes

- dca5c72: Bumped various dependencies to latest.
- Updated dependencies [de1dc3b]
- Updated dependencies [3c2cf21]
- Updated dependencies [dca5c72]
  - @config-bound/config-bound@0.1.0

## 1.0.0

### Minor Changes

- Add @config-bound/nestjs package for NestJS integration
  - Add ConfigBoundModule with forRoot() and forRootAsync() methods
  - Add ConfigBoundService for dependency injection
  - Support for both synchronous and asynchronous configuration
  - Full TypeScript type safety and inference
  - Integration with NestJS dependency injection system

### Patch Changes

- Updated dependencies
  - @config-bound/config-bound@1.0.0
