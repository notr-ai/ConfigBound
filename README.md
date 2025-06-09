# ConfigBound

A type-safe configuration management library for TypeScript applications.

## Features

- Strong TypeScript typing for your configuration
- Schema validation using Joi
- Modular configuration structure

## Installation

```bash
npm install config-bound
```

## Quick Start

```typescript
import { ConfigBound } from 'config-bound';
import { Section } from 'config-bound/section/section';
import { Element } from 'config-bound/element/element';
import { EnvVarBind } from 'config-bound/bind/binds/envVar';

// Create configuration elements
const portElement = new Element<number>('port', 'Application port', 3000);
const logLevelElement = new Element<string>(
  'logLevel',
  'Logging level',
  'info'
);

// Create a configuration section
const appSection = new Section('app', [portElement, logLevelElement]);

// Create the config instance
const config = new ConfigBound('app', [new EnvVarBind()], [appSection]);

// Use it in your application
const port = config.get<number>('app', 'port');
```

## Documentation

See the [docs](./docs).

## Examples

See the [examples](./examples).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../LICENSE) for details.
