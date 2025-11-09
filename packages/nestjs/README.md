# @config-bound/nestjs

NestJS integration for the ConfigBound configuration library. This package provides a seamless way to integrate ConfigBound into your NestJS applications with full dependency injection support.

## Installation

```bash
npm install @config-bound/nestjs @config-bound/config-bound
```

## Quick Start

### Basic Usage

```typescript
import { Module } from '@nestjs/common';
import { ConfigBoundModule } from '@config-bound/nestjs';
import { configItem, configSection } from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import Joi from 'joi';

const appConfig = {
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port(),
    description: 'Application port'
  }),
  database: configSection(
    {
      host: configItem<string>({
        default: 'localhost',
        validator: Joi.string(),
        description: 'Database host'
      }),
      port: configItem<number>({
        default: 5432,
        validator: Joi.number().port(),
        description: 'Database port'
      })
    },
    'Database configuration'
  )
};

@Module({
  imports: [
    ConfigBoundModule.forRoot({
      schema: appConfig,
      binds: [new EnvVarBind({ prefix: 'APP' })],
      validateOnInit: true,
      isGlobal: true
    })
  ]
})
export class AppModule {}
```

### Using the Service

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigBoundService } from '@config-bound/nestjs';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigBoundService) {}

  getPort(): number {
    return this.config.getOrThrow('app', 'port');
  }

  getDatabaseUrl(): string {
    const host = this.config.getOrThrow('database', 'host');
    const port = this.config.getOrThrow('database', 'port');
    return `postgresql://${host}:${port}`;
  }
}
```

## Async Configuration

For more complex scenarios where configuration depends on other services:

```typescript
import { Module } from '@nestjs/common';
import {
  ConfigBoundModule,
  ConfigBoundModuleOptions
} from '@config-bound/nestjs';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigBoundModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<ConfigBoundModuleOptions> => {
        return {
          schema: appConfig,
          binds: [new EnvVarBind({ prefix: 'APP' })],
          validateOnInit: true
        };
      },
      inject: [ConfigService],
      isGlobal: true
    })
  ]
})
export class AppModule {}
```

### Using a Factory Class

```typescript
import { Injectable } from '@nestjs/common';
import {
  ConfigBoundOptionsFactory,
  ConfigBoundModuleOptions
} from '@config-bound/nestjs';

@Injectable()
export class ConfigBoundConfigService implements ConfigBoundOptionsFactory {
  createConfigBoundOptions(): ConfigBoundModuleOptions {
    return {
      schema: appConfig,
      binds: [new EnvVarBind({ prefix: 'APP' })],
      validateOnInit: true
    };
  }
}

@Module({
  imports: [
    ConfigBoundModule.forRootAsync({
      useClass: ConfigBoundConfigService,
      isGlobal: true
    })
  ]
})
export class AppModule {}
```

## API

### ConfigBoundModule

#### `forRoot(options: ConfigBoundModuleOptions): DynamicModule`

Register the module synchronously.

**Options:**

- `schema` (required): Your configuration schema. Top-level items (not in a `configSection`) are automatically placed in a section named after the `name` option (default: 'app')
- `name` (optional): Configuration name (default: 'app'). This is also the section name used for top-level config items
- `binds` (optional): Array of Bind instances for value resolution. For `EnvVarBind`, you can pass `{ prefix: "PREFIX" }` to prefix environment variable names
- `logger` (optional): Custom logger instance
- `validateOnInit` (optional): Validate configuration on module initialization (default: false)
- `isGlobal` (optional): Make the module global (default: false)

#### `forRootAsync(options: ConfigBoundModuleAsyncOptions): DynamicModule`

Register the module asynchronously.

**Options:**

- `imports` (optional): Modules to import
- `useFactory` (optional): Factory function to create options
- `useClass` (optional): Class to instantiate for options
- `useExisting` (optional): Existing provider to use
- `inject` (optional): Dependencies to inject into factory
- `isGlobal` (optional): Make the module global (default: false)

### ConfigBoundService

The service provides full type-safe access to your configuration:

**Methods:**

- `get(sectionName, elementName)`: Get a config value (returns undefined if not found)
- `getOrThrow(sectionName, elementName)`: Get a config value (throws if not found)
- `validate()`: Validate all configuration values
- `getValidationErrors()`: Get all validation errors without throwing
- `addBind(bind: Bind)`: Add a new bind at runtime
- `addSection(section: Section)`: Add a new section at runtime
- `getSections()`: Get all configuration sections
- `getTypedConfigBound()`: Get the underlying TypedConfigBound instance

**Properties:**

- `name`: The configuration name (string)
- `binds`: Array of Bind instances (Bind[])
- `sections`: Array of Section instances (Section[])

## Best Practices

1. **Use `isGlobal: true`** for application-wide configuration to avoid importing the module everywhere
2. **Enable `validateOnInit: true`** to catch configuration errors at startup
3. **Use `getOrThrow()`** for required configuration values
4. **Use `get()`** for optional configuration values with proper fallback handling
5. **Define your schema in a separate file** for reusability and better organization
6. **Use a prefix with `EnvVarBind`** to give a meaningful prefix to environment variable names (e.g., `new EnvVarBind({ prefix: "APP" })`)
7. **Remember top-level items go in the 'app' section**: Top-level `configItem` entries are automatically placed in a section named after the `name` option (default: 'app'), so access them with `config.getOrThrow("app", "port")`

## Type Safety

This package provides full TypeScript type inference from your configuration schema:

```typescript
// Schema definition
const appConfig = {
  port: configItem<number>({ default: 3000 }),
  apiKey: configItem<string>({ default: '' })
};

// Usage with full type safety
@Injectable()
export class MyService {
  constructor(private readonly config: ConfigBoundService<typeof appConfig>) {}

  initialize() {
    const port = this.config.get('app', 'port'); // Type: number | undefined
    const key = this.config.getOrThrow('app', 'apiKey'); // Type: string
  }
}
```

## License

MIT
