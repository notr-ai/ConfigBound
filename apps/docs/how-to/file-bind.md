---
description: Load configuration values from a JSON, JSONC, or YAML file using FileBind.
---

# Read configuration from a file

`FileBind` reads configuration values from a JSON, JSONC, or YAML file. The file
is read once at construction. Element paths are resolved against the parsed file
using nested keys first, falling back to flat dot-path keys.

## Steps

**1. Install the package if you haven't already:**

```bash
npm install @config-bound/config-bound
```

**2. Pass a `FileBind` to `ConfigBound.createConfig`:**

```typescript
import { ConfigBound, configItem, configSection } from "@config-bound/config-bound";
import { FileBind } from "@config-bound/config-bound";
import Joi from "joi";

const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port()
    }),
    database: configSection({
      host: configItem<string>({
        default: "localhost",
        validator: Joi.string()
      })
    })
  },
  {
    binds: [new FileBind({ filePath: "./config.yaml" })]
  }
);
```

**3. Write the config file:**

```yaml
# config.yaml
port: 8080
database:
  host: db.production.local
```

`FileBind` resolves `filePath` to an absolute path via `path.resolve()`, so
relative paths are resolved from the current working directory at the time the
bind is constructed.

## Format detection

The format is inferred from the file extension. If your file uses a non-standard
extension, pass `format` explicitly:

```typescript
new FileBind({ filePath: "./settings.conf", format: "json" })
```

| Extension        | Inferred format |
|------------------|-----------------|
| `.json`          | json            |
| `.jsonc`         | jsonc           |
| `.yml` / `.yaml` | yaml            |

## Scope to a subtree with `rootKey`

If your config file contains multiple applications or a wrapper structure, use
`rootKey` to scope the bind to a subtree:

```yaml
# config.yaml
wrapper:
  app:
    port: 3000
  database:
    host: db.local
```

```typescript
new FileBind({ filePath: "./config.yaml", rootKey: "wrapper" })
// "app.port"       -> 3000
// "database.host"  -> "db.local"
```

## Reload the file at runtime

The file is read once at construction. Call `reload()` to re-read it — useful
when the file changes while the process is running:

```typescript
const bind = new FileBind({ filePath: "./config.yaml" });
// ...later, after the file changes:
bind.reload();
```

## Null handling

Explicit `null` values in the file are treated as unset. The next bind in the
priority order, or the element's `default`, takes over.

## Related

- [`FileBind` API reference](/reference/api/bind.binds.file.Class.FileBind.md)
- [Use EnvVarBind](./env-var-bind.md) — read config from environment variables
- [Use StaticBind](./static-bind.md) — supply config values directly in code
