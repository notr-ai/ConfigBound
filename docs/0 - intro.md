# Introduction to ConfigBound

ConfigBound is a type-safe configuration management library designed for modern TypeScript applications. It provides a structured way to define, validate, and access configuration values throughout your application.

## Features

- **Full Type Safety**: Autocomplete for section and element names, with types automatically inferred from your schema
- **Easy Validation**: Validate all config at startup with `validate()` or `validateOnInit` option - catch errors early!
- **Schema-Based**: Define your configuration declaratively with Joi validators and examples for documentation
- **Hierarchical Structure**: Organize configurations into logical sections
- **Flexible Binds**: Environment variables, files, or implement custom configuration sources

## Quick Start

### Installation

```bash
npm install config-bound
```

### Basic Usage (Recommended)

For most use cases, use the `ConfigBound.createConfig` method for a clean, declarative API:

```typescript
import { ConfigBound, configItem, configSection } from "config-bound";
import { EnvVarBind } from "config-bound";
import Joi from "joi";

// Define your configuration schema with full type safety
const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
      description: "Server port",
      example: 8080,
    }),
    server: configSection(
      {
        host: configItem<string>({
          default: "localhost",
          validator: Joi.string().hostname(),
          description: "Server hostname",
        }),
        logLevel: configItem<string>({
          default: "info",
          validator: Joi.string().valid(
            "trace",
            "debug",
            "info",
            "warn",
            "error"
          ),
          description: "Log level",
        }),
      },
      "Server configuration"
    ),
  },
  {
    binds: [new EnvVarBind()],
    validateOnInit: true, // Validate all config at startup
  }
);

// Access values with full type safety - no generics needed!
const port = config.get("app", "port"); // TypeScript knows this is number
const host = config.get("server", "host"); // TypeScript knows this is string
console.log(`Server starting on ${host}:${port}`);
```

See [createConfig documentation](./5%20-%20createConfig.md) for more details.

### Advanced Usage (Manual Approach)

For advanced use cases requiring custom binds or more control:

```typescript
import { ConfigBound } from "config-bound";
import { Section } from "config-bound/section/section";
import { Element } from "config-bound/element/element";
import { EnvVarBind } from "config-bound/bind/binds/envVar";

// Create elements for server configuration
const portElement = new Element<number>("port", "Server port", 3000);
const hostElement = new Element<string>("host", "Server hostname", "localhost");

// Create elements for logger configuration
const logLevelElement = new Element<string>("level", "Log level", "info");
const logFormatElement = new Element<string>("format", "Log format", "json");

// Create sections
const serverSection = new Section("server", [portElement, hostElement]);
const loggerSection = new Section("logger", [
  logLevelElement,
  logFormatElement,
]);

// Create the ConfigBound instance
const appConfig = new ConfigBound(
  "app",
  [new EnvVarBind()],
  [serverSection, loggerSection]
);

// Access your configuration values (types are inferred)
const serverPort = appConfig.get("server", "port");
console.log(`Server starting on port ${serverPort}`);
```
