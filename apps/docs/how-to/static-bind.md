---
description: Inject in-memory configuration values at runtime using StaticBind.
---

# Supply configuration values directly in code <Badge type="tip" text="Core" />

`StaticBind` injects configuration values from an in-memory object. Use it when
you need programmatic overrides — test fixtures, feature flags resolved at
startup, or values derived from other runtime state.

## Steps

**1. Pass a `StaticBind` to `ConfigBound.createConfig`:**

```typescript twoslash
import { ConfigBound, configItem, configSection } from "@config-bound/config-bound";
import { StaticBind } from "@config-bound/config-bound";
import { z } from "zod";

const config = await ConfigBound.createConfig(
  {
    port: configItem<number>({
      validator: z.number().port()
    }),
    database: configSection({
      host: configItem<string>({
        validator: z.string()
      })
    })
  },
  {
    binds: [
      new StaticBind({
        port: 8080,
        database: { host: "db.local" }
      })
    ]
  }
);
```

**2. Values can be nested objects or flat dot-path keys. Both work:**

```typescript twoslash
import { StaticBind } from "@config-bound/config-bound";
// ---cut---
new StaticBind({
  port: 8080,                  // nested key
  "database.host": "db.local"  // flat dot-path key
})
```

When a path resolves in both nested and flat forms, the nested value wins. If a
nested value is `null`, resolution falls back to the flat key for that path.
Explicit `null` anywhere is treated as unset.

## `StaticBind` is not the same as `default`

`configItem({ default })` is a schema-level fallback. `StaticBind` participates
in bind priority — it can be overridden by higher-priority binds, and it overrides
lower-priority ones.

Use `default` when the value is a fixed constant that belongs to the schema.
Use `StaticBind` when the value is resolved at runtime and needs to interact with
the bind chain.

## Sensitive values

Do not hardcode secrets as literals in source files. `StaticBind` is fine for
sensitive values as long as they're resolved at runtime—fetched from an upstream process—and passed in as variables, not string literals
that end up in version control.

## Related

- [`StaticBind` API reference](/reference/api/@config-bound.config-bound.bind.binds.static.Class.StaticBind)
- [Use EnvVarBind](./env-var-bind.md) — read config from environment variables
- [Use FileBind](./file-bind.md) — read config from a file
