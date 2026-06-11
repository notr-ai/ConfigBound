---
"@config-bound/core": patch
---

Changelog and release alignment for 1.0.0 changes.

**Breaking: `TypedConfigBound` removed**

`TypedConfigBound<T>` has been removed. Use `ConfigBound<T>` directly — `ConfigBound` is now generic.

```ts
// Before
import { TypedConfigBound } from '@config-bound/core';
const config: TypedConfigBound<typeof schema> = await ConfigBound.createConfig(schema, options);

// After
import { ConfigBound } from '@config-bound/core';
const config: ConfigBound<typeof schema> = await ConfigBound.createConfig(schema, options);
```

**Breaking: `ConfigBoundService.getTypedConfigBound()` renamed to `getConfigBound()`**

Update any NestJS service call sites that used `getTypedConfigBound()`.

**New: `@config-bound/core/schema` entry point**

Schema builder functions (`configItem`, `configSection`, `configEnum`) and their types are now available from a dedicated entry point for better tree-shaking:

```ts
import { configItem, configSection, configEnum } from '@config-bound/core/schema';
```

They remain re-exported from `@config-bound/core` for backwards compatibility.
