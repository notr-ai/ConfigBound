import { InvalidNameException } from './errors';

/**
 * A regex for validating configuration component names
 */
const nameValidationRegex = new RegExp(
  '^[a-zA-Z0-9]+([a-zA-Z0-9_.-])*[a-zA-Z0-9]+$'
);

/**
 * Sanitizes a configuration component name
 * @param name - The name to sanitize
 * @returns The sanitized name
 */
export function sanitizeName(name: string): string {
  const trimmedName = name.trim();
  if (nameValidationRegex.test(trimmedName)) {
    return trimmedName;
  }
  throw new InvalidNameException(`"${name}" is not a valid name.`);
}
