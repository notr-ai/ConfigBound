---
description: Map environment variables to ConfigBound config elements using EnvVarBind.
---

# Read configuration from environment variables <Badge type="tip" text="Core" />

`EnvVarBind` maps environment variables to config elements. It translates element
paths to uppercase environment variable names: `section.element` becomes
`SECTION_ELEMENT`. With a prefix, `section.element` becomes `PREFIX_SECTION_ELEMENT`.

## Steps

**1. Create the bind and pass it to `ConfigBound.createConfig`:**

```typescript twoslash
import { ConfigBound, configItem, configSection } from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import Joi from "joi";

const config = await ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port()
    }),
    database: configSection({
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string()
      })
    })
  },
  {
    binds: [new EnvVarBind()]
  }
);
```

With this config, `PORT` sets `port` and `DATABASE_HOST` sets `database.host`.

**2. To avoid collisions with other applications' environment variables, use a prefix:**

```typescript twoslash
import { EnvVarBind } from "@config-bound/config-bound";
// ---cut---
const binds = [new EnvVarBind({ prefix: "MYAPP" })];
```

With the prefix `MYAPP`, `MYAPP_PORT` sets `port` and `MYAPP_DATABASE_HOST` sets
`database.host`. The prefix is stripped before lookup — your code still calls
`config.get("app", "port")`.

## Variable naming

| Element path      | No prefix        | Prefix `MYAPP`         |
|-------------------|------------------|------------------------|
| `port`            | `PORT`           | `MYAPP_PORT`           |
| `database.host`   | `DATABASE_HOST`  | `MYAPP_DATABASE_HOST`  |
| `server.api.url`  | `SERVER_API_URL` | `MYAPP_SERVER_API_URL` |

## Related

- [`EnvVarBind` API reference](/reference/api/@config-bound.config-bound.bind.binds.envVar.Class.EnvVarBind)
- [Use FileBind](./file-bind.md) — read config from a file instead
