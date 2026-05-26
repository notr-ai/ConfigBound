/**
 * Main ConfigBound class and configuration builder functions
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

/**
 * Base schema type for individual config items
 */
export type ConfigItem<T = unknown> = {
  /** Default value used when no bind provides a value. */
  default?: T;
  /** Human-readable description used in generated docs and schema output. */
  description?: string;
  /** Example value shown in generated docs and schema output. */
  example?: T;
  /** Marks the value as sensitive for masking in logs and outputs. */
  sensitive?: boolean;
  /** Excludes this item from generated schema output when true. */
  omitFromSchema?: boolean;
  /** Validation schema used to validate and optionally transform values. */
  validator?: z.ZodType<T>;
};

/**
 * Schema for nested sections
 */
export type ConfigSection<T = Record<string, unknown>> = {
  /** Human-readable section description used in generated docs and schema output. */
  description?: string;
  /** Section properties keyed by configuration item name. */
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
 * Options for creating a string enum/union configuration item.
 */
export interface ConfigEnumOptions<Values extends readonly string[]> {
  /** Allowed string values for the enum/union item. */
  values: Values;
  /** Default value used when no bind provides a value. */
  default?: Values[number];
  /** Human-readable description used in generated docs and schema output. */
  description?: string;
  /** Example value shown in generated docs and schema output. */
  example?: Values[number];
  /** Marks the value as sensitive for masking in logs and outputs. */
  sensitive?: boolean;
}

/** @internal */
type ExtractSections<T> = {
  [K in keyof T as T[K] extends ConfigSection<unknown>
    ? K
    : never]: T[K] extends ConfigSection<infer U> ? U : never;
};

/** @internal */
type ExtractTopLevelItems<T> = {
  [K in keyof T as T[K] extends ConfigItem<unknown>
    ? K
    : never]: T[K] extends ConfigItem<infer V> ? V : never;
};

/**
 * Extracts the runtime config shape from a schema.
 * Top-level {@link ConfigItem} values are grouped under the `app` section,
 * while {@link ConfigSection} values remain as their own named sections.
 */
export type InferConfigType<T> = ExtractSections<T> &
  (keyof ExtractTopLevelItems<T> extends never
    ? Record<string, never>
    : { app: ExtractTopLevelItems<T> });

/**
 * Creates a type-safe configuration item.
 * This helper provides better type inference and makes the schema more readable.
 *
 * @param options - Configuration item definition including default, validator, description, and example.
 * @returns The same options object, typed as {@link ConfigItem}.
 * @example
 * ```typescript
 * const port = configItem({
 *   default: 3000,
 *   validator: z.number().int().min(0).max(65535),
 *   description: 'Server port',
 *   example: 8080
 * });
 * ```
 */
export function configItem<T>(options: ConfigItem<T>): ConfigItem<T> {
  if (options.default !== undefined && options.validator) {
    const defaultResult = options.validator.safeParse(options.default);
    if (!defaultResult.success) {
      const errorMessage = defaultResult.error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new Error(`Invalid default value for config item: ${errorMessage}`);
    }
  }
  return options;
}

/**
 * Helper for creating type-safe enum/union config items.
 * Automatically handles the Zod type for string enums.
 *
 * @param options - Enum item configuration options.
 * @returns A typed config item whose validator accepts only the provided enum values.
 *
 * @example
 * ```typescript
 * const config = await ConfigBound.createConfig({
 *   environment: configEnum({
 *     values: ['development', 'staging', 'production'],
 *     default: 'development',
 *     description: 'Runtime environment'
 *   })
 * });
 * ```
 */
export function configEnum<const Values extends readonly string[]>(
  options: ConfigEnumOptions<Values>
): ConfigItem<Values[number]> {
  return {
    default: options.default,
    description: options.description,
    example: options.example,
    sensitive: options.sensitive,
    validator: z.enum(options.values as unknown as [string, ...string[]]) as z.ZodType<Values[number]>
  };
}

/**
 * Creates a configuration section with multiple related items.
 * Sections help organize configuration into logical groups.
 *
 * @param properties - Section item definitions keyed by item name.
 * @param description - Optional human-readable description for the section.
 * @returns A typed section definition ready for `createConfig`.
 * @throws Error When `properties` is not a valid object.
 *
 * @example
 * ```typescript
 * const config = await ConfigBound.createConfig({
 *   database: configSection({
 *     host: configItem<string>({ default: 'localhost', validator: z.string() }),
 *     port: configItem<number>({ default: 5432, validator: z.number() })
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

/**
 * Typed wrapper around {@link ConfigBound} with schema-driven type inference.
 * Provides strongly typed section and element access based on the supplied schema.
 */
export class TypedConfigBound<T extends ConfigSchema> {
  private configBound: ConfigBound;

  /**
   * Creates a typed ConfigBound wrapper.
   *
   * @param configBound - Underlying untyped ConfigBound instance.
   */
  constructor(configBound: ConfigBound) {
    this.configBound = configBound;
  }

  /**
   * Gets the instance name.
   *
   * @returns ConfigBound instance name.
   */
  get name() {
    return this.configBound.name;
  }
  /**
   * Gets configured binds in resolution order.
   *
   * @returns Config binds.
   */
  get binds() {
    return this.configBound.binds;
  }
  /**
   * Gets configured sections.
   *
   * @returns Config sections.
   */
  get sections() {
    return this.configBound.sections;
  }

  /**
   * Adds a bind and invalidates cache state.
   *
   * @param bind - Bind to append.
   */
  addBind(bind: Bind): void {
    this.configBound.addBind(bind);
  }

  /**
   * Adds a section and invalidates cache state.
   *
   * @param section - Section to append.
   */
  addSection(section: Section): void {
    this.configBound.addSection(section);
  }

  /**
   * Returns all configured sections.
   *
   * @returns Config sections.
   */
  getSections(): ReadonlyArray<Section> {
    return this.configBound.getSections();
  }

  /**
   * Resolves a configuration value from binds/defaults.
   *
   * @param sectionName - Section containing the requested element.
   * @param elementName - Element to resolve.
   * @returns Resolved value or `undefined` when not set.
   */
  async get<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): Promise<InferConfigType<T>[K][E] | undefined> {
    return this.configBound.get<InferConfigType<T>[K][E]>(
      sectionName as string,
      elementName as string
    );
  }

  /**
   * Resolves a configuration value and throws when it is undefined.
   *
   * @param sectionName - Section containing the requested element.
   * @param elementName - Element to resolve.
   * @returns Resolved value.
   * @throws ConfigUnsetException If the element exists but has no value and no default.
   */
  async getOrThrow<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): Promise<InferConfigType<T>[K][E]> {
    return this.configBound.getOrThrow<InferConfigType<T>[K][E]>(
      sectionName as string,
      elementName as string
    );
  }

  /**
   * Validates all configured values.
   *
   * @returns A promise that resolves when validation succeeds.
   */
  async validate(): Promise<void> {
    return this.configBound.validate();
  }

  /**
   * Returns all validation errors without throwing.
   *
   * @returns Validation error list.
   */
  async getValidationErrors(): Promise<Array<{ path: string; message: string }>> {
    return this.configBound.getValidationErrors();
  }

  /**
   * Reads a configuration value from the in-memory cache only.
   *
   * @param sectionName - Section containing the requested element.
   * @param elementName - Element name to read from cache.
   * @returns Cached value when present; otherwise `undefined`.
   */
  getFromCache<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): InferConfigType<T>[K][E] | undefined {
    return this.configBound.getFromCache<InferConfigType<T>[K][E]>(
      sectionName as string,
      elementName as string
    );
  }

  /**
   * Reads a configuration value from cache and throws when it is undefined.
   *
   * @param sectionName - Section containing the requested element.
   * @param elementName - Element name to read from cache.
   * @returns Cached value.
   */
  getOrThrowFromCache<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): InferConfigType<T>[K][E] {
    return this.configBound.getOrThrowFromCache<InferConfigType<T>[K][E]>(
      sectionName as string,
      elementName as string
    );
  }

  /**
   * Populates the cache for all elements in the schema.
   *
   * @param options - Cache population behavior options.
   */
  async populateCache(options?: CacheRefreshOptions): Promise<void> {
    await this.configBound.populateCache(options);
  }

  /**
   * Indicates whether cached reads are currently available.
   *
   * @returns `true` when cache population has completed.
   */
  isCacheReady(): boolean {
    return this.configBound.isCacheReady();
  }
}

/**
 * A ConfigBound is the top level object that contains all the {@link Section}s and {@link Bind}s.
 * It is used to retrieve the values of the {@link Element Elements} from its binds.
 */
export class ConfigBound implements ConfigValueProvider {
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
   * Gets the value of an Element using the first available Bind.
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
  public async get<T = unknown>(
    sectionName: string,
    elementName: string
  ): Promise<T | undefined> {
    this.logger.debug(`Getting value for ${sectionName}.${elementName}`);

    const element = this.getElementOrThrow(sectionName, elementName);

    // Try to get value from each Bind until one returns a value
    for (const bind of this._binds) {
      const value = await bind.get<T>(sectionName, elementName);
      if (value !== undefined) {
        this.logger.trace?.(
          `Found value for ${sectionName}.${elementName} in ${bind.name}: ${element.sensitive ? '[MASKED]' : value}`
        );

        // Validate the value against the element's schema
        const validationResult = element.validator.safeParse(value);
        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues
            .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
          this.logger.error(
            `Value for ${sectionName}.${elementName} failed validation: ${errorMessage}`
          );
          if (this.cacheReady) {
            this.cacheErrors.set(
              this.getCacheKey(sectionName, elementName),
              new ConfigInvalidException(`${sectionName}.${elementName}`, errorMessage)
            );
          }
          throw new ConfigInvalidException(
            `${sectionName}.${elementName}`,
            errorMessage
          );
        }

        // Return the validated (and potentially transformed) value
        const validatedValue = validationResult.data as T;
        if (this.cacheReady) {
          this.cacheErrors.delete(this.getCacheKey(sectionName, elementName));
          this.valueCache.set(
            this.getCacheKey(sectionName, elementName),
            validatedValue
          );
        }
        return validatedValue;
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
      const defaultValue = element.default as unknown as T;
      if (this.cacheReady) {
        this.cacheErrors.delete(this.getCacheKey(sectionName, elementName));
        this.valueCache.set(this.getCacheKey(sectionName, elementName), defaultValue);
      }
      return defaultValue;
    }

    // If no bind returned a value, return undefined
    this.logger.debug(`No value found for ${sectionName}.${elementName}`);
    if (this.cacheReady) {
      this.cacheErrors.delete(this.getCacheKey(sectionName, elementName));
      this.valueCache.set(this.getCacheKey(sectionName, elementName), undefined);
    }
    return undefined;
  }

  /**
   * Gets the value of an Element, throwing an error if the value is undefined.
   * This is useful for required configuration values.
   *
   * @param sectionName - The name of the section
   * @param elementName - The name of the element
   * @returns The value of the element (never undefined)
   * @throws SectionNotFoundException If section doesn't exist
   * @throws ElementNotFoundException If element doesn't exist in the section
   * @throws ConfigUnsetException If the element exists but has no value and no default
   * @throws ConfigInvalidException If value fails validation
   */
  public async getOrThrow<T = unknown>(sectionName: string, elementName: string): Promise<T> {
    const value = await this.get<T>(sectionName, elementName);
    if (value === undefined) {
      throw new ConfigUnsetException(`${sectionName}.${elementName}`);
    }
    return value;
  }

  /**
   * Gets a cached element value without querying binds.
   *
   * @param sectionName - Section name containing the element.
   * @param elementName - Element name to read from cache.
   * @returns The cached value, or `undefined` when no value is cached.
   * @throws SectionNotFoundException If the section does not exist.
   * @throws ElementNotFoundException If the element does not exist in the section.
   * @throws ConfigInvalidException If the cache is not ready.
   * @throws Error Re-throws a cached validation error for this element, when present.
   */
  public getFromCache<T = unknown>(
    sectionName: string,
    elementName: string
  ): T | undefined {
    this.getElementOrThrow(sectionName, elementName);
    this.assertCacheReady();
    const cacheKey = this.getCacheKey(sectionName, elementName);
    const cachedError = this.cacheErrors.get(cacheKey);
    if (cachedError) {
      throw cachedError;
    }
    return this.valueCache.get(cacheKey) as
      | T
      | undefined;
  }

  /**
   * Gets a cached element value and throws when the value is `undefined`.
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
  public getOrThrowFromCache<T = unknown>(sectionName: string, elementName: string): T {
    const value = this.getFromCache<T>(sectionName, elementName);
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
   * @returns A fully initialized {@link TypedConfigBound} instance typed to the provided schema.
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
  ): Promise<TypedConfigBound<T>> {
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
   * @returns A fully initialized {@link TypedConfigBound} instance.
   */
  public static async build<T extends ConfigSchema>(
    schema: T,
    options?: ConfigBoundCreateOptions
  ): Promise<TypedConfigBound<T>> {
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

    return new TypedConfigBound<T>(configBound);
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
export { EnvVarBind } from './bind/binds/envVar';
export { FileBind } from './bind/binds/file';
export { StaticBind } from './bind/binds/static';
