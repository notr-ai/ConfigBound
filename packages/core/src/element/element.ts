/**
 * Configuration element (leaf node) with validation and transformation
 * @module
 */

import { z } from 'zod';
import {
  ConfigInvalidException,
  ConfigUnsetException
} from '../utilities/errors';
import { Logger } from '../utilities/logger';
import { sanitizeName } from '../utilities/sanitizeNames';
import { ConfigValueProvider } from '../bind/configValueProvider';

/**
 * Options for constructing an {@link Element}.
 */
export interface ElementOptions<T> {
  /** The name of the element. Must be unique within its section. */
  name: string;
  /** A human-readable description of what this element configures. */
  description?: string;
  /** The default value used when no bind provides a value. */
  default?: T;
  /** An example value shown in exported schemas. Not validated. */
  example?: T;
  /** When `true`, the value is treated as sensitive (e.g. redacted in logs). */
  sensitive?: boolean;
  /** When `true`, the element is excluded from exported schemas. */
  omitFromSchema?: boolean;
  /** Zod validator applied to the resolved value. Defaults to `z.any()`. */
  validator?: z.ZodType<T>;
  /** Logger instance. Typically injected by the parent {@link Section}. */
  logger?: Logger;
}

/**
 * A Element is a single configuration option
 */
export class Element<T> {
  /**
   * The name of the Element
   */
  readonly name: string;
  /**
   * Whether the Element is sensitive
   */
  sensitive: boolean;
  /**
   * An optional description of the Element
   */
  description?: string;
  /**
   * The default value of the Element
   */
  default?: T;
  /**
   * An example value of the Element
   */
  example?: T;
  /**
   * Whether to omit the Element from the exported schema
   */
  omitFromSchema: boolean;
  /**
   * The Zod validator of the Element
   */
  validator: z.ZodType<T>;
  /**
   * The parent section name
   */
  private sectionName?: string;
  /**
   * Logger instance
   */
  private logger?: Logger;

  constructor(options: ElementOptions<T>) {
    const {
      name,
      description,
      sensitive = false,
      omitFromSchema = false,
      validator = z.any() as z.ZodType<T>,
      logger
    } = options;

    this.name = sanitizeName(name);
    this.description = description;
    this.omitFromSchema = omitFromSchema;
    this.validator = validator;
    this.logger = logger;
    this.sensitive = sensitive;

    if (options.default !== undefined) {
      const defaultValueResult = this.validator.safeParse(options.default);
      if (!defaultValueResult.success) {
        const errorMessage = defaultValueResult.error.issues
          .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
          .join('; ');
        throw new ConfigInvalidException(this.name, errorMessage);
      }
    }
    this.default = options.default;

    // Example values are not validated because they might use placeholder values that wouldn't validate.
    this.example = options.example;
  }

  /**
   * Sets the parent section name.
   *
   * @param sectionName - Name of the section this element belongs to.
   */
  setParentSection(sectionName: string): void {
    this.sectionName = sectionName;
  }

  /**
   * Sets the logger instance
   * @param logger - The logger to use
   */
  public setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Returns true if the Element is required.
   *
   * @returns `true` when no default value exists and the validator is not optional.
   */
  isRequired(): boolean {
    return !this.validator.isOptional();
  }

  /**
   * Retrieves the value of the element
   * @param valueProvider - The provider to use for retrieving values
   * @returns the value of the Element. If it's unset, then it returns undefined.
   */
  async get<R>(valueProvider: ConfigValueProvider): Promise<R | undefined> {
    if (!this.sectionName) {
      const error = new Error(
        `${this.name} is not associated with any section`
      );
      this.logger?.error(`Error getting value: ${error.message}`);
      throw error;
    }

    this.logger?.debug(
      `Getting value for ${this.sectionName}.${this.name} from value provider`
    );

    // Delegate to the valueProvider - it will handle validation and fallbacks
    return valueProvider.get<R>(this.sectionName, this.name);
  }

  /**
   * Retrieves the value of the element or throws an error if the value isn't found.
   * @param valueProvider - The provider to use for retrieving values
   * @throws ConfigUnsetException if the value has not been set
   * @returns the value of the Element.
   */
  async getOrThrow<R>(valueProvider: ConfigValueProvider): Promise<R> {
    const value = await this.get<R>(valueProvider);
    if (typeof value === 'undefined') {
      throw new ConfigUnsetException(this.name);
    }
    return value;
  }
}
