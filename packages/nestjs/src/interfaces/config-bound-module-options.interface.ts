import { ModuleMetadata, Type } from '@nestjs/common';
import { ConfigSchema } from '@config-bound/config-bound';
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

export interface ConfigBoundModuleOptions<
  T extends ConfigSchema = ConfigSchema
> {
  schema: T;
  name?: string;
  binds?: Bind[];
  logger?: Logger;
  validateOnInit?: boolean;
  isGlobal?: boolean;
}

export interface ConfigBoundOptionsFactory<
  T extends ConfigSchema = ConfigSchema
> {
  createConfigBoundOptions():
    | Promise<ConfigBoundModuleOptions<T>>
    | ConfigBoundModuleOptions<T>;
}

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
