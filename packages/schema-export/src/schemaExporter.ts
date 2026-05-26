import { Section } from '@config-bound/core/section';
import { Element } from '@config-bound/core/element';
import { z } from 'zod';

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
 * Extracts a human-readable type string from a Zod schema.
 *
 * @param validator - Zod validator to inspect.
 * @returns Human-readable type string.
 */
function extractZodType(validator: z.ZodType): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeName = (validator as any)._def?.type;

  // Handle ZodOptional and ZodNullable wrappers
  if (typeName === 'optional' || typeName === 'nullable') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return extractZodType((validator as any)._def.innerType);
  }

  // Map common Zod type names to readable types
  switch (typeName) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enumValues = Object.values((validator as any)._def.entries ?? {});
      return enumValues.map((v) => String(v)).join(' | ');
    }
    case 'literal':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return String((validator as any)._def.value);
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    case 'union':
    case 'discriminatedUnion': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = (validator as any)._def.options;
      if (options) {
        return options.map((opt: z.ZodType) => extractZodType(opt)).join(' | ');
      }
      return 'union';
    }
    case 'any':
      return 'any';
    case 'unknown':
      return 'unknown';
    default:
      return typeName || 'unknown';
  }
}

/**
 * Converts a Zod validator to a JSON Schema representation.
 *
 * @param validator - Zod validator to convert.
 * @returns JSON Schema object.
 */
function extractZodValidation(validator: z.ZodType): unknown {
  return z.toJSONSchema(validator, {
    target: 'openapi-3.0',
    reused: 'inline'
  });
}

/**
 * Exports an Element to the external schema format.
 *
 * @param element - Element to export.
 * @returns Exported element representation.
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
 * Exports a Section to the external schema format.
 *
 * @param section - The section to export.
 * @param includeOmitted - Whether to include elements marked with omitFromSchema (default: false).
 * @returns Exported section representation.
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
 * Exports the complete schema to a structured format.
 *
 * @param name - Name of the configuration.
 * @param sections - Sections to include in the export.
 * @param includeOmitted - Whether to include elements marked with omitFromSchema (default: false).
 * @returns Exported schema representation.
 */
export function exportSchema(
  name: string,
  sections: ReadonlyArray<Section>,
  includeOmitted: boolean = false
): ExportedSchema {
  return {
    name,
    sections: sections.map((section) => exportSection(section, includeOmitted))
  };
}
