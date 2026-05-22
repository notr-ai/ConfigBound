---
"@config-bound/config-bound": minor
"@config-bound/nestjs": minor
---

Add synchronous cache API for constructor-safe config reads.

Introduces `getFromCache()`, `getOrThrowFromCache()`, `populateCache()`, and `isCacheReady()` on both `TypedConfigBound` and `ConfigBoundService`. A `cacheMode` option (`'eager' | 'manual'`) controls whether the cache is populated automatically at startup (`eager`, default) or on demand (`manual`). This enables config reads in NestJS constructors and other sync-only call sites that cannot `await`.
