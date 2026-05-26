---
description: Install ConfigBound and create your first type-safe configuration in a TypeScript app.
---

# Getting started

This tutorial gets a minimal ConfigBound setup running in a TypeScript app.

## Install

```bash
npm install @config-bound/core
```

## Create a config

```typescript twoslash
import {
  ConfigBound,
  configItem,
  configSection
} from "@config-bound/core";
import { EnvVarBind } from "@config-bound/core";
import { z } from "zod";

const config = await ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: z.number().int().min(1).max(65535)
    }),
    server: configSection({
      host: configItem<string>({
        default: "localhost",
        validator: z.hostname()
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
- [Bind API reference](/reference/api/@config-bound.core.bind.bind.Class.Bind)
