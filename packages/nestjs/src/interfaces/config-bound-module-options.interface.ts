import { ModuleMetadata, Type } from '@nestjs/common';
import { type CacheMode, type ConfigSchema } from '@config-bound/config-bound';
import { Bind } from '@config-bound/config-bound/bind';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface Logger {
  logLevels: LogLevel[];
  trace?(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
  silent?(message: string, ...meta: unknown[]): void;
}

/**
 * Configuration options for ConfigBoundModule.
 * Defines the schema, binds, and behavior for the ConfigBound integration.
 */
export interface ConfigBoundModuleOptions<
  T extends ConfigSchema = ConfigSchema
> {
  /** Declarative schema that defines sections, elements, defaults, and validators. */
  schema: T;
  /** Optional instance name; defaults to `app` when omitted. */
  name?: string;
  /** Value sources consulted in bind order when resolving configuration values. */
  binds?: Bind[];
  /** Optional logger implementation used by ConfigBound internals. */
  logger?: Logger;
  /** Validates values during module initialization when true. */
  validateOnInit?: boolean;
  /**
   * Cache initialization strategy. Defaults to `eager`.
   *
   * - `eager`: Cache is populated during module initialization. Allows synchronous reads via `getFromCache()` immediate useful in NestJS constructors or other sync-only call sites that cannot `await`.
   * - `manual`: Cache is not populated until you explicitly call `populateCache()`. Use this when you only read config asynchronously via `get()` or `getOrThrow()` and want to avoid the upfront startup cost.
   */
  cacheMode?: CacheMode;
  /** Registers the module globally in Nest when true. */
  isGlobal?: boolean;
}

/**
 * Factory interface for creating ConfigBound options asynchronously.
 * Implement this interface when using `forRootAsync({ useClass: ... })`.
 */
export interface ConfigBoundOptionsFactory<
  T extends ConfigSchema = ConfigSchema
> {
  createConfigBoundOptions():
    | Promise<ConfigBoundModuleOptions<T>>
    | ConfigBoundModuleOptions<T>;
}

/**
 * Async configuration options for ConfigBoundModule.
 * Use with `forRootAsync()` to configure the module with dependencies from other modules.
 */
export interface ConfigBoundModuleAsyncOptions<
  T extends ConfigSchema = ConfigSchema
> extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  useExisting?: Type<ConfigBoundOptionsFactory<T>>;
  useClass?: Type<ConfigBoundOptionsFactory<T>>;
  useFactory?: (
    ...args: unknown[]
  ) => Promise<ConfigBoundModuleOptions<T>> | ConfigBoundModuleOptions<T>;
  inject?: unknown[];
}

export const CONFIG_BOUND_OPTIONS = 'CONFIG_BOUND_OPTIONS';
export const CONFIG_BOUND_INSTANCE = 'CONFIG_BOUND_INSTANCE';
