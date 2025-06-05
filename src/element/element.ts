import Joi from 'joi';
import {
  ConfigInvalidException,
  ConfigUnsetException
} from '../utilities/errors';
import { Logger } from '../utilities/logger';
import { sanitizeName } from '../utilities/sanitizeNames';
import { BindContext } from '../bind/bindContext';

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
   * The value of the Element
   */
  value?: T;
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
   * Set the value of Element
   * @param value - The value of the element
   */
  set(value?: T): void {
    const result = this.validator.validate(value);
    if (result.error) {
      throw new ConfigInvalidException(this.name, result.error.message);
    }
    this.value = result.value ?? this.default;
  }

  /**
   * Retrieves the value of the element
   * @param bindContext - The context to use for retrieving values
   * @returns the value of the Element. If it's unset, then it returns undefined.
   */
  get<R>(bindContext: BindContext): R | undefined {
    // First check if we have a locally set value
    if (this.value !== undefined) {
      this.logger?.trace?.(
        `Using locally set value for ${this.sectionName}.${this.name}: ${this.sensitive ? '[MASKED]' : this.value}`
      );
      return this.value as unknown as R;
    }
    // Otherwise try to get from the bind context
    if (!this.sectionName) {
      const error = new Error(
        `${this.name} is not associated with any section`
      );
      this.logger?.error(`Error getting value: ${error.message}`);
      throw error;
    }
    this.logger?.debug(
      `Getting value for ${this.sectionName}.${this.name} from bind context`
    );
    // Use the bindContext to get the value (validation happens at ConfigBound level)
    const contextValue = bindContext.get<R>(this.sectionName, this.name);
    // If we got a value from context, return it
    if (contextValue !== undefined) {
      this.logger?.trace?.(
        `Found value in context for ${this.sectionName}.${this.name}: ${this.sensitive ? '[MASKED]' : contextValue}`
      );
      return contextValue;
    }
    // If no value in context but we have a default, use that
    if (this.default !== undefined) {
      this.logger?.trace?.(
        `Using default value for ${this.sectionName}.${this.name}: ${this.sensitive ? '[MASKED]' : this.default}`
      );
      return this.default as unknown as R;
    }
    // Otherwise return undefined
    this.logger?.debug(`No value found for ${this.sectionName}.${this.name}`);
    return undefined;
  }

  /**
   * Retrieves the value of the element or throws an error if the value isn't found.
   * @param bindContext - The context to use for retrieving values
   * @throws {@link ConfigUnsetException ConfigUnsetException} if the value has not been set
   * @returns the value of the Element.
   */
  getOrThrow<R>(bindContext: BindContext): R {
    const value = this.get<R>(bindContext);
    if (typeof value === 'undefined') {
      throw new ConfigUnsetException(this.name);
    }
    return value;
  }
}
