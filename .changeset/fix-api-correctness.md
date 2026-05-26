---
"@config-bound/core": major
---

Fix several API correctness issues and standardize bind creation.

**Breaking: All binds now use `await Bind.create(options)` instead of `new Bind(options)`**

Constructors on all built-in binds are now private. Use the static async factory on each:

```ts
// Before
const bind = new FileBind({ filePath: './config.yaml' });
const env  = new EnvVarBind({ prefix: 'APP' });
const stat = new StaticBind({ 'app.port': 3000 });

// After
const bind = await FileBind.create({ filePath: './config.yaml' });
const env  = await EnvVarBind.create({ prefix: 'APP' });
const stat = await StaticBind.create({ 'app.port': 3000 });
```

This establishes a uniform creation pattern across all binds. `FileBind` already required I/O at creation; `EnvVarBind` and `StaticBind` now follow the same convention so that custom binds have a clear, idiomatic pattern to follow.

`FileBind.reload()` is also now async and returns `Promise<void>`:

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
