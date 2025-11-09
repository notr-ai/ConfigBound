# Exporting Configuration Schema

ConfigBound provides schema export functionality through the `@config-bound/schema-export` package. This is useful for:

- **Documentation generation**: Create structured docs from your config
- **Tooling integration**: Export schema for IDE plugins, validators, or other tools
- **Configuration discovery**: Programmatically inspect available config options
- **API documentation**: Include config requirements in your API docs

## Installation

The export functionality is provided by a separate package:

```bash
npm install @config-bound/schema-export
```

## Available Export Formats

ConfigBound supports exporting to:

- **JSON** - Structured data format for programmatic use
- **YAML** - Human-readable structured format

## Export Functions

### `exportSchema(name: string, sections: Section[], includeOmitted?: boolean)`

Returns the configuration schema as a structured JavaScript object.

```typescript
import { exportSchema } from '@config-bound/schema-export';

const schema = exportSchema(config.name, config.sections);
console.log(schema);
// {
//   name: 'app',
//   sections: [
//     {
//       name: 'app',
//       elements: [...]
//     }
//   ]
// }

// Include elements marked with omitFromSchema: true
const fullSchema = exportSchema(config.name, config.sections, true);
```

### `formatAsJSON(schema: ExportedSchema, pretty?: boolean)`

Exports the schema as a JSON string.

```typescript
import { exportSchema, formatAsJSON } from '@config-bound/schema-export';

const schema = exportSchema(config.name, config.sections);

// Pretty-printed JSON
const json = formatAsJSON(schema);
console.log(json);

// Compact JSON
const compact = formatAsJSON(schema, false);
```

### `formatAsYAML(schema: ExportedSchema)`

Exports the schema as a YAML string.

```typescript
import { exportSchema, formatAsYAML } from '@config-bound/schema-export';

const schema = exportSchema(config.name, config.sections);
const yaml = formatAsYAML(schema);
console.log(yaml);
```

## Complete Example

```typescript
import {
  ConfigBound,
  configItem,
  configSection,
  configEnum
} from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound';
import {
  exportSchema,
  formatAsJSON,
  formatAsYAML
} from '@config-bound/schema-export';
import Joi from 'joi';
import { writeFileSync } from 'fs';

const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
      description: 'Application server port',
      example: 8080
    }),
    environment: configEnum<'development' | 'production'>({
      values: ['development', 'production'],
      default: 'development',
      description: 'Runtime environment'
    }),
    database: configSection(
      {
        host: configItem<string>({
          default: 'localhost',
          validator: Joi.string().hostname(),
          description: 'Database host'
        }),
        port: configItem<number>({
          default: 5432,
          validator: Joi.number().port(),
          description: 'Database port'
        }),
        password: configItem<string>({
          validator: Joi.string().required(),
          description: 'Database password',
          sensitive: true
        })
      },
      'Database configuration'
    )
  },
  {
    binds: [new EnvVarBind({ prefix: 'MYAPP' })]
  }
);

// Export to different formats
const schema = exportSchema(config.name, config.sections);
writeFileSync('config-schema.json', formatAsJSON(schema));
writeFileSync('config-schema.yaml', formatAsYAML(schema));
```

## Private Configuration Elements

Elements marked with `omitFromSchema: true` are excluded from schema exports by default. This is useful for internal configuration that shouldn't be documented in public APIs:

```typescript
const config = ConfigBound.createConfig({
  port: configItem<number>({
    description: 'Server port',
    default: 3000
  }),
  internalApiKey: configItem<string>({
    description: 'Internal API key',
    default: 'secret-key',
    omitFromSchema: true // This won't appear in exports by default
  })
});

// Normal export - excludes internalApiKey
const publicSchema = exportSchema(config.name, config.sections);

// Full export - includes all elements
const fullSchema = exportSchema(config.name, config.sections, true);
```

## Use Cases

### Generate Documentation on Build

```typescript
// scripts/generate-config-docs.ts
import { config } from './config';
import {
  exportSchema,
  formatAsJSON,
  formatAsYAML
} from '@config-bound/schema-export';
import { writeFileSync } from 'fs';

const schema = exportSchema(config.name, config.sections);
writeFileSync('docs/config-schema.json', formatAsJSON(schema));
writeFileSync('docs/config-schema.yaml', formatAsYAML(schema));
console.log('✅ Configuration documentation generated');
```

### Validate Environment Variables

```typescript
import { exportSchema } from '@config-bound/schema-export';

// List all required config with no defaults
// Note: Environment variables use the prefix from EnvVarBind (e.g., "MYAPP_")
const schema = exportSchema(config.name, config.sections);
const requiredVars = schema.sections.flatMap((section) =>
  section.elements
    .filter((el) => el.required && el.default === undefined)
    .map((el) => `MYAPP_${section.name.toUpperCase()}_${el.name.toUpperCase()}`)
);

console.log('Required environment variables:', requiredVars);
```
