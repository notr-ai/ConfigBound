import { Bind } from '../bind';
import { ConfigInvalidException } from '../../utilities/errors';

/**
 * A Bind that retrieves the value of an environment variable.
 */
export class EnvVarBind extends Bind {
  private envVarPrefix?: string;
  private customEnvVarName?: (elementPath: string) => string;

  constructor(options?: {
    prefix?: string;
    customEnvVarName?: (elementPath: string) => string;
  }) {
    super('EnvironmentVariable');

    if (options?.prefix && options?.customEnvVarName) {
      throw new ConfigInvalidException('EnvVarBind', 'Cannot specify both prefix and customEnvVarName. They are mutually exclusive.');
    }

    this.envVarPrefix = options?.prefix;
    this.customEnvVarName = options?.customEnvVarName;
  }

  /**
   * Retrieves the value of the environment variable
   * @param fullName The full name of the element in format sectionName.elementName
   * @returns The value of the environment variable.
   */
  retrieve<T>(fullName: string): T | undefined {
    // Use custom function if provided, otherwise use default naming convention
    const envVarName = this.customEnvVarName
      ? this.customEnvVarName(fullName)
      : this.getEnvVarName(fullName);

    const envVarValue = process.env[envVarName];

    if (envVarValue === undefined) {
      return undefined;
    }

    // Try to convert the string value to the appropriate type
    return this.convertValue<T>(envVarValue);
  }

  /**
   * Convert a string value to the appropriate type
   * @param value - The string value to convert
   * @returns The converted value
   */
  private convertValue<T>(value: string): T {
    // Try to parse as number if it looks like a number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      // If it's an integer
      if (/^-?\d+$/.test(value)) {
        return Number.parseInt(value, 10) as unknown as T;
      }
      // If it's a float
      return Number.parseFloat(value) as unknown as T;
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') {
      return true as unknown as T;
    }
    if (value.toLowerCase() === 'false') {
      return false as unknown as T;
    }

    // Try to parse as JSON array or object
    if (
      (value.startsWith('[') && value.endsWith(']')) ||
      (value.startsWith('{') && value.endsWith('}'))
    ) {
      try {
        return JSON.parse(value) as T;
      } catch {
        // If parsing fails, return as string
      }
    }

    // Return as string by default
    return value as unknown as T;
  }

  /**
   * Gets the name of the environment variable using the default naming convention.
   * @param elementPath The element path in format sectionName.elementName
   * @returns The name of the environment variable.
   */
  private getEnvVarName(elementPath: string): string {
    let name = elementPath.replace(/\./g, '_'); // Replace dots with underscores
    if (this.envVarPrefix) {
      name = `${this.envVarPrefix}_${name}`;
    }
    return name.toUpperCase();
  }
}
