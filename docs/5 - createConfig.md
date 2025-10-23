# createConfig Helper Function

The `ConfigBound.createConfig` static method provides a simplified, declarative API for creating configuration objects with full type safety. Instead of manually instantiating `Element`, `Section`, and `ConfigBound` classes, you can define your configuration using a type-safe schema object.

## Basic Usage

```typescript
import { ConfigBound, configItem } from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig({
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port(),
    description: "Server port",
  }),
  host: configItem<string>({
    default: "localhost",
    validator: Joi.string(),
    description: "Server host",
  }),
});

// Access configuration values with type safety
const port = config.get<number>("app", "port");
const host = config.get<string>("app", "host");
```

## Type-Safe API

### configItem<T>

The `configItem<T>()` helper function creates a type-safe configuration item. The generic type parameter `T` enforces type safety throughout your application.

```typescript
configItem<T>(options: {
  default?: T;
  description?: string;
  example?: T;
  sensitive?: boolean;
  validator?: Joi.AnySchema<T>;
}): ConfigItem<T>
```

| Property      | Type               | Required | Description                                 |
| ------------- | ------------------ | -------- | ------------------------------------------- |
| `default`     | `T`                | No       | Default value if no value is found in binds |
| `description` | `string`           | No       | Human-readable description                  |
| `example`     | `T`                | No       | Example value (not validated)               |
| `sensitive`   | `boolean`          | No       | Whether to mask the value in logs           |
| `validator`   | `Joi.AnySchema<T>` | No       | Joi validator for runtime validation        |

### configEnum<T>

The `configEnum<T>()` helper function creates a type-safe enum/union config item. This is much cleaner than manually casting Joi validators for string enums.

```typescript
configEnum<T extends string>(options: {
  values: readonly T[];
  default?: T;
  description?: string;
  example?: T;
  sensitive?: boolean;
}): ConfigItem<T>
```

| Property      | Type           | Required | Description                                 |
| ------------- | -------------- | -------- | ------------------------------------------- |
| `values`      | `readonly T[]` | Yes      | Array of valid enum values                  |
| `default`     | `T`            | No       | Default value if no value is found in binds |
| `description` | `string`       | No       | Human-readable description                  |
| `example`     | `T`            | No       | Example value (not validated)               |
| `sensitive`   | `boolean`      | No       | Whether to mask the value in logs           |

### configSection

The `configSection()` helper function creates a nested section with multiple configuration items.

```typescript
configSection<T>(
  properties: { [K in keyof T]: ConfigItem<T[K]> },
  description?: string
): ConfigSection<T>
```

## Examples

### Primitive Types

```typescript
import { ConfigBound, configItem } from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig({
  // String
  appName: configItem<string>({
    default: "My App",
    validator: Joi.string(),
  }),
  // Number
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port(),
  }),
  // Boolean
  debug: configItem<boolean>({
    default: false,
    validator: Joi.boolean(),
  }),
});
```

### Enum Types

Use `configEnum` for type-safe enum/union values. This is much cleaner than manually casting Joi validators:

```typescript
import { ConfigBound, configEnum } from "@config-bound/config-bound";

const config = ConfigBound.createConfig({
  environment: configEnum<"development" | "staging" | "production">({
    values: ["development", "staging", "production"],
    default: "development",
    description: "Runtime environment",
  }),
  logLevel: configEnum<"trace" | "debug" | "info" | "warn" | "error">({
    values: ["trace", "debug", "info", "warn", "error"],
    default: "info",
    description: "Log level",
  }),
});

// Full type safety!
const env = config.get<"development" | "staging" | "production">(
  "app",
  "environment"
);
const level = config.get<"trace" | "debug" | "info" | "warn" | "error">(
  "app",
  "logLevel"
);
```

**Benefits of `configEnum`:**

- ✅ No manual Joi type casting required
- ✅ Cleaner, more readable code
- ✅ Runtime validation automatically generated from the values array
- ✅ Full TypeScript type safety preserved

### Nested Sections

Use `configSection` to group related configuration items:

```typescript
import {
  ConfigBound,
  configItem,
  configSection,
} from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig({
  database: configSection(
    {
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string().hostname(),
        description: "Database host",
      }),
      port: configItem<number>({
        default: 5432,
        validator: Joi.number().port(),
        description: "Database port",
      }),
      username: configItem<string>({
        default: "admin",
        validator: Joi.string(),
        description: "Database username",
      }),
      password: configItem<string>({
        validator: Joi.string(),
        description: "Database password",
        sensitive: true,
      }),
    },
    "Database configuration"
  ),
});

// Access nested values
const dbHost = config.get<string>("database", "host");
const dbPort = config.get<number>("database", "port");
const dbUser = config.get<string>("database", "username");
```

## Environment Variable Binding

To bind configuration values to environment variables, add an `EnvVarBind` to your config:

```typescript
import {
  ConfigBound,
  configItem,
  configSection,
} from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig({
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port(),
    description: "Server port",
  }),
  database: configSection(
    {
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string().hostname(),
        description: "Database host",
      }),
    },
    "Database configuration"
  ),
});

// Add the environment variable bind
config.addBind(new EnvVarBind());

// Will automatically read from:
// - APP_PORT for port
// - DATABASE_HOST for database.host
```

The `EnvVarBind` automatically converts element paths to environment variable names (e.g., `database.host` becomes `DATABASE_HOST`).

## Sections

Top-level keys in your schema automatically become sections:

- Items defined with `configItem` at the root level go into an `'app'` section
- Items defined with `configSection` create their own sections with the key name

```typescript
import {
  ConfigBound,
  configItem,
  configSection,
} from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig({
  // These go into 'app' section
  port: configItem<number>({ default: 3000, validator: Joi.number().port() }),
  host: configItem<string>({ default: "localhost", validator: Joi.string() }),

  // This creates a 'database' section
  database: configSection(
    {
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string().hostname(),
      }),
      port: configItem<number>({
        default: 5432,
        validator: Joi.number().port(),
      }),
    },
    "Database configuration"
  ),

  // This creates a 'redis' section
  redis: configSection(
    {
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string().hostname(),
      }),
      port: configItem<number>({
        default: 6379,
        validator: Joi.number().port(),
      }),
    },
    "Redis configuration"
  ),
});

// Access values
config.get<number>("app", "port");
config.get<string>("database", "host");
config.get<string>("redis", "host");
```

## Validation

### Automatic Validation

The function automatically creates Joi validators based on the type:

```typescript
const config = createConfig({
  port: {
    type: "number",
    default: 3000,
    env: "PORT",
  },
});

// If PORT="not-a-number", this will throw a validation error
const port = config.get<number>("app", "port");
```

### Custom Validators

You can provide custom Joi validators for more complex validation:

```typescript
import Joi from "joi";

const config = createConfig({
  port: {
    type: "number",
    default: 3000,
    env: "PORT",
    validator: Joi.number().min(1).max(65535),
  },
  email: {
    type: "string",
    env: "ADMIN_EMAIL",
    validator: Joi.string().email(),
  },
});
```

## Advanced Options

The `createConfig` function accepts an optional second parameter for advanced configuration:

```typescript
const config = createConfig(
  {
    port: { type: "number", default: 3000 },
  },
  {
    name: "myapp", // Custom config name (default: 'app')
    binds: [customBind], // Custom binds (default: EnvVarBind)
    logger: customLogger, // Custom logger (default: ConsoleLogger)
  }
);
```

## TypeScript Support

The `createConfig` function provides full TypeScript type inference:

```typescript
import type { InferConfigType } from "@config-bound/config-bound";

const schema = {
  port: { type: "number" as const, default: 3000 },
  host: { type: "string" as const, default: "localhost" },
  database: {
    type: "object" as const,
    properties: {
      host: { type: "string" as const, default: "localhost" },
      port: { type: "number" as const, default: 5432 },
    },
  },
};

type Config = InferConfigType<typeof schema>;
// Config will be:
// {
//   port: number;
//   host: string;
//   database: {
//     host: string;
//     port: number;
//   };
// }
```

## Complete Example

```typescript
import { createConfig } from "@config-bound/config-bound";
import Joi from "joi";

const config = createConfig({
  // Application settings
  port: {
    type: "number",
    default: 3000,
    env: "PORT",
    description: "HTTP server port",
    validator: Joi.number().min(1).max(65535),
  },
  nodeEnv: {
    type: "string",
    default: "development",
    env: "NODE_ENV",
    description: "Node environment",
    validator: Joi.string().valid("development", "production", "test"),
  },

  // Database configuration
  database: {
    type: "object",
    description: "Database connection settings",
    properties: {
      host: {
        type: "string",
        default: "localhost",
        env: "DATABASE_HOST",
      },
      port: {
        type: "number",
        default: 5432,
        env: "DATABASE_PORT",
      },
      name: {
        type: "string",
        default: "myapp",
        env: "DATABASE_NAME",
      },
      username: {
        type: "string",
        default: "postgres",
        env: "DATABASE_USERNAME",
      },
      password: {
        type: "string",
        default: "postgres",
        env: "DATABASE_PASSWORD",
        sensitive: true,
      },
      ssl: {
        type: "boolean",
        default: false,
        env: "DATABASE_SSL",
      },
    },
  },

  // CORS settings
  cors: {
    type: "object",
    properties: {
      origins: {
        type: "array",
        default: ["http://localhost:3000"],
        items: {
          type: "string",
          default: "",
        },
      },
      credentials: {
        type: "boolean",
        default: true,
      },
    },
  },
});

// Use the configuration
const port = config.get<number>("app", "port");
const dbHost = config.get<string>("database", "host");
const corsOrigins = config.get<string[]>("cors", "origins");

console.log(`Starting server on port ${port}`);
console.log(`Connecting to database at ${dbHost}`);
```

## Comparison with Manual Approach

### Using createConfig (New)

```typescript
const config = createConfig({
  port: {
    type: "number",
    default: 3000,
    env: "PORT",
  },
});
```

### Manual Approach (Old)

```typescript
import { ConfigBound } from "@config-bound/config-bound";
import { Section } from "@config-bound/config-bound/section/section";
import { Element } from "@config-bound/config-bound/element/element";
import { EnvVarBind } from "@config-bound/config-bound/bind/binds/envVar";

const portElement = new Element<number>("port", "Server port", 3000);
const appSection = new Section("app", [portElement]);
const config = new ConfigBound("app", [new EnvVarBind()], [appSection]);
```

The `createConfig` approach is much more concise and declarative!
