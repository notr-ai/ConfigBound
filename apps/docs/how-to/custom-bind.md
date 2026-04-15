---
description: Implement a custom bind to load ConfigBound configuration values from any source.
---

# Create a custom bind

A [bind](/reference/api/bind.bind.Class.Bind) is a source adapter: it knows how to retrieve a value for a given element.

The built-in binds ([`EnvVarBind`](./env-var-bind.md), [`FileBind`](./file-bind.md), [`StaticBind`](./static-bind.md)) cover environment variables, files, and in-memory values. When you need a different source that is not yet available, you can create your own.

## Steps

**1. Scaffold the bind:**

```bash
npx configbound generate bind <name>
```

When prompted, choose `embedded` for a bind that lives in your project, or `package` for one you intend to publish. See [`configbound generate bind`](/reference/cli/generate-bind) for all options, including `--dry-run` to preview the output first.

**2. Implement `create()`:**

The generator produces a class with a static async `create()` factory, a private constructor, and a `retrieve()` method. Fill in the body of `create()` to initialize your client and populate the map:

```typescript twoslash
import { Bind } from "@config-bound/config-bound/bind";
declare class SecretStoreClient {
  constructor(options: { token: string });
  read(path: string): Promise<{ data: Record<string, unknown> }>;
}
// ---cut---
interface SecretStoreBindOptions { token: string; }

export class SecretStoreBind extends Bind {
  private constructor(private readonly values: Map<string, unknown>) {
    super('SecretStore');
  }

  static async create(options: SecretStoreBindOptions): Promise<SecretStoreBind> {
    const values = new Map<string, unknown>();

    const client = new SecretStoreClient({ token: options.token });
    const secrets = await client.read('secret/myapp');

    for (const [key, value] of Object.entries(secrets.data)) {
      values.set(key, value);
    }

    return new SecretStoreBind(values);
  }

  async retrieve<T>(elementName: string): Promise<T | undefined> {
    return this.values.get(elementName) as T | undefined;
  }
}
```

All async work happens here, before the bind is constructed. `retrieve()` then reads from the already-populated map.

**3. Key values by element path:**

`retrieve()` receives a dot-path string that matches the element's position in the schema. Top-level elements use just the element name; elements inside sections use `section.element`:

```typescript twoslash
declare const values: Map<string, unknown>;
declare const secrets: { apiKey: string; dbPassword: string };
// ---cut---
// Schema: { apiKey: configItem(...) }
values.set('apiKey', secrets.apiKey);

// Schema: { database: configSection({ password: configItem(...) }) }
values.set('database.password', secrets.dbPassword);
```

The key must match the path exactly. A mismatch means `retrieve()` returns `undefined` and the element falls through to the next bind or its default.

**4. Register the bind:**

Call the factory before creating the config, then pass the instance to `ConfigBound.createConfig`:

```typescript twoslash
import { ConfigBound, configItem } from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import { Bind } from "@config-bound/config-bound/bind";
declare class SecretStoreBind extends Bind {
  static create(options: { token: string }): Promise<SecretStoreBind>;
  retrieve<T>(elementName: string): Promise<T | undefined>;
}
declare const process: { env: Record<string, string | undefined> };
const schema = { port: configItem<number>({ default: 3000 }) };
// ---cut---
const bind = await SecretStoreBind.create({ token: process.env.SECRET_STORE_TOKEN! });

const config = await ConfigBound.createConfig(schema, {
  binds: [bind]
});
```

## The factory pattern

`Bind.retrieve()` returns a `Promise`, but ConfigBound resolves all values during `createConfig()` — not lazily on demand. The async `create()` factory is the recommended pattern: fetch everything from the upstream source up front, store the values in an in-memory `Map`, and let `retrieve()` read from it. This keeps individual value lookups fast and avoids redundant network calls.

A practical consequence: if the upstream source is unavailable at startup, `create()` will throw before the config is created. Handle startup failures explicitly rather than letting them surface as missing config values later.

## Tradeoffs

| Mode | When to use |
| ---- | ----------- |
| `embedded` | Bind is specific to one project, not intended for reuse |
| `package` | Bind is general enough to publish or share across projects |

The `package` scaffold sets `"private": true` in `package.json`. Set it to `false` when you're ready to publish.

## Related

- [`configbound generate bind`](/reference/cli/generate-bind) — scaffold the boilerplate
- [`Bind` API reference](/reference/api/bind.bind.Class.Bind)
- [EnvVarBind](./env-var-bind.md), [FileBind](./file-bind.md), [StaticBind](./static-bind.md) — built-in binds for reference
