# @config-bound/config-bound

## 1.0.0

### Major Changes

- 87d2ab6: Fix several API correctness issues and standardize bind creation.

  **Breaking: All binds now use `await Bind.create(options)` instead of `new Bind(options)`**

  Constructors on all built-in binds are now private. Use the static async factory on each:

  ```ts
  // Before
  const bind = new FileBind({ filePath: "./config.yaml" });
  const env = new EnvVarBind({ prefix: "APP" });
  const stat = new StaticBind({ "app.port": 3000 });

  // After
  const bind = await FileBind.create({ filePath: "./config.yaml" });
  const env = await EnvVarBind.create({ prefix: "APP" });
  const stat = await StaticBind.create({ "app.port": 3000 });
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

  **Breaking: `ConfigBound.binds`, `ConfigBound.sections`, and `ConfigBound.getSections()` now return `ReadonlyArray<T>`**

  These were previously typed as `Bind[]` / `Section[]` with a `readonly` modifier on the property, which only prevented reassignment of the reference — the array itself was still mutable. The types are now `ReadonlyArray<Bind>` and `ReadonlyArray<Section>`, preventing external mutation entirely.

  If you were assigning these to a typed mutable array, add `as Bind[]` / `as Section[]` or change the variable type to `ReadonlyArray`:

  ```ts
  // Before — compiled fine (incorrectly)
  const binds: Bind[] = configBound.binds;

  // After — either:
  const binds: ReadonlyArray<Bind> = configBound.binds; // preferred
  const binds = configBound.binds as Bind[]; // if mutation is genuinely needed
  ```

  The `@config-bound/nestjs` `ConfigBoundService` getters and `getSections()` are updated to match.

  **`configItem()` now validates `default` against `validator` whenever both are present**

  Previously, the default was only validated when an `example` was also provided. Invalid defaults are now caught at schema definition time regardless of whether an `example` is set.

  **Breaking: `Element` constructor now accepts an options object instead of positional parameters**

  The 8-parameter positional constructor has been replaced with a single `ElementOptions<T>` object. All fields that previously had defaults remain optional:

  ```ts
  // Before
  const element = new Element<string>(
    "host",
    "Database host",
    "localhost",
    "db.example.com",
    false,
    false,
    z.string(),
  );

  // After
  const element = new Element<string>({
    name: "host",
    description: "Database host",
    default: "localhost",
    example: "db.example.com",
    validator: z.string(),
  });
  ```

  `sensitive`, `omitFromSchema`, and `validator` all remain optional with the same defaults (`false`, `false`, `z.any()`). The `ElementOptions<T>` interface is exported from `@config-bound/core/element`.

## 0.3.0

### Minor Changes

- 0a6960f: Add synchronous cache API for constructor-safe config reads.

  Introduces `getFromCache()`, `getOrThrowFromCache()`, `populateCache()`, and `isCacheReady()` on both `TypedConfigBound` and `ConfigBoundService`. A `cacheMode` option (`'eager' | 'manual'`) controls whether the cache is populated automatically at startup (`eager`, default) or on demand (`manual`). This enables config reads in NestJS constructors and other sync-only call sites that cannot `await`.

## 0.2.0

### Minor Changes

- 02b3369: Add FileBind for reading configuration from JSON, JSONC, and YAML files
  - New `FileBind` class that reads config values from JSON, JSONC (comments + trailing commas), and YAML files
  - Format auto-detected from file extension (`.json`, `.jsonc`, `.yml`, `.yaml`) with explicit override option
  - `rootKey` option to scope into a subtree of the parsed file
  - `reload()` method to re-read changed files at runtime
  - YAML uses `JSON_SCHEMA` to prevent surprising type coercion (e.g., `yes` stays a string, not a boolean)

- ac54dea: Add StaticBind for in-memory configuration values with nested key access.
  - New `StaticBind` class for reading values from plain JavaScript objects without environment variables or files
  - Supports nested object lookups via dot-path keys
  - Preserves explicit `null` values and distinguishes them from missing keys
  - Improves error handling consistency across bind implementations

- 0f899ee: Make `Bind.retrieve` (and the full call chain) async

  **BREAKING CHANGE:** `Bind.retrieve` now returns `Promise<T | undefined>` instead of `T | undefined`. This change propagates
  throughout the public API:
  - `Bind.retrieve<T>()` → `Promise<T | undefined>`
  - `Bind.get<T>()` → `Promise<T | undefined>`
  - `ConfigBound.get<T>()` → `Promise<T | undefined>`
  - `ConfigBound.getOrThrow<T>()` → `Promise<T>`
  - `ConfigBound.validate()` → `Promise<void>`
  - `ConfigBound.getValidationErrors()` → `Promise<Array<{ path, message }>>`
  - `ConfigBound.createConfig()` → `Promise<TypedConfigBound<T>>`
  - `TypedConfigBound.get/getOrThrow/validate/getValidationErrors` — all async
  - `Element.get/getOrThrow` → async
  - `Section.getValue` → async
  - `ConfigValueProvider.get` → `Promise<T | undefined>`

  Existing sync binds (`EnvVarBind`, `FileBind`, `StaticBind`) are unaffected in behavior —
  their `retrieve` implementations now simply return resolved promises.

  **Migration:** add `await` at every call site of `get`, `getOrThrow`, `validate`,
  `getValidationErrors`, and `createConfig`, and ensure those call sites are inside
  `async` functions.

## 0.1.0

### Minor Changes

- 3c2cf21: Add a CLI to export and interact with configuration schemas

### Patch Changes

- de1dc3b: Add configuration schema export functionality
  - Add `exportSchema()` method to get structured schema object
  - Add `toJSON(pretty?)` method for JSON export (pretty or compact)
  - Add `toYAML()` method for YAML export (requires optional js-yaml dependency)
  - Add comprehensive schema extraction with metadata (name, description, type, defaults, examples, validation rules, sensitive flags)
  - Add export examples with format selection (JSON, YAML, or both)
  - Add environment variable mapping with prefix support
  - Add programmatic inspection capabilities for required fields and validation rules
  - Update all examples to use environment variable prefixes by default
  - Add complete documentation for export functionality

  This enables automatic documentation generation, configuration discovery, and tooling integration from ConfigBound schemas.

- dca5c72: Bumped various dependencies to latest.
