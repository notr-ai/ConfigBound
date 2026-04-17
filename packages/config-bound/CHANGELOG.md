# @config-bound/config-bound

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
