# ConfigBound

A type-safe configuration management library for TypeScript applications.

## Features

- **Full Type Safety**: Autocomplete for section and element names, with types inferred from your schema
- **Easy Validation**: Validate all config at startup with `validate()` or get detailed error reports
- **Schema-Based**: Define your configuration declaratively with Joi validators
- **Flexible Binds**: Environment variables, files, or custom sources

## Installation

```bash
npm install config-bound
```

## Quick Start

```typescript
import {
  ConfigBound,
  configItem,
  configEnum,
  configSection,
} from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import Joi from "joi";

// Define your configuration schema with full type safety
const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
      description: "Application port",
    }),
    environment: configEnum<"development" | "production">({
      values: ["development", "production"],
      default: "development",
      description: "Runtime environment",
    }),
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
      },
      "Database configuration"
    ),
  },
  {
    binds: [new EnvVarBind()],
    validateOnInit: true, // Catch config errors at startup!
  }
);

// Access values with full type safety - types are inferred, autocomplete works!
const port = config.get("app", "port"); // TypeScript knows this is number
const env = config.get("app", "environment"); // TypeScript knows this is "development" | "production"
const dbHost = config.get("database", "host"); // TypeScript knows this is string

// Validate all config at once
try {
  config.validate();
  console.log("✅ All configuration is valid");
} catch (error) {
  console.error("❌ Configuration errors:", error);
}
```

### Advanced: Imperative API

For advanced use cases where you need fine-grained control over construction, you can use the imperative API:

```typescript
import { ConfigBound } from "@config-bound/config-bound";
import { Section } from "@config-bound/config-bound/section/section";
import { Element } from "@config-bound/config-bound/element/element";
import { EnvVarBind } from "@config-bound/config-bound/bind/binds/envVar";

// Create configuration elements
const portElement = new Element<number>("port", "Application port", 3000);
const logLevelElement = new Element<string>(
  "logLevel",
  "Logging level",
  "info"
);

// Create a configuration section
const appSection = new Section("app", [portElement, logLevelElement]);

// Create the config instance
const config = new ConfigBound("app", [new EnvVarBind()], [appSection]);

// Use it in your application (still fully type-safe!)
const port = config.get("app", "port");
```

**Note**: The declarative `createConfig` API is recommended for most use cases.

## Documentation

See the [docs](./docs).

## Examples

See the [examples](./examples).

## Development

This project uses Turbo for efficient task orchestration across workspaces.

### Available Commands

```bash
# Build main package only
npm run build

# Build all packages (including examples)
npm run build:all

# Start development with watch mode
npm run dev

# Run all tests
npm run test

# Format all code
npm run format

# Lint all code
npm run lint

# Clean build artifacts
npm run clean

# Run CI checks (format, lint, test)
npm run check

# Run examples
npm run examples

# Run specific example
npm run start:envVarExample
```

### Turbo Benefits

- **Caching**: Turbo caches successful builds and tests for faster subsequent runs
- **Parallelization**: Tasks run in parallel where possible
- **Dependency Management**: Automatically builds dependencies before dependent tasks

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../LICENSE) for details.
