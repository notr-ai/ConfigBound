import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  ConfigBound,
  ConfigSchema,
  TypedConfigBound
} from '@config-bound/config-bound';
import { ConfigBoundService } from './config-bound.service';
import {
  ConfigBoundModuleOptions,
  ConfigBoundModuleAsyncOptions,
  ConfigBoundOptionsFactory,
  CONFIG_BOUND_OPTIONS,
  CONFIG_BOUND_INSTANCE
} from './interfaces/config-bound-module-options.interface';

@Module({})
export class ConfigBoundModule {
  static forRoot<T extends ConfigSchema>(
    options: ConfigBoundModuleOptions<T>
  ): DynamicModule {
    const configBoundProvider: Provider = {
      provide: CONFIG_BOUND_INSTANCE,
      useFactory: (): TypedConfigBound<T> => {
        return ConfigBound.createConfig(options.schema, {
          name: options.name,
          binds: options.binds,
          logger: options.logger,
          validateOnInit: options.validateOnInit ?? false
        });
      }
    };

    return {
      module: ConfigBoundModule,
      global: options.isGlobal ?? false,
      providers: [configBoundProvider, ConfigBoundService],
      exports: [ConfigBoundService]
    };
  }

  static forRootAsync<T extends ConfigSchema>(
    options: ConfigBoundModuleAsyncOptions<T>
  ): DynamicModule {
    const configBoundProvider: Provider = {
      provide: CONFIG_BOUND_INSTANCE,
      useFactory: async (
        configOptions: ConfigBoundModuleOptions<T>
      ): Promise<TypedConfigBound<T>> => {
        return ConfigBound.createConfig(configOptions.schema, {
          name: configOptions.name,
          binds: configOptions.binds,
          logger: configOptions.logger,
          validateOnInit: configOptions.validateOnInit ?? false
        });
      },
      inject: [CONFIG_BOUND_OPTIONS]
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: ConfigBoundModule,
      global: options.isGlobal ?? false,
      imports: options.imports || [],
      providers: [...asyncProviders, configBoundProvider, ConfigBoundService],
      exports: [ConfigBoundService]
    };
  }

  private static createAsyncProviders<T extends ConfigSchema>(
    options: ConfigBoundModuleAsyncOptions<T>
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass
        }
      ];
    }

    return [];
  }

  private static createAsyncOptionsProvider<T extends ConfigSchema>(
    options: ConfigBoundModuleAsyncOptions<T>
  ): Provider {
    if (options.useFactory) {
      return {
        provide: CONFIG_BOUND_OPTIONS,
        useFactory: options.useFactory,
        inject: (options.inject || []) as never[]
      };
    }

    const inject = options.useExisting || options.useClass;
    if (!inject) {
      throw new Error(
        'Invalid ConfigBoundModule async configuration: must provide useFactory, useClass, or useExisting'
      );
    }

    return {
      provide: CONFIG_BOUND_OPTIONS,
      useFactory: async (optionsFactory: ConfigBoundOptionsFactory<T>) =>
        await optionsFactory.createConfigBoundOptions(),
      inject: [inject]
    };
  }
}
