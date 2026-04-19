---
description: Serialize your ConfigBound schema to JSON or YAML for use in documentation, CI, or tooling.
---

# Export your configuration schema

The config schema already contains everything needed to describe your
configuration: structure, types, defaults, descriptions, and sensitivity flags.
Exporting it serializes what's already there — downstream tooling gets accurate,
up-to-date documentation without a separate maintenance step.

The `@config-bound/schema-export` package produces JSON and YAML output.

## Steps

**1. Install the package:**

```bash
npm install @config-bound/schema-export
```

**2. Export the schema and write it to disk:**

```typescript twoslash
// @types: node
import {
  ConfigBound,
  configItem,
  configSection,
  configEnum
} from "@config-bound/config-bound";
import { EnvVarBind } from "@config-bound/config-bound";
import {
  exportSchema,
  formatAsJSON,
  formatAsYAML
} from "@config-bound/schema-export";
import { z } from "zod";
import { writeFileSync } from "fs";

const config = await ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: z.number().port(),
      description: "Application server port",
      example: 8080
    }),
    environment: configEnum({
      values: ["development", "production"],
      default: "development",
      description: "Runtime environment"
    }),
    database: configSection(
      {
        host: configItem<string>({
          default: "localhost",
          validator: z.string().hostname(),
          description: "Database host"
        }),
        port: configItem<number>({
          default: 5432,
          validator: z.number().port(),
          description: "Database port"
        }),
        password: configItem<string>({
          validator: z.string().required(),
          description: "Database password",
          sensitive: true
        })
      },
      "Database configuration"
    )
  },
  {
    binds: [new EnvVarBind({ prefix: "MYAPP" })]
  }
);

const schema = exportSchema(config.name, config.sections);

writeFileSync("config-schema.json", formatAsJSON(schema));
writeFileSync("config-schema.yaml", formatAsYAML(schema));
```

Run this as part of your build or CI pipeline to keep the exported schema in sync
with the code.

## Control what's included

By default, `exportSchema` excludes elements marked `omitFromSchema: true`. Pass
`true` as the third argument to include them:

```typescript twoslash
import { ConfigBound, configItem } from "@config-bound/config-bound";
import { exportSchema } from "@config-bound/schema-export";
import { z } from "zod";
const config = await ConfigBound.createConfig(
  { port: configItem<number>({ default: 3000, validator: z.number() }) },
);
// ---cut---
const publicSchema = exportSchema(config.name, config.sections);
const fullSchema = exportSchema(config.name, config.sections, true);
```

Use `omitFromSchema` for config items that are internal implementation details —
values a consumer of your application doesn't need to know about:

```typescript
internalKey: configItem<string>({
  description: "Internal routing key",
  default: "default-key",
  omitFromSchema: true
})
```

## Format options

`formatAsJSON` produces pretty-printed JSON by default. Pass `false` to produce
compact output:

```typescript twoslash
import { ConfigBound, configItem } from "@config-bound/config-bound";
import { exportSchema, formatAsJSON } from "@config-bound/schema-export";
import { z } from "zod";
const config = await ConfigBound.createConfig(
  { port: configItem<number>({ default: 3000, validator: z.number() }) },
);
const schema = exportSchema(config.name, config.sections);
// ---cut---
const pretty = formatAsJSON(schema);         // indented
const compact = formatAsJSON(schema, false); // minified
```

`formatAsYAML` always produces human-readable YAML with no options.

## Related

- [`exportSchema` API reference](/reference/api/@config-bound.schema-export.Function.exportSchema)
- [Schema as the source of truth](/explanation/schema-source-of-truth.md)
