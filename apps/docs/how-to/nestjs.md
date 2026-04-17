---
description: Integrate ConfigBound with NestJS using the ConfigBoundModule for type-safe dependency injection.
---

# Use ConfigBound with NestJS <Badge type="tip" text="NestJS" />

The `@config-bound/nestjs` package provides a NestJS module for ConfigBound integration, making configuration available through dependency injection.

## Steps

**1. Install the package:**

```bash
npm install @config-bound/nestjs
```

**2. Define your configuration schema:**

```typescript
// config/app.config.ts
import { ConfigBound, configItem, configSection } from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound';
import Joi from 'joi';

export const AppConfig = await ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
      description: 'Application server port'
    }),
    database: configSection({
      host: configItem<string>({
        default: 'localhost',
        validator: Joi.string().hostname()
      }),
      port: configItem<number>({
        default: 5432,
        validator: Joi.number().port()
      })
    })
  },
  {
    binds: [new EnvVarBind({ prefix: 'APP' })]
  }
);

export type AppConfigType = typeof AppConfig;
```

**3. Import the module in your application:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigBoundModule } from '@config-bound/nestjs';
import { AppConfig } from './config/app.config';

@Module({
  imports: [
    ConfigBoundModule.forRoot(AppConfig)
  ]
})
export class AppModule {}
```

**4. Inject the configuration in your services:**

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigBoundService } from '@config-bound/nestjs';
import { AppConfigType } from './config/app.config';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigBoundService<AppConfigType>
  ) {}

  getPort(): number {
    return this.configService.get('port');
  }

  getDatabaseHost(): string {
    return this.configService.get('database', 'host');
  }
}
```

## Async configuration

For configurations that need to be loaded asynchronously (e.g., from a remote source), use `forRootAsync`:

```typescript
@Module({
  imports: [
    ConfigBoundModule.forRootAsync({
      useFactory: async () => {
        return await ConfigBound.createConfig(
          /* schema */,
          /* options */
        );
      }
    })
  ]
})
export class AppModule {}
```

## Related

- [`ConfigBoundModule` API reference](/reference/api/@config-bound.nestjs.Class.ConfigBoundModule)
- [`ConfigBoundService` API reference](/reference/api/@config-bound.nestjs.Class.ConfigBoundService)
- [Getting Started tutorial](/tutorials/getting-started)
