import { Inject, Injectable } from '@nestjs/common';
import {
  type CacheRefreshOptions,
  ConfigBound,
  type ConfigSchema,
  type InferConfigType
} from '@config-bound/core';
import { Bind } from '@config-bound/core/bind';
import { Section } from '@config-bound/core/section';
import { CONFIG_BOUND_INSTANCE } from './interfaces/config-bound-module-options.interface';

/**
 * Injectable service that provides type-safe access to ConfigBound configuration.
 * Wraps a ConfigBound instance and exposes all configuration operations for use in NestJS controllers and services.
 */
@Injectable()
export class ConfigBoundService<T extends ConfigSchema = ConfigSchema> {
  constructor(
    @Inject(CONFIG_BOUND_INSTANCE)
    private readonly configBound: ConfigBound<T>
  ) {}

  getConfigBound(): ConfigBound<T> {
    return this.configBound;
  }

  get name(): string {
    return this.configBound.name;
  }

  get binds(): ReadonlyArray<Bind> {
    return this.configBound.binds;
  }

  get sections(): ReadonlyArray<Section> {
    return this.configBound.sections;
  }

  addBind(bind: Bind): void {
    this.configBound.addBind(bind);
  }

  addSection(section: Section): void {
    this.configBound.addSection(section);
  }

  getSections(): ReadonlyArray<Section> {
    return this.configBound.getSections();
  }

  async get<
    K extends keyof InferConfigType<T> & string,
    E extends keyof InferConfigType<T>[K] & string
  >(sectionName: K, elementName: E): Promise<InferConfigType<T>[K][E] | undefined> {
    return this.configBound.get(sectionName, elementName);
  }

  async getOrThrow<
    K extends keyof InferConfigType<T> & string,
    E extends keyof InferConfigType<T>[K] & string
  >(sectionName: K, elementName: E): Promise<InferConfigType<T>[K][E]> {
    return this.configBound.getOrThrow(sectionName, elementName);
  }

  /**
   * Reads a configuration value from the in-memory cache only.
   *
   * @param sectionName - Section containing the requested element.
   * @param elementName - Element name to read from cache.
   * @returns Cached value when present; otherwise `undefined`.
   */
  getFromCache<
    K extends keyof InferConfigType<T> & string,
    E extends keyof InferConfigType<T>[K] & string
  >(sectionName: K, elementName: E): InferConfigType<T>[K][E] | undefined {
    return this.configBound.getFromCache(sectionName, elementName);
  }

  /**
   * Reads a configuration value from cache and throws when it is undefined.
   *
   * @param sectionName - Section containing the requested element.
   * @param elementName - Element name to read from cache.
   * @returns Cached value.
   */
  getOrThrowFromCache<
    K extends keyof InferConfigType<T> & string,
    E extends keyof InferConfigType<T>[K] & string
  >(sectionName: K, elementName: E): InferConfigType<T>[K][E] {
    return this.configBound.getOrThrowFromCache(sectionName, elementName);
  }

  /**
   * Populates the cache for all configured elements.
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

  async validate(): Promise<void> {
    return this.configBound.validate();
  }

  async getValidationErrors(): Promise<Array<{ path: string; message: string }>> {
    return this.configBound.getValidationErrors();
  }
}
