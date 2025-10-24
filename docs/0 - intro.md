# ConfigBound

Type-safe configuration management for TypeScript applications.

## Installation

```bash
npm install @config-bound/config-bound
```

## Usage

### Declarative API

```typescript
import {
  ConfigBound,
  configItem,
  configSection,
} from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
    }),
    server: configSection({
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string().hostname(),
      }),
    }),
  },
  {
    binds: [new EnvVarBind()],
    validateOnInit: true,
  }
);

const port = config.get("app", "port");
const host = config.get("server", "host");
```
