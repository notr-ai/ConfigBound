import { ExportedSchema } from './schemaExporter';

/**
 * Formats the schema as JSON string
 */
export function formatAsJSON(
  schema: ExportedSchema,
  pretty: boolean = true
): string {
  return JSON.stringify(schema, null, pretty ? 2 : 0);
}

/**
 * Formats the schema as YAML string
 * Note: Requires js-yaml to be installed
 */
export function formatAsYAML(schema: ExportedSchema): string {
  try {
    // Dynamic import to make js-yaml optional
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require('js-yaml');
    return yaml.dump(schema, {
      indent: 2,
      lineWidth: 80,
      noRefs: true
    });
  } catch (error: unknown) {
    throw new Error(
      'js-yaml is required for YAML export. Install it with: npm install js-yaml',
      { cause: error }
    );
  }
}
