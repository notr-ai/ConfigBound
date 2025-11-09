import { ConfigValueProvider } from './bind/configValueProvider';
import { Bind } from './bind/bind';
import { Section } from './section/section';
import {
  ConfigInvalidException,
  ElementNotFoundException,
  SectionExistsException,
  SectionNotFoundException
} from './utilities/errors';
import { ConsoleLogger, Logger, NullLogger } from './utilities/logger';
import { sanitizeName } from './utilities/sanitizeNames';
import Joi from 'joi';
import { Element } from './element/element';

/**
 * Base schema type for individual config items
 */
export type ConfigItem<T = unknown> = {
  default?: T;
  description?: string;
  example?: T;
  sensitive?: boolean;
  omitFromSchema?: boolean;
  validator?: Joi.AnySchema<T>;
};

/**
 * Schema for nested sections
 */
export type ConfigSection<T = Record<string, unknown>> = {
  description?: string;
  properties: {
    [K in keyof T]: ConfigItem<T[K]>;
  };
};

// Main schema type that can have both top-level items and nested sections
export type ConfigSchema<T = Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? ConfigSection<T[K]>
    : ConfigItem<T[K]>;
};

// Helper type to separate sections from top-level items
type ExtractSections<T> = {
  [K in keyof T as T[K] extends ConfigSection<unknown>
    ? K
    : never]: T[K] extends ConfigSection<infer U> ? U : never;
};

type ExtractTopLevelItems<T> = {
  [K in keyof T as T[K] extends ConfigItem<unknown>
    ? K
    : never]: T[K] extends ConfigItem<infer V> ? V : never;
};

// Helper type to extract the actual config type from a schema
// Top-level ConfigItems go into 'app' section, ConfigSections stay as their own sections
export type InferConfigType<T> = ExtractSections<T> &
  (keyof ExtractTopLevelItems<T> extends never
    ? Record<string, never>
    : { app: ExtractTopLevelItems<T> });

// Helper functions for creating type-safe config items
/**
 * Creates a type-safe configuration item.
 * This helper provides better type inference and makes the schema more readable.
 *
 * @example
 * ```typescript
 * const config = ConfigBound.createConfig({
 *   port: configItem<number>({
 *     default: 3000,
 *     validator: Joi.number().port(),
 *     description: 'Server port',
 *     example: 8080
 *   })
 * });
 * ```
 */
export function configItem<T>(options: ConfigItem<T>): ConfigItem<T> {
  // Validate that default matches example if both are provided
  if (options.default !== undefined && options.example !== undefined) {
    if (options.validator) {
      const defaultResult = options.validator.validate(options.default);
      if (defaultResult.error) {
        throw new Error(
          `Invalid default value for config item: ${defaultResult.error.message}`
        );
      }
    }
  }
  return options;
}

/**
 * Helper for creating type-safe enum/union config items.
 * Automatically handles the Joi type casting for string enums.
 *
 * @example
 * ```typescript
 * const config = ConfigBound.createConfig({
 *   environment: configEnum<'development' | 'staging' | 'production'>({
 *     values: ['development', 'staging', 'production'],
 *     default: 'development',
 *     description: 'Runtime environment'
 *   })
 * });
 * ```
 */
export function configEnum<T extends string>(options: {
  values: readonly T[];
  default?: T;
  description?: string;
  example?: T;
  sensitive?: boolean;
}): ConfigItem<T> {
  return {
    default: options.default,
    description: options.description,
    example: options.example,
    sensitive: options.sensitive,
    validator: Joi.string().valid(
      ...options.values
    ) as unknown as Joi.AnySchema<T>
  };
}

/**
 * Creates a configuration section with multiple related items.
 * Sections help organize configuration into logical groups.
 *
 * @example
 * ```typescript
 * const config = ConfigBound.createConfig({
 *   database: configSection({
 *     host: configItem<string>({ default: 'localhost', validator: Joi.string() }),
 *     port: configItem<number>({ default: 5432, validator: Joi.number() })
 *   }, 'Database configuration')
 * });
 * ```
 */
export function configSection<T extends Record<string, unknown>>(
  properties: {
    [K in keyof T]: ConfigItem<T[K]>;
  },
  description?: string
): ConfigSection<T> {
  // Validate that all properties are valid ConfigItems
  if (!properties || typeof properties !== 'object') {
    throw new Error('configSection requires a properties object');
  }
  return {
    description,
    properties
  };
}

// Type-safe ConfigBound that provides full type inference from schema
export class TypedConfigBound<T extends ConfigSchema> {
  private configBound: ConfigBound;

  constructor(configBound: ConfigBound) {
    this.configBound = configBound;
  }

  get name() {
    return this.configBound.name;
  }
  get binds() {
    return this.configBound.binds;
  }
  get sections() {
    return this.configBound.sections;
  }

  addBind(bind: Bind): void {
    this.configBound.addBind(bind);
  }

  addSection(section: Section): void {
    this.configBound.addSection(section);
  }

  getSections(): Section[] {
    return this.configBound.getSections();
  }

  get<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): InferConfigType<T>[K][E] | undefined {
    return this.configBound.get<InferConfigType<T>[K][E]>(
      sectionName as string,
      elementName as string
    );
  }

  getOrThrow<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): InferConfigType<T>[K][E] {
    return this.configBound.getOrThrow<InferConfigType<T>[K][E]>(
      sectionName as string,
      elementName as string
    );
  }

  validate(): void {
    this.configBound.validate();
  }

  getValidationErrors(): Array<{ path: string; message: string }> {
    return this.configBound.getValidationErrors();
  }
}

/**
 * A ConfigBound is the top level object that contains all the {@link Section}s and {@link Bind}s.
 * It is used to retrieve the values of the {@link Element Elements} from its binds.
 * @see {@link docs 'docs/project/configBound.md'} for more information.
 */
export class ConfigBound implements ConfigValueProvider {
  readonly name: string;
  private logger: Logger;
  readonly binds: Bind[];
  readonly sections: Section[];

  constructor(
    name: string,
    binds: Bind[] = [],
    sections: Section[] = [],
    logger?: Logger
  ) {
    this.logger = logger ?? new ConsoleLogger();
    this.name = sanitizeName(name);
    this.binds = binds;
    this.sections = [];

    // Add sections after initialization so we can pass this as the config value provider
    if (sections.length > 0) {
      sections.forEach((section) => this.addSection(section));
    }
  }

  /**
   * Adds a Bind to the ConfigBound
   * @param bind - The Bind to add
   */
  public addBind(bind: Bind) {
    this.logger.debug(`Adding config bind: ${bind.name}`);
    this.binds.push(bind);
  }

  /**
   * Adds a Section to the ConfigBound
   * @param section - The Section to add
   */
  public addSection(section: Section) {
    this.logger.debug(`Adding config section: ${section.name}`);
    const sanitizedName = sanitizeName(section.name);
    if (this.sections.some((x) => x.name === sanitizedName)) {
      throw new SectionExistsException(sanitizedName);
    }

    section.setLogger(this.logger);
    section.setConfigValueProvider(this);

    this.sections.push(section);
  }

  /**
   * Gets the Sections of the ConfigBound
   * @returns The Sections
   */
  public getSections() {
    return this.sections;
  }

  /**
   * Gets the value of an Element using the first available Bind.
   *
   * **Error Handling:**
   * - Throws `SectionNotFoundException` if the section doesn't exist
   * - Throws `ElementNotFoundException` if the element doesn't exist in the section
   * - Throws `ConfigInvalidException` if the value fails validation
   * - Returns `undefined` if no value is found in any bind and no default exists
   *
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element, or undefined if not found
   * @throws {SectionNotFoundException} If section doesn't exist
   * @throws {ElementNotFoundException} If element doesn't exist in section
   * @throws {ConfigInvalidException} If value fails validation
   */
  public get<T = unknown>(
    sectionName: string,
    elementName: string
  ): T | undefined {
    this.logger.debug(`Getting value for ${sectionName}.${elementName}`);

    // Check if section exists
    const section = this.sections.find((x) => x.name === sectionName);
    if (!section) {
      throw new SectionNotFoundException(sectionName);
    }

    // Check if element exists
    const element = section.getElements().find((x) => x.name === elementName);
    if (!element) {
      throw new ElementNotFoundException(elementName);
    }

    // Try to get value from each Bind until one returns a value
    for (const bind of this.binds) {
      const value = bind.get<T>(sectionName, elementName);
      if (value !== undefined) {
        this.logger.trace?.(
          `Found value for ${sectionName}.${elementName} in ${bind.name}: ${element.sensitive ? '[MASKED]' : value}`
        );

        // Validate the value against the element's schema
        const validationResult = element.validator.validate(value);
        if (validationResult.error) {
          this.logger.error(
            `Value for ${sectionName}.${elementName} failed validation: ${validationResult.error.message}`
          );
          throw new ConfigInvalidException(
            `${sectionName}.${elementName}`,
            validationResult.error.message
          );
        }

        // Return the validated (and potentially transformed) value
        return validationResult.value as T;
      } else {
        this.logger.trace?.(
          `No value found for ${sectionName}.${elementName} in ${bind.name}`
        );
      }
    }

    // If no value found in binds but element has a default, use that
    if (element.default !== undefined) {
      this.logger.debug(
        `Using default value for ${sectionName}.${elementName}: ${element.sensitive ? '[MASKED]' : element.default}`
      );
      return element.default as unknown as T;
    }

    // If no bind returned a value, return undefined
    this.logger.debug(`No value found for ${sectionName}.${elementName}`);
    return undefined;
  }

  /**
   * Gets the value of an Element, throwing an error if the value is undefined.
   * This is useful for required configuration values.
   *
   * **Error Handling:**
   * - Throws `SectionNotFoundException` if the section doesn't exist
   * - Throws `ElementNotFoundException` if the element doesn't exist OR if no value is found
   * - Throws `ConfigInvalidException` if the value fails validation
   *
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element (never undefined)
   * @throws {SectionNotFoundException} If section doesn't exist
   * @throws {ElementNotFoundException} If element doesn't exist or value is undefined
   * @throws {ConfigInvalidException} If value fails validation
   */
  public getOrThrow<T = unknown>(sectionName: string, elementName: string): T {
    const value = this.get<T>(sectionName, elementName);
    if (value === undefined) {
      throw new ElementNotFoundException(elementName);
    }
    return value;
  }

  /**
   * Validates all configuration values eagerly without retrieving them.
   * This allows you to catch configuration errors at startup rather than at first access.
   *
   * @throws {ConfigInvalidException} if any value fails validation
   */
  public validate(): void {
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `  - ${e.path}: ${e.message}`)
        .join('\n');
      throw new ConfigInvalidException(
        'configuration',
        `Validation failed for ${errors.length} value(s):\n${errorMessages}`
      );
    }
  }

  /**
   * Gets all validation errors for the current configuration without throwing.
   * Useful for collecting all errors at once or implementing custom error handling.
   *
   * @returns Array of validation errors with path and message
   */
  public getValidationErrors(): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];

    for (const section of this.sections) {
      for (const element of section.getElements()) {
        try {
          // Try to get the value - this will trigger validation
          const value = this.get(section.name, element.name);

          // If element is required and value is undefined, that's an error
          if (element.isRequired() && value === undefined) {
            errors.push({
              path: `${section.name}.${element.name}`,
              message: `Required value is not set`
            });
          }
        } catch (error) {
          // If get() threw a ConfigInvalidException, capture it
          if (error instanceof ConfigInvalidException) {
            errors.push({
              path: `${section.name}.${element.name}`,
              message: error.message
            });
          } else {
            // Re-throw unexpected errors
            throw error;
          }
        }
      }
    }

    return errors;
  }

  /**
   * Creates a ConfigBound instance from a declarative schema with full type safety.
   * This is the recommended way to create configuration objects.
   *
   * @example
   * ```typescript
   * const config = ConfigBound.createConfig({
   *   port: {
   *     default: 3000,
   *     validator: Joi.number(),
   *     description: 'Server port'
   *   },
   *   database: {
   *     properties: {
   *       host: { default: 'localhost', validator: Joi.string() },
   *       port: { default: 5432, validator: Joi.number() }
   *     }
   *   }
   * });
   *
   * config.addBind(new EnvVarBind());
   * const port = config.get('app', 'port'); // Fully type-safe with autocomplete!
   * ```
   */
  public static createConfig<T extends ConfigSchema>(
    schema: T,
    options?: {
      name?: string;
      binds?: Bind[];
      logger?: Logger;
      validateOnInit?: boolean;
    }
  ): TypedConfigBound<T> {
    return ConfigBoundBuilder.build(schema, options);
  }
}

/**
 * Internal builder for creating ConfigBound instances.
 * Handles proper initialization order to avoid circular dependencies.
 */
class ConfigBoundBuilder {
  /**
   * Builds a ConfigBound instance from a schema
   */
  public static build<T extends ConfigSchema>(
    schema: T,
    options?: {
      name?: string;
      binds?: Bind[];
      logger?: Logger;
      validateOnInit?: boolean;
    }
  ): TypedConfigBound<T> {
    const configName = options?.name ?? 'app';
    const logger = options?.logger ?? new NullLogger();
    const binds = options?.binds ?? [];

    // Step 1: Create the ConfigBound instance (without sections)
    const configBound = new ConfigBound(configName, binds, [], logger);

    // Step 2: Build elements and sections from schema
    const sectionMap = this.buildSectionMap(schema, logger);

    // Step 3: Create sections and wire them to ConfigBound
    for (const [sectionName, sectionData] of sectionMap.entries()) {
      // Create section without passing configBound to avoid circular ref in constructor
      const section = new Section(
        sectionName,
        sectionData.elements,
        sectionData.description,
        logger
      );

      // Wire section to configBound through addSection (which handles the binding)
      configBound.addSection(section);
    }

    // Step 4: Validate if requested
    if (options?.validateOnInit) {
      configBound.validate();
    }

    return new TypedConfigBound<T>(configBound);
  }

  /**
   * Builds a map of section names to elements from the schema
   */
  private static buildSectionMap<T extends ConfigSchema>(
    schema: T,
    logger: Logger
  ): Map<string, { elements: Element<unknown>[]; description?: string }> {
    const sectionMap = new Map<
      string,
      { elements: Element<unknown>[]; description?: string }
    >();

    for (const [key, config] of Object.entries(schema)) {
      if ('properties' in config && config.properties) {
        // Nested object = new section
        const elements = this.buildElements(
          config.properties as Record<string, unknown>,
          logger
        );
        sectionMap.set(key, {
          elements,
          description: (config as ConfigSection).description
        });
      } else {
        // Top-level element goes in 'app' section
        const existing = sectionMap.get('app') ?? { elements: [] };
        const element = this.buildElement(
          key,
          config as ConfigItem<unknown>,
          logger
        );
        existing.elements.push(element);
        sectionMap.set('app', existing);
      }
    }

    return sectionMap;
  }

  /**
   * Builds an array of elements from properties object
   */
  private static buildElements(
    properties: Record<string, unknown>,
    logger: Logger
  ): Element<unknown>[] {
    const elements: Element<unknown>[] = [];
    for (const [propKey, propConfig] of Object.entries(properties)) {
      const element = this.buildElement(
        propKey,
        propConfig as ConfigItem<unknown>,
        logger
      );
      elements.push(element);
    }
    return elements;
  }

  /**
   * Builds a single element from config
   */
  private static buildElement(
    name: string,
    config: ConfigItem<unknown>,
    logger: Logger
  ): Element<unknown> {
    return new Element(
      name,
      config.description,
      config.default,
      config.example,
      config.sensitive ?? false,
      config.omitFromSchema ?? false,
      config.validator ?? Joi.any(),
      logger
    );
  }
}
