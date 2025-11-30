import { Injectable } from '@nestjs/common';
import {
  exportSchema,
  formatAsJSON,
  formatAsYAML,
  formatAsEnvExample
} from '@config-bound/schema-export';
import {
  ConfigBound,
  TypedConfigBound,
  ConfigSchema
} from '@config-bound/config-bound';
import { Section } from '@config-bound/config-bound/section';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';

export type ExportFormat = 'json' | 'yaml' | 'env';

export interface ExportSchemaOptions {
  format: ExportFormat;
  includeOmitted?: boolean;
  pretty?: boolean;
}

@Injectable()
export class SchemaExportService {
  exportToString(
    configName: string,
    sections: Section[],
    configInstance: ConfigBound | TypedConfigBound<ConfigSchema>,
    options: ExportSchemaOptions
  ): string {
    const includeOmitted = options.includeOmitted || false;

    const schema = exportSchema(configName, sections, includeOmitted);

    switch (options.format) {
      case 'json':
        return formatAsJSON(schema, options.pretty !== false);

      case 'yaml':
        return formatAsYAML(schema);

      case 'env': {
        // Extract prefix from EnvVarBind if present
        const prefix = this.extractEnvVarPrefix(configInstance);
        return formatAsEnvExample(schema, prefix);
      }

      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  private extractEnvVarPrefix(
    configInstance: ConfigBound | TypedConfigBound<ConfigSchema>
  ): string | undefined {
    if (!configInstance || !configInstance.binds) {
      return undefined;
    }

    for (const bind of configInstance.binds) {
      if (bind instanceof EnvVarBind) {
        const envVarBind = bind as EnvVarBind;
        if (envVarBind.envVarPrefix) {
          return envVarBind.envVarPrefix;
        }
      }
    }

    return undefined;
  }

  getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'json':
        return '.json';
      case 'yaml':
        return '.yaml';
      case 'env':
        return '.env.example';
      default:
        return '';
    }
  }
}
