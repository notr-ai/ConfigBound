import { Inject, Injectable } from '@nestjs/common';
import {
  ConfigSchema,
  TypedConfigBound,
  InferConfigType
} from '@config-bound/config-bound';
import { Bind } from '@config-bound/config-bound/bind';
import { Section } from '@config-bound/config-bound/section';
import { CONFIG_BOUND_INSTANCE } from './interfaces/config-bound-module-options.interface';

@Injectable()
export class ConfigBoundService<T extends ConfigSchema = ConfigSchema> {
  constructor(
    @Inject(CONFIG_BOUND_INSTANCE)
    private readonly configBound: TypedConfigBound<T>
  ) {}

  // Type-safe access to the underlying config bound
  getTypedConfigBound(): TypedConfigBound<T> {
    return this.configBound;
  }

  get name(): string {
    return this.configBound.name;
  }

  get binds(): Bind[] {
    return this.configBound.binds;
  }

  get sections(): Section[] {
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

  async get<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): Promise<InferConfigType<T>[K][E] | undefined> {
    return this.configBound.get(sectionName, elementName);
  }

  async getOrThrow<
    K extends keyof InferConfigType<T>,
    E extends keyof InferConfigType<T>[K]
  >(sectionName: K, elementName: E): Promise<InferConfigType<T>[K][E]> {
    return this.configBound.getOrThrow(sectionName, elementName);
  }

  async validate(): Promise<void> {
    return this.configBound.validate();
  }

  async getValidationErrors(): Promise<Array<{ path: string; message: string }>> {
    return this.configBound.getValidationErrors();
  }
}
