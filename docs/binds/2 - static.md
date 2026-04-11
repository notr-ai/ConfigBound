# StaticBind

Retrieves configuration values from an in-memory object literal.

## Constructor

```typescript
new StaticBind(values?: Record<string, unknown>)
```

## Key Resolution

`StaticBind` supports both nested objects and flat dot-path keys.

```typescript
new StaticBind({
  app: { port: 3000 },
  'database.host': 'db.local'
});
```

- `"app.port"` resolves from nested traversal
- `"database.host"` resolves from the flat key
- When both nested and flat values exist for the same path, nested wins

## Usage with ConfigBound

```typescript
import { ConfigBound, configItem, configSection } from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import { StaticBind } from '@config-bound/config-bound/bind/binds/static';
import Joi from 'joi';

const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      validator: Joi.number().port()
    }),
    database: configSection({
      host: configItem<string>({
        validator: Joi.string()
      })
    })
  },
  {
    // Bind order is priority: earlier binds override later binds.
    binds: [
      new StaticBind({
        'app.port': 8080
      }),
      new EnvVarBind({ prefix: 'MYAPP' })
    ]
  }
);
```

## When to Use

- Inject CLI-derived values after argument parsing
- Provide deterministic values in tests without mutating `process.env`
- Apply programmatic overrides without changing schema defaults
