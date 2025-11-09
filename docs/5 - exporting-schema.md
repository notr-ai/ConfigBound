# Exporting Configuration Schema

ConfigBound provides built-in methods to export your configuration schema to various formats. This is useful for:

- **Documentation generation**: Create structured docs from your config
- **Tooling integration**: Export schema for IDE plugins, validators, or other tools
- **Configuration discovery**: Programmatically inspect available config options
- **API documentation**: Include config requirements in your API docs

## Available Export Formats

ConfigBound supports exporting to:

- **JSON** - Structured data format for programmatic use
- **YAML** - Human-readable structured format

## Export Methods

All export methods are available on `ConfigBound` instances:

### `exportSchema(includeOmitted: boolean = false)`

Returns the configuration schema as a structured JavaScript object.

```typescript
const schema = config.exportSchema();
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
const fullSchema = config.exportSchema(true);
```

### `toJSON(pretty: boolean = true, includeOmitted: boolean = false)`

Exports the schema as a JSON string.

```typescript
// Pretty-printed JSON
const json = config.toJSON();
console.log(json);

// Compact JSON
const compact = config.toJSON(false);

// Include omitted elements
const fullJson = config.toJSON(true, true);
```

### `toYAML(includeOmitted: boolean = false)`

Exports the schema as a YAML string. Requires `js-yaml` to be installed.

```typescript
const yaml = config.toYAML();
console.log(yaml);

// Include omitted elements
const fullYaml = config.toYAML(true);
```

**Note**: `js-yaml` is an optional dependency. If you want to use YAML export, install it:

```bash
npm install js-yaml
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
writeFileSync('config-schema.json', config.toJSON());
writeFileSync('config-schema.yaml', config.toYAML());
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
const publicSchema = config.exportSchema();

// Full export - includes all elements
const fullSchema = config.exportSchema(true);
```

## Use Cases

### Generate Documentation on Build

```typescript
// scripts/generate-config-docs.ts
import { config } from './config';
import { writeFileSync } from 'fs';

writeFileSync('docs/CONFIGURATION.md', config.toMarkdown());
console.log('✅ Configuration documentation generated');
```

### Validate Environment Variables

```typescript
// List all required config with no defaults
// Note: Environment variables use the prefix from EnvVarBind (e.g., "MYAPP_")
const schema = config.exportSchema();
const requiredVars = schema.sections.flatMap((section) =>
  section.elements
    .filter((el) => el.required && el.default === undefined)
    .map((el) => `MYAPP_${section.name.toUpperCase()}_${el.name.toUpperCase()}`)
);

console.log('Required environment variables:', requiredVars);
```
