---
description: The core building blocks of ConfigBound and how they work together.
---

# Anatomy of ConfigBound

Five concepts comprise ConfigBound: the **schema**, **binds**, **sections**, **elements**, and the **ConfigBound instance** itself. Understanding each one makes the rest of the API easier to reason about.

## The schema

The schema is a plain TypeScript object you pass to `ConfigBound.createConfig()`. It describes every configuration value your application expects.

Each top-level key is either a `configItem` — a single value — or a `configSection` — a named group of items.

```typescript twoslash
import { ConfigBound, configItem, configSection } from "@config-bound/config-bound";
import Joi from "joi";
// ---cut---
const config = await ConfigBound.createConfig({
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port(),
    description: 'The port the server listens on',
    example: 8080
  }),
  database: configSection({
    host: configItem<string>({ default: 'localhost', validator: Joi.string() }),
    password: configItem<string>({ validator: Joi.string().required(), sensitive: true })
  })
});
```

Each item carries everything needed to describe and validate that value: its type, a validator, an optional default, an example, a description, and a `sensitive` flag for masking in logs and exports.

## Binds

A bind is a source adapter. It knows how to look up a value by its dot-path key (e.g. `database.host`) and return whatever it finds from its underlying source — environment variables, a file, a secrets manager, or anything else.

When you call `config.get()`, ConfigBound iterates the bind list in order and returns the first non-`undefined` result. This means bind order is meaningful: an `EnvVarBind` listed before a `FileBind` takes precedence.

```typescript twoslash
import { ConfigBound, configItem, EnvVarBind, FileBind } from "@config-bound/config-bound";
const schema = { port: configItem<number>({ default: 3000 }) };
// ---cut---
const config = await ConfigBound.createConfig(schema, {
  binds: [
    new EnvVarBind(),                              // checked first
    new FileBind({ filePath: '.env.local' })       // fallback
  ]
});
```

If no bind returns a value, ConfigBound falls back to the element's `default`. If there is no default and the element is `Joi.required()`, `get()` will return `undefined` and `getOrThrow()` will throw.

The three built-in binds are `EnvVarBind`, `FileBind`, and `StaticBind`. You can also [create your own](/how-to/custom-bind).

## Sections

When `createConfig()` processes the schema, it builds the internal runtime structure:

- Each `configSection` becomes a **Section** by the same name.
- Top-level `configItem` entries (those not inside a section) are grouped into an implicit section called `app`.
- Each item within a section becomes an **Element**.

This is why `config.get()` always takes two arguments — a section name and an element name:

```typescript twoslash
import { ConfigBound, configItem, configSection } from "@config-bound/config-bound";
const config = await ConfigBound.createConfig({
  port: configItem<number>({ default: 3000 }),
  database: configSection({ host: configItem<string>({ default: 'localhost' }) })
});
// ---cut---
const port = await config.get('app', 'port');           // top-level items → 'app' section
const host = await config.get('database', 'host');      // named sections use their own name
```

## Elements

An element is the unit of runtime behaviour for a single configuration value.

**Default validation.** When an element is constructed, its `default` value (if provided) is immediately validated against the Joi schema. This means a bad default is caught at startup, not when the value is first read.

**Sensitive masking.** Setting `sensitive: true` on a `configItem` causes the element to be masked in log output and excluded from plaintext exports. Use this for passwords, tokens, and any other secrets.

**Schema export control.** Setting `omitFromSchema: true` excludes the element from generated schema exports (e.g. the output of `configbound export`). This is useful for internal or derived values that consumers of the config schema do not need to know about.

**Required detection.** An element knows whether it is required by inspecting the Joi validator's `presence` flag. This is how `validate()` and `validateOnInit` determine which missing values should cause an error.

**Value retrieval.** When you call `config.get(section, element)`, the element delegates to the active bind list via its value provider, returns the first non-`undefined` result, validates it, and falls back to its `default` if nothing was found. `getOrThrow` follows the same path but throws a `ConfigUnsetException` instead of returning `undefined`.

## The ConfigBound instance

`createConfig()` returns a `TypedConfigBound`, which wraps a `ConfigBound` and provides full TypeScript inference over the schema. The two main ways to read values are:

- **`get(section, element)`** — returns the value or `undefined` if nothing is set and there is no default.
- **`getOrThrow(section, element)`** — returns the value or throws if it is `undefined`.

Validation runs when a value is retrieved: the value from the bind is passed through the Joi validator before being returned. You can also validate all values upfront — at startup — using `validate()` or by passing `validateOnInit: true` to `createConfig()`:

```typescript twoslash
import { ConfigBound, configItem } from "@config-bound/config-bound";
import Joi from "joi";
// ---cut---
const config = await ConfigBound.createConfig(
  { port: configItem<number>({ validator: Joi.number().port().required() }) },
  { validateOnInit: true }
);
```

This causes `createConfig()` to check every element immediately and throw if any required value is missing or invalid, so configuration problems surface at startup rather than at first use.
