---
"@config-bound/config-bound": minor
---


Make `Bind.retrieve` (and the full call chain) async

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
