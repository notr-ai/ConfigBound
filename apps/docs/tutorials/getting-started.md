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

```typescript
import {
  ConfigBound,
  configItem,
  configSection
} from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port()
    }),
    server: configSection({
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string().hostname()
      })
    })
  },
  {
    binds: [new EnvVarBind()],
    validateOnInit: true
  }
);

const port = config.get("app", "port");
const host = config.get("server", "host");
```

## What to read next

- [Reference overview](/reference/)
- [Bind API reference](/reference/api/bind.bind.Class.Bind.md)
