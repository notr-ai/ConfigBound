import yaml from 'js-yaml';
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
 */
export function formatAsYAML(schema: ExportedSchema): string {
  return yaml.dump(schema, {
    indent: 2,
    lineWidth: 80,
    noRefs: true
  });
}
