---
description: Install ConfigBound and create your first type-safe configuration in a TypeScript app.
---

# Getting Started

This tutorial gets a minimal ConfigBound setup running in a TypeScript app.

## Install

```bash
npm install @config-bound/config-bound
```

## Create a config

```typescript twoslash
import {
  ConfigBound,
  configItem,
  configSection
} from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import { z } from "zod";

const config = await ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: z.number().port()
    }),
    server: configSection({
      host: configItem<string>({
        default: "localhost",
        validator: z.string().hostname()
      })
    })
  },
  {
    binds: [new EnvVarBind()],
    validateOnInit: true
  }
);

const port = await config.get("app", "port");
const host = await config.get("server", "host");
```

## What to read next

- [Reference overview](/reference/)
- [Bind API reference](/reference/api/@config-bound.config-bound.bind.bind.Class.Bind)
