# FileBind

Retrieves configuration values from JSON, JSONC, or YAML files.

## Constructor

```typescript
new FileBind({
  filePath: './config.yaml',
  format?: 'json' | 'jsonc' | 'yaml',
  rootKey?: 'path.to.subtree'
})
```

| Option     | Required | Description                                                              |
|------------|----------|--------------------------------------------------------------------------|
| `filePath` | Yes      | Path to the config file. Resolved to absolute via `path.resolve()`.      |
| `format`   | No       | Explicit format override. Auto-detected from extension when omitted.     |
| `rootKey`  | No       | Dot-separated path to scope into a subtree of the parsed file.           |

## Format Detection

| Extension         | Format |
|-------------------|--------|
| `.json`           | json   |
| `.jsonc`          | jsonc  |
| `.yml` / `.yaml`  | yaml   |

For other extensions, pass `format` explicitly:

```typescript
new FileBind({ filePath: './settings.conf', format: 'json' })
```

## Key Resolution

Element paths are resolved against the parsed file using nested-first lookup
with a flat-key fallback.

Given `config.json`:

```json
{
  "database": {
    "host": "localhost",
    "port": 5432
  }
}
```

- `"database.host"` resolves to `"localhost"` via nested traversal
- `"database.port"` resolves to `5432` via nested traversal

If the nested path doesn't exist, FileBind falls back to a flat key lookup.
Given:

```json
{
  "database.host": "flat-value"
}
```

- `"database.host"` resolves to `"flat-value"` via flat key

When both exist, nested wins.

## Null Handling

Explicit `null` values are treated as "not set" and return `undefined`,
allowing the next bind or element default to take over.

## rootKey

Scopes the bind into a subtree of the file:

```yaml
# config.yaml
wrapper:
  app:
    port: 3000
  database:
    host: db.local
```

```typescript
new FileBind({ filePath: './config.yaml', rootKey: 'wrapper' })
// "app.port"      → 3000
// "database.host" → "db.local"
```

## Reload

The file is read once at construction. Call `reload()` to re-read:

```typescript
const bind = new FileBind({ filePath: './config.yaml' });
// ... file changes on disk ...
bind.reload();
```

## Usage with ConfigBound

```typescript
import { ConfigBound, configItem, configSection } from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import { FileBind } from '@config-bound/config-bound/bind/binds/file';
import Joi from 'joi';

const config = ConfigBound.createConfig({
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port()
  }),
  database: configSection({
    host: configItem<string>({
      default: 'localhost',
      validator: Joi.string()
    })
  })
}, {
  // Env vars override file values (bind order = priority)
  binds: [
    new EnvVarBind({ prefix: 'MYAPP' }),
    new FileBind({ filePath: './config.yaml' })
  ]
});
```
