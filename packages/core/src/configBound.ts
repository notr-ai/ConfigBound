/**
 * ConfigBound runtime classes and factory.
 * @module
 */

import { ConfigValueProvider } from './bind/configValueProvider';
import { Bind } from './bind/bind';
import { Section } from './section/section';
import {
  ConfigInvalidException,
  ConfigUnsetException,
  ElementNotFoundException,
  SectionExistsException,
  SectionNotFoundException
} from './utilities/errors';
import {
  ConfigLoaderException,
  ConfigFileNotFoundException,
  ConfigFileIsDirectoryException,
  ExportNotFoundException,
  NoConfigBoundInstancesException,
  MultipleConfigBoundInstancesException,
  InvalidConfigBoundInstanceException,
  ConfigFileParseException,
  MissingDependencyException
} from './utilities/configLoaderErrors';
import { ConsoleLogger, Logger, NullLogger } from './utilities/logger';
import { sanitizeName } from './utilities/sanitizeNames';
import { z } from 'zod';
import { Element } from './element/element';
import {
  type ConfigItem,
  type ConfigSection,
  type ConfigSchema,
  type ConfigEnumOptions,
  type InferConfigType,
  configItem,
  configEnum,
  configSection
} from './schema';

export type {
  ConfigItem,
  ConfigSection,
  ConfigSchema,
  ConfigEnumOptions,
  InferConfigType
};
export { configItem, configEnum, configSection };

/**
 * The mode of the cache for the ConfigBound.
 * - `eager`: The cache is populated when the ConfigBound is created.
 * - `manual`: The cache is populated manually by calling `populateCache`.
 */
export type CacheMode = 'eager' | 'manual';

/**
 * Options for cache population in the ConfigBound.
 */
export interface CacheRefreshOptions {
  /** Ignores invalid values and stores them as undefined in the cache. */
  ignoreInvalid?: boolean;
}

/**
 * Options for creating a ConfigBound.
 */
export interface ConfigBoundCreateOptions {
  /** Name used for the created ConfigBound instance. */
  name?: string;
  /** Binds attached to the created ConfigBound instance. */
  binds?: Bind[];
  /** Logger used by ConfigBound and sections. */
  logger?: Logger;
  /** Validates configuration immediately after creation. */
  validateOnInit?: boolean;
  /**
   * Cache initialization strategy. Defaults to `eager`.
   *
   * - `eager`: Cache is populated at startup. Allows synchronous reads via `getFromCache()` immediately after `createConfig()` resolves — useful in constructors or other sync-only call sites that cannot `await`.
   * - `manual`: Cache is not populated until you explicitly call `populateCache()`. Use this when you only read config asynchronously via `get()` or `getOrThrow()` and want to avoid the upfront startup cost.
   */
  cacheMode?: CacheMode;
}

/**
 * A ConfigBound is the top level object that contains all the {@link Section}s and {@link Bind}s.
 * It is used to retrieve the values of the {@link Element Elements} from its binds.
 *
 * The optional `TSchema` generic parameter enables schema-driven type inference for all read methods.
 * When supplied, `get()`, `getOrThrow()`, `getFromCache()`, and `getOrThrowFromCache()` accept only
 * valid section/element names from the schema and return the corresponding inferred value type.
 */
export class ConfigBound<TSchema extends ConfigSchema = ConfigSchema> implements ConfigValueProvider {
  readonly name: string;
  private logger: Logger;
  private _binds: Bind[];
  private _sections: Section[];
  private valueCache: Map<string, unknown>;
  private cacheErrors: Map<string, Error>;
  private cacheReady: boolean;

  /** Configured binds in resolution order. */
  get binds(): ReadonlyArray<Bind> {
    return this._binds;
  }

  /** Configured sections. */
  get sections(): ReadonlyArray<Section> {
    return this._sections;
  }

  constructor(
    name: string,
    binds: Bind[] = [],
    sections: Section[] = [],
    logger?: Logger
  ) {
    this.logger = logger ?? new ConsoleLogger();
    this.name = sanitizeName(name);
    this._binds = [...binds];
    this._sections = [];
    this.valueCache = new Map<string, unknown>();
    this.cacheErrors = new Map<string, Error>();
    this.cacheReady = false;

    // Add sections after initialization so we can pass this as the config value provider
    if (sections.length > 0) {
      sections.forEach((section) => this.addSection(section));
    }
  }

  /**
   * Resets the cache of the ConfigBound to an empty state.
   */
  private resetCache(): void {
    this.valueCache.clear();
    this.cacheErrors.clear();
    this.cacheReady = false;
  }

  /**
   * Adds a Bind to the ConfigBound
   * @param bind - The Bind to add
   */
  public addBind(bind: Bind) {
    this.logger.debug(`Adding config bind: ${bind.name}`);
    this._binds.push(bind);
    this.resetCache();
  }

  /**
   * Adds a Section to the ConfigBound
   * @param section - The Section to add
   */
  public addSection(section: Section) {
    this.logger.debug(`Adding config section: ${section.name}`);
    const sanitizedName = sanitizeName(section.name);
    if (this._sections.some((x) => x.name === sanitizedName)) {
      throw new SectionExistsException(sanitizedName);
    }

    section.setLogger(this.logger);
    section.setConfigValueProvider(this);

    this._sections.push(section);
    this.resetCache();
  }

  /**
   * Gets the Sections of the ConfigBound
   * @returns The Sections
   */
  public getSections(): ReadonlyArray<Section> {
    return this._sections;
  }

  /**
   * Resolves a configuration value from binds/defaults.
   *
   * When the schema generic `TSchema` is specified, `sectionName` and `elementName` are
   * constrained to valid keys and the return type is inferred from the schema.
   *
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element, or undefined if not found
   * @throws SectionNotFoundException If section doesn't exist
   * @throws ElementNotFoundException If element doesn't exist in section
   * @throws ConfigInvalidException If value fails validation
   * @see {@link SectionNotFoundException}
   * @see {@link ElementNotFoundException}
   * @see {@link ConfigInvalidException}
   */
  public async get<
    K extends keyof InferConfigType<TSchema> & string,
    E extends keyof InferConfigType<TSchema>[K] & string
  >(sectionName: K, elementName: E): Promise<InferConfigType<TSchema>[K][E] | undefined>;
  public async get<V = unknown>(sectionName: string, elementName: string): Promise<V | undefined>;
  public async get(sectionName: string, elementName: string): Promise<unknown> {
    this.logger.debug(`Getting value for ${sectionName}.${elementName}`);

    const element = this.getElementOrThrow(sectionName, elementName);

    for (const bind of this._binds) {
      const value = await bind.get(sectionName, elementName);
      if (value !== undefined) {
        this.logger.trace?.(
          `Found value for ${sectionName}.${elementName} in ${bind.name}: ${element.sensitive ? '[MASKED]' : value}`
        );

        const validationResult = element.validator.safeParse(value);
        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues
            .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
          this.logger.error(
            `Value for ${sectionName}.${elementName} failed validation: ${errorMessage}`
          );
          throw new ConfigInvalidException(
            `${sectionName}.${elementName}`,
            errorMessage
          );
        }

        return validationResult.data;
      } else {
        this.logger.trace?.(
          `No value found for ${sectionName}.${elementName} in ${bind.name}`
        );
      }
    }

    if (element.default !== undefined) {
      this.logger.debug(
        `Using default value for ${sectionName}.${elementName}: ${element.sensitive ? '[MASKED]' : element.default}`
      );
      return element.default;
    }

    this.logger.debug(`No value found for ${sectionName}.${elementName}`);
    return undefined;
  }

  /**
   * Resolves a configuration value and throws when it is undefined.
   *
   * When the schema generic `TSchema` is specified, `sectionName` and `elementName` are
   * constrained to valid keys and the return type is inferred from the schema.
   *
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element (never undefined)
   * @throws SectionNotFoundException If section doesn't exist
   * @throws ElementNotFoundException If element doesn't exist in the section
   * @throws ConfigUnsetException If the element exists but has no value and no default
   * @throws ConfigInvalidException If value fails validation
   */
  public async getOrThrow<
    K extends keyof InferConfigType<TSchema> & string,
    E extends keyof InferConfigType<TSchema>[K] & string
  >(sectionName: K, elementName: E): Promise<InferConfigType<TSchema>[K][E]>;
  public async getOrThrow<V = unknown>(sectionName: string, elementName: string): Promise<V>;
  public async getOrThrow(sectionName: string, elementName: string): Promise<unknown> {
    const value = await this.get(sectionName, elementName);
    if (value === undefined) {
      throw new ConfigUnsetException(`${sectionName}.${elementName}`);
    }
    return value;
  }

  /**
   * Gets a cached element value without querying binds.
   *
   * Returns the value captured by the most recent {@link populateCache} call.
   * This method is synchronous and safe to call in contexts that cannot `await`,
   * such as class constructors.
   *
   * The returned value reflects the state of the configuration at the time
   * `populateCache()` last ran — it is not updated by subsequent {@link get} calls.
   * Call `populateCache()` again to refresh the snapshot (e.g. after `FileBind.reload()`).
   *
   * When the schema generic `TSchema` is specified, `sectionName` and `elementName` are
   * constrained to valid keys and the return type is inferred from the schema.
   *
   * @param sectionName - Section name containing the element.
   * @param elementName - Element name to read from cache.
   * @returns The cached value, or `undefined` when the element had no value at population time.
   * @throws SectionNotFoundException If the section does not exist.
   * @throws ElementNotFoundException If the element does not exist in the section.
   * @throws ConfigInvalidException If the cache is not ready or the element had a validation error at population time.
   */
  public getFromCache<
    K extends keyof InferConfigType<TSchema> & string,
    E extends keyof InferConfigType<TSchema>[K] & string
  >(sectionName: K, elementName: E): InferConfigType<TSchema>[K][E] | undefined;
  public getFromCache<V = unknown>(sectionName: string, elementName: string): V | undefined;
  public getFromCache(sectionName: string, elementName: string): unknown {
    this.getElementOrThrow(sectionName, elementName);
    this.assertCacheReady();
    const cacheKey = this.getCacheKey(sectionName, elementName);
    const cachedError = this.cacheErrors.get(cacheKey);
    if (cachedError) {
      throw cachedError;
    }
    return this.valueCache.get(cacheKey);
  }

  /**
   * Gets a cached element value and throws when the value is `undefined`.
   *
   * When the schema generic `TSchema` is specified, `sectionName` and `elementName` are
   * constrained to valid keys and the return type is inferred from the schema.
   *
   * @param sectionName - Section name containing the element.
   * @param elementName - Element name to read from cache.
   * @returns The cached value.
   * @throws SectionNotFoundException If the section does not exist.
   * @throws ElementNotFoundException If the element does not exist in the section.
   * @throws ConfigUnsetException If the element exists but has no cached value.
   * @throws ConfigInvalidException If the cache is not ready.
   * @throws Error Re-throws a cached validation error for this element, when present.
   */
  public getOrThrowFromCache<
    K extends keyof InferConfigType<TSchema> & string,
    E extends keyof InferConfigType<TSchema>[K] & string
  >(sectionName: K, elementName: E): InferConfigType<TSchema>[K][E];
  public getOrThrowFromCache<V = unknown>(sectionName: string, elementName: string): V;
  public getOrThrowFromCache(sectionName: string, elementName: string): unknown {
    const value = this.getFromCache(sectionName, elementName);
    if (value === undefined) {
      throw new ConfigUnsetException(`${sectionName}.${elementName}`);
    }
    return value;
  }

  /**
   * Populates the cache for all known elements.
   *
   * @param options - Cache population options.
   * @returns A promise that resolves when cache population is complete.
   * @throws ConfigInvalidException When an element value is invalid and `ignoreInvalid` is not enabled.
   * @throws SectionNotFoundException If a section lookup fails during population.
   * @throws ElementNotFoundException If an element lookup fails during population.
   */
  public async populateCache(options?: CacheRefreshOptions): Promise<void> {
    this.valueCache.clear();
    this.cacheErrors.clear();
    for (const section of this._sections) {
      for (const element of section.getElements()) {
        const cacheKey = this.getCacheKey(section.name, element.name);
        try {
          const value = await this.get(section.name, element.name);
          this.valueCache.set(cacheKey, value);
        } catch (error) {
          if (options?.ignoreInvalid && error instanceof ConfigInvalidException) {
            this.valueCache.set(cacheKey, undefined);
            this.cacheErrors.set(cacheKey, error);
            continue;
          }
          throw error;
        }
      }
    }
    this.cacheReady = true;
  }

  /**
   * Indicates whether the cache has been populated and is ready for cached reads.
   *
   * @returns `true` when cache population has completed; otherwise `false`.
   */
  public isCacheReady(): boolean {
    return this.cacheReady;
  }

  /**
   * Validates all configuration values eagerly without retrieving them.
   * This allows you to catch configuration errors at startup rather than at first access.
   *
   * @throws ConfigInvalidException if any value fails validation
   * @see {@link getValidationErrors} for information about how validation errors are returned
   * @see {@link ConfigInvalidException}
   */
  public async validate(): Promise<void> {
    const errors = await this.getValidationErrors();
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
  public async getValidationErrors(): Promise<Array<{ path: string; message: string }>> {
    const errors: Array<{ path: string; message: string }> = [];

    for (const section of this._sections) {
      for (const element of section.getElements()) {
        try {
          // Try to get the value - this will trigger validation
          const value = await this.get(section.name, element.name);

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
   * Resolves a section by name or throws when it does not exist.
   *
   * @param sectionName - Section name to resolve.
   * @returns The matching section instance.
   * @throws SectionNotFoundException If no section exists with the provided name.
   */
  private getSectionOrThrow(sectionName: string): Section {
    const section = this._sections.find((x) => x.name === sectionName);
    if (!section) {
      throw new SectionNotFoundException(sectionName);
    }
    return section;
  }

  /**
   * Resolves an element by section and element name or throws when missing.
   *
   * @param sectionName - Section containing the element.
   * @param elementName - Element name to resolve.
   * @returns The matching element instance.
   * @throws SectionNotFoundException If the section does not exist.
   * @throws ElementNotFoundException If the element does not exist in the section.
   */
  private getElementOrThrow(sectionName: string, elementName: string): Element<unknown> {
    const section = this.getSectionOrThrow(sectionName);
    const element = section.getElements().find((x) => x.name === elementName);
    if (!element) {
      throw new ElementNotFoundException(elementName);
    }
    return element;
  }

  /**
   * Builds the internal cache key for a section/element pair.
   *
   * @param sectionName - Section containing the element.
   * @param elementName - Element name.
   * @returns Dot-delimited cache key.
   */
  private getCacheKey(sectionName: string, elementName: string): string {
    return `${sectionName}.${elementName}`;
  }

  /**
   * Ensures cache reads are only allowed after cache population.
   *
   * @throws ConfigInvalidException If cache has not been populated yet.
   */
  private assertCacheReady(): void {
    if (!this.cacheReady) {
      throw new ConfigInvalidException(
        'ConfigBound',
        'Configuration cache is not ready. Call populateCache() and await completion before using getFromCache().'
      );
    }
  }

  /**
   * Creates a ConfigBound instance from a declarative schema with full type safety.
   * This is the recommended way to create configuration objects.
   *
   * @param schema - Declarative configuration schema.
   * @param options - Optional name, binds, logger, and cache mode.
   * @returns A fully initialized {@link ConfigBound} instance typed to the provided schema.
   * @example
   * ```typescript
   * const config = await ConfigBound.createConfig(
   *   {
   *     port: {
   *       default: 3000,
   *       validator: z.number(),
   *       description: 'Server port'
   *     },
   *     database: {
   *       properties: {
   *         host: { default: 'localhost', validator: z.string() },
   *         port: { default: 5432, validator: z.number() }
   *       }
   *     }
   *   },
   *   {
   *     binds: [await EnvVarBind.create()]
   *   }
   * );
   *
   * const port = await config.get('app', 'port'); // Fully type-safe with autocomplete!
   * ```
   */
  public static async createConfig<T extends ConfigSchema>(
    schema: T,
    options?: ConfigBoundCreateOptions
  ): Promise<ConfigBound<T>> {
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
   * @param schema - Declarative configuration schema.
   * @param options - Optional name, binds, logger, and cache mode.
   * @returns A fully initialized {@link ConfigBound} instance.
   */
  public static async build<T extends ConfigSchema>(
    schema: T,
    options?: ConfigBoundCreateOptions
  ): Promise<ConfigBound<T>> {
    const configName = options?.name ?? 'app';
    const logger = options?.logger ?? new NullLogger();
    const binds = options?.binds ?? [];
    const cacheMode = options?.cacheMode ?? 'eager';

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

    // Step 4: Eager mode pre-populates cache for immediate constructor-safe reads.
    if (cacheMode === 'eager') {
      await configBound.populateCache({ ignoreInvalid: true });
    }

    // Step 5: Validate if requested
    if (options?.validateOnInit) {
      await configBound.validate();
    }

    return configBound as ConfigBound<T>;
  }

  /**
   * Builds a map of section names to elements from the schema
   * @param schema - The schema to build the section map from
   * @param logger - The logger to use for logging
   * @returns A map of section names to elements
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
   * Builds an array of elements from a section properties object.
   *
   * @param properties - Raw section property definitions.
   * @param logger - Logger instance used by created elements.
   * @returns Array of created elements.
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
   * @param name - The name of the element.
   * @param config - The configuration for the element.
   * @param logger - The logger to use.
   * @returns The built element.
   */
  private static buildElement(
    name: string,
    config: ConfigItem<unknown>,
    logger: Logger
  ): Element<unknown> {
    return new Element({
      name,
      description: config.description,
      default: config.default,
      example: config.example,
      sensitive: config.sensitive ?? false,
      omitFromSchema: config.omitFromSchema ?? false,
      validator: config.validator ?? z.any(),
      logger
    });
  }

}

export {
  ConfigLoaderException,
  ConfigFileNotFoundException,
  ConfigFileIsDirectoryException,
  ExportNotFoundException,
  NoConfigBoundInstancesException,
  MultipleConfigBoundInstancesException,
  InvalidConfigBoundInstanceException,
  ConfigFileParseException,
  MissingDependencyException
};

export { Bind } from './bind/bind';
