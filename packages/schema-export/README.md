# @config-bound/schema-export

Schema export utilities for ConfigBound configuration library.

## Installation

```bash
npm install @config-bound/schema-export
```

## Usage

```typescript
import { ConfigBound } from '@config-bound/config-bound';
import {
  exportSchema,
  formatAsJSON,
  formatAsYAML,
  formatAsEnvExample
} from '@config-bound/schema-export';

const config = ConfigBound.createConfig({
  // ... your config schema
});

// Export schema as structured object
const schema = exportSchema(config.name, config.sections);

// Export as JSON
const json = formatAsJSON(schema);

// Export as YAML
const yaml = formatAsYAML(schema);

// Export as .env.example file
const envExample = formatAsEnvExample(schema, 'MYAPP');
```

## API

### `exportSchema(name: string, sections: Section[], includeOmitted?: boolean)`

Exports the configuration schema as a structured JavaScript object.

### `formatAsJSON(schema: ExportedSchema, pretty?: boolean)`

Formats the schema as a JSON string. Defaults to pretty-printed format.

### `formatAsYAML(schema: ExportedSchema)`

Formats the schema as a YAML string.

### `formatAsEnvExample(schema: ExportedSchema, prefix?: string)`

Formats the schema as a `.env.example` file. The optional `prefix` parameter adds a prefix to all environment variable names (e.g., `'MYAPP'` will generate `MYAPP_SECTION_ELEMENT`).

## License

MIT
