import yaml from 'js-yaml';
import { ExportedSchema, ExportedElement } from './schemaExporter.js';

/**
 * Formats the schema as JSON string
 * @param schema - The schema to format
 * @param pretty - Whether to pretty print the JSON
 * @returns The configuration schema as a JSON string
 */
export function formatAsJSON(
  schema: ExportedSchema,
  pretty: boolean = true
): string {
  return JSON.stringify(schema, null, pretty ? 2 : 0);
}

/**
 * Formats the schema as YAML string
 * @param schema - The schema to format
 * @returns The configuration schema as a YAML string
 */
export function formatAsYAML(schema: ExportedSchema): string {
  return yaml.dump(schema, {
    indent: 2,
    lineWidth: 80,
    noRefs: true
  });
}

/**
 * Generates an environment variable name from section and element names
 * @param sectionName - The name of the section
 * @param elementName - The name of the element
 * @param prefix - Optional prefix for the environment variable name
 * @returns The environment variable name
 */
function generateEnvVarName(
  sectionName: string,
  elementName: string,
  prefix?: string
): string {
  let name = `${sectionName}_${elementName}`.replace(/\./g, '_');
  if (prefix) {
    name = `${prefix}_${name}`;
  }
  return name.toUpperCase();
}

/**
 * Formats a value for display in .env.example file
 * @param element - The element to format
 * @returns The formatted value
 */
function formatEnvValue(element: ExportedElement): string {
  if (element.sensitive) {
    if (element.example !== undefined) {
      return 'your-example-value';
    }
    return 'your-secret-value';
  }

  if (element.example !== undefined) {
    return String(element.example);
  }

  if (element.default !== undefined) {
    return String(element.default);
  }

  switch (element.type) {
    case 'string':
      return 'your-value';
    case 'number':
      return '0';
    case 'boolean':
      return 'true';
    case 'array':
      return 'value1,value2';
    default:
      return 'your-value';
  }
}

/**
 * Formats the schema as a .env.example file
 * @param schema - The exported schema
 * @param prefix - Optional prefix for environment variable names (e.g., 'MYAPP')
 * @returns The .env.example file content as a string
 */
export function formatAsEnvExample(
  schema: ExportedSchema,
  prefix?: string
): string {
  const lines: string[] = [];

  lines.push(`# ${schema.name} Configuration`);
  lines.push('# Generated from schema export');
  lines.push('');

  for (const section of schema.sections) {
    if (section.description) {
      lines.push(`# ${section.description}`);
    }

    for (const element of section.elements) {
      const envVarName = generateEnvVarName(section.name, element.name, prefix);
      const value = formatEnvValue(element);
      const isRequired = element.required && element.default === undefined;

      if (element.description) {
        lines.push(
          `# ${element.description}${isRequired ? ' (required)' : ''}`
        );
      } else if (isRequired) {
        lines.push('# Required');
      }

      lines.push(`${envVarName}=${value}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
