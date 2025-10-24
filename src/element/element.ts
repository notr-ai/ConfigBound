import Joi from 'joi';
import {
  ConfigInvalidException,
  ConfigUnsetException
} from '../utilities/errors';
import { Logger } from '../utilities/logger';
import { sanitizeName } from '../utilities/sanitizeNames';
import { ConfigValueProvider } from '../bind/configValueProvider';

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
   * The Joi validator of the Element
   */
  validator: Joi.AnySchema<T>;
  /**
   * The parent section name
   */
  private sectionName?: string;
  /**
   * Logger instance
   */
  private logger?: Logger;

  constructor(
    name: string,
    description?: string,
    defaultValue?: T,
    exampleValue?: T,
    sensitive: boolean = false,
    validator: Joi.AnySchema<T> = Joi.any<T>(),
    logger?: Logger
  ) {
    this.name = sanitizeName(name);
    this.description = description;
    this.validator = validator;
    this.logger = logger;

    // Ensure the default value is valid
    if (defaultValue) {
      const defaultValueResult = this.validator.validate(defaultValue);
      if (defaultValueResult.error) {
        throw new ConfigInvalidException(
          this.name,
          defaultValueResult.error.message
        );
      }
    }
    this.sensitive = sensitive;
    this.default = defaultValue;

    // Example values are not validated because they might use placeholder values that wouldn't validate.
    this.example = exampleValue;
  }

  /**
   * Sets the parent section name
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
   * Returns true if the Element is required
   */
  isRequired(): boolean {
    return this.validator._flags.presence === 'required';
  }

  /**
   * Retrieves the value of the element
   * @param valueProvider - The provider to use for retrieving values
   * @returns the value of the Element. If it's unset, then it returns undefined.
   */
  get<R>(valueProvider: ConfigValueProvider): R | undefined {
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
   * @throws {@link ConfigUnsetException ConfigUnsetException} if the value has not been set
   * @returns the value of the Element.
   */
  getOrThrow<R>(valueProvider: ConfigValueProvider): R {
    const value = this.get<R>(valueProvider);
    if (typeof value === 'undefined') {
      throw new ConfigUnsetException(this.name);
    }
    return value;
  }
}
