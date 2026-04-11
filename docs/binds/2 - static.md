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
- `null` is treated as unset and returns `undefined`
- If a nested value is `null`, resolution falls back to the flat key for that path

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

## Defaults vs StaticBind

`configItem({ default })` and `StaticBind` solve different problems:

- Use `default` for a schema-level fallback that applies everywhere
- Use `StaticBind` for runtime, programmatic overrides (for example, values derived from CLI args or test setup)
- `default` is only used when no bind provides a value
- `StaticBind` participates in bind priority and can be overridden by higher-priority binds

If your value is a simple constant fallback, prefer `default`.

## Sensitive Values

Avoid hardcoding secrets directly in `StaticBind` literals that live in source files.

- Prefer `EnvVarBind` or another runtime secret source for sensitive values
- Use `StaticBind` for non-sensitive defaults and programmatic overrides
- If you must pass sensitive values to `StaticBind`, inject them at runtime (for example, from a secret manager), not from committed code

## When to Use

- Inject CLI-derived values after argument parsing
- Provide deterministic values in tests without mutating `process.env`
- Apply programmatic overrides without changing schema defaults
