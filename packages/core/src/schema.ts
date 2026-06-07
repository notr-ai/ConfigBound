/**
 * Schema type definitions and builder helpers for declaring ConfigBound schemas.
 *
 * These are the building blocks for describing what your configuration looks like.
 * Import them from `@config-bound/core` (re-exported) or directly from
 * `@config-bound/core/schema` when you only need the types and helpers.
 *
 * @module
 */

import { z } from 'zod';
import { ConfigInvalidException } from './utilities/errors';

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

/**
 * Top-level schema type that can contain both individual items and named sections.
 */
export type ConfigSchema<T = Record<string, unknown>> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? ConfigSection<T[K]>
    : ConfigItem<T[K]>;
};

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
      throw new ConfigInvalidException('configItem', errorMessage);
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
  return {
    description,
    properties
  };
}
