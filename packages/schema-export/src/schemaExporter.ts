import { Section } from '@config-bound/config-bound/section';
import { Element } from '@config-bound/config-bound/element';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Represents a single configuration element in the exported schema
 */
export interface ExportedElement {
  name: string;
  description?: string;
  type: string;
  default?: unknown;
  example?: unknown;
  required: boolean;
  sensitive: boolean;
  zodValidation: unknown;
}

/**
 * Represents a configuration section in the exported schema
 */
export interface ExportedSection {
  name: string;
  description?: string;
  elements: ExportedElement[];
}

/**
 * The complete exported configuration schema
 */
export interface ExportedSchema {
  name: string;
  sections: ExportedSection[];
}

/**
 * Extracts type information from a Zod schema
 */
function extractZodType(validator: z.ZodType): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeName = (validator as any)._def.typeName;

  // Handle ZodOptional and ZodNullable wrappers
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return extractZodType((validator as any)._def.innerType);
  }

  // Map common Zod type names to readable types
  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodEnum': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enumValues = (validator as any)._def.values;
      return enumValues.map((v: string) => `'${v}'`).join(' | ');
    }
    case 'ZodLiteral':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return `'${(validator as any)._def.value}'`;
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = (validator as any)._def.options;
      if (options) {
        return options.map((opt: z.ZodType) => extractZodType(opt)).join(' | ');
      }
      return 'union';
    }
    case 'ZodAny':
      return 'any';
    case 'ZodUnknown':
      return 'unknown';
    default:
      return typeName?.replace('Zod', '').toLowerCase() || 'unknown';
  }
}

/**
 * Extracts the validation schema from a Zod validator as JSON Schema
 */
function extractZodValidation(validator: z.ZodType): unknown {
  return zodToJsonSchema(validator, {
    target: 'openApi3',
    $refStrategy: 'none'
  });
}

/**
 * Exports an Element to the external schema format
 */
export function exportElement(element: Element<unknown>): ExportedElement {
  return {
    name: element.name,
    description: element.description,
    type: extractZodType(element.validator),
    default: element.default,
    example: element.example,
    required: element.isRequired(),
    sensitive: element.sensitive,
    zodValidation: extractZodValidation(element.validator)
  };
}

/**
 * Exports a Section to the external schema format
 * @param section - The section to export
 * @param includeOmitted - Whether to include elements marked with omitFromSchema (default: false)
 */
export function exportSection(
  section: Section,
  includeOmitted: boolean = false
): ExportedSection {
  return {
    name: section.name,
    description: section.description,
    elements: section
      .getElements()
      .filter(
        (element: Element<unknown>) => includeOmitted || !element.omitFromSchema
      )
      .map(exportElement)
  };
}

/**
 * Exports the complete schema to a structured format
 * @param name - The name of the configuration
 * @param sections - Array of sections to export
 * @param includeOmitted - Whether to include elements marked with omitFromSchema (default: false)
 */
export function exportSchema(
  name: string,
  sections: Section[],
  includeOmitted: boolean = false
): ExportedSchema {
  return {
    name,
    sections: sections.map((section) => exportSection(section, includeOmitted))
  };
}
