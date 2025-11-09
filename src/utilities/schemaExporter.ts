import { Section } from '../section/section';
import { Element } from '../element/element';
import Joi from 'joi';

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
  joiValidation: unknown;
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
 * Extracts type information from a Joi schema
 */
function extractJoiType(validator: Joi.AnySchema): string {
  const describe = validator.describe();

  if (describe.type === 'alternatives') {
    const types =
      describe.matches?.map(
        (m: Joi.Description) => m.schema?.type || 'unknown'
      ) || [];
    return types.join(' | ') || 'any';
  }

  if (describe.type === 'string' && describe.allow) {
    const allowed = describe.allow;
    if (Array.isArray(allowed) && allowed.length > 0) {
      return allowed.map((v) => `'${v}'`).join(' | ');
    }
  }

  return describe.type || 'unknown';
}

/**
 * Extracts the raw Joi object from a schema
 */
function extractJoiValidation(validator: Joi.AnySchema): unknown {
  // Return the raw Joi schema description as a native object
  return validator.describe();
}

/**
 * Exports an Element to the external schema format
 */
export function exportElement(element: Element<unknown>): ExportedElement {
  return {
    name: element.name,
    description: element.description,
    type: extractJoiType(element.validator),
    default: element.default,
    example: element.example,
    required: element.isRequired(),
    sensitive: element.sensitive,
    joiValidation: extractJoiValidation(element.validator)
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
      .filter((element) => includeOmitted || !element.omitFromSchema)
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
