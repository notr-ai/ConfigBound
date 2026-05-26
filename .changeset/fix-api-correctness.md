---
"@config-bound/core": major
---

Fix several API correctness issues.

**Breaking: `FileBind` now requires `await FileBind.create(options)` instead of `new FileBind(options)`**

The constructor is now private. File I/O is performed asynchronously via the static factory, eliminating synchronous blocking at startup.

```ts
// Before
const bind = new FileBind({ filePath: './config.yaml' });

// After
const bind = await FileBind.create({ filePath: './config.yaml' });
```

`reload()` is now async and returns `Promise<void>`:

```ts
// Before
bind.reload();

// After
await bind.reload();
```

**Breaking: `getOrThrow` and `getOrThrowFromCache` now throw `ConfigUnsetException` instead of `ElementNotFoundException` when a value is unset**

`ElementNotFoundException` is semantically reserved for "element does not exist in the schema." When an element exists but has no value and no default, the correct exception is `ConfigUnsetException`. Update any `catch` blocks that differentiate between these two error types.

**`configItem()` now validates `default` against `validator` whenever both are present**

Previously, the default was only validated when an `example` was also provided. Invalid defaults are now caught at schema definition time regardless of whether an `example` is set.
