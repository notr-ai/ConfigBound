import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { Section } from '@config-bound/config-bound/section';
import {
  ConfigBound,
  TypedConfigBound,
  ConfigSchema,
  ConfigLoaderException,
  ConfigFileNotFoundException,
  ConfigFileIsDirectoryException,
  ExportNotFoundException,
  NoConfigBoundInstancesException,
  MultipleConfigBoundInstancesException,
  InvalidConfigBoundInstanceException,
  ConfigFileParseException,
  MissingDependencyException
} from '@config-bound/config-bound';

export interface LoadedConfig {
  name: string;
  sections: Section[];
  instance: ConfigBound | TypedConfigBound<ConfigSchema>;
}

@Injectable()
export class ConfigLoaderService {
  async loadConfig(
    filePath: string,
    exportName?: string
  ): Promise<LoadedConfig> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      const parentDir = path.dirname(absolutePath);
      const parentExists = fs.existsSync(parentDir);
      let similarFiles: string[] | undefined;
      if (parentExists) {
        const fileName = path.basename(absolutePath);
        const dirFiles = fs.readdirSync(parentDir);
        similarFiles = dirFiles.filter((file) =>
          file.toLowerCase().includes(fileName.toLowerCase().slice(0, 3))
        );
      }
      throw new ConfigFileNotFoundException(
        absolutePath,
        parentDir,
        parentExists,
        similarFiles
      );
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      throw new ConfigFileIsDirectoryException(absolutePath);
    }

    // If it's a TypeScript file, check if there's a compiled .js version
    const isTypeScript =
      absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx');
    let fileToLoad = absolutePath;

    const parseExceptionBaseMessage = `TypeScript file found but no compiled .js file exists. Please compile the file first (e.g., run 'tsc' or 'npm run build').`;
    if (isTypeScript) {
      // First, check for .js in the same directory
      const jsPath = absolutePath.replace(/\.tsx?$/, '.js');
      if (fs.existsSync(jsPath)) {
        fileToLoad = jsPath;
      } else {
        // If in src/, check for corresponding file in dist/
        const srcMatch = absolutePath.match(/^(.*[/\\])src([/\\].+)$/);
        if (srcMatch) {
          const distPath =
            srcMatch[1] + 'dist' + srcMatch[2].replace(/\.tsx?$/, '.js');
          if (fs.existsSync(distPath)) {
            fileToLoad = distPath;
          } else {
            throw new ConfigFileParseException(
              filePath,
              `${parseExceptionBaseMessage} Checked: ${jsPath} and ${distPath}`
            );
          }
        } else {
          throw new ConfigFileParseException(
            filePath,
            `${parseExceptionBaseMessage} Expected compiled file at: ${jsPath}`
          );
        }
      }
    }

    try {
      const fileURL = pathToFileURL(fileToLoad).href;
      const module = await import(fileURL);

      let configInstance:
        | ConfigBound
        | TypedConfigBound<ConfigSchema>
        | undefined;

      if (exportName && exportName !== 'default') {
        configInstance = module[exportName];
        if (!configInstance) {
          const allExports = Object.keys(module).filter(
            (key) => key !== '__esModule'
          );
          const namedExports = allExports.filter((key) => key !== 'default');
          const hasDefault = allExports.includes('default');
          const exportValue = module[exportName];

          throw new ExportNotFoundException(
            exportName,
            filePath,
            namedExports,
            hasDefault,
            exportValue
          );
        }
      } else if (exportName === 'default' || !exportName) {
        // Try default export first
        const defaultExport = module.default;

        // If default export is a valid ConfigBound instance, use it
        if (defaultExport && this.isConfigBoundInstance(defaultExport)) {
          configInstance = defaultExport;
        } else if (!exportName) {
          // If no specific export name and default is not a ConfigBound instance,
          // try to find any ConfigBound instance in the file
          const allExports = Object.entries(module).filter(
            ([key]) => key !== '__esModule'
          );
          const configExports = allExports
            .filter(([key]) => key !== 'default')
            .filter(([, value]) => this.isConfigBoundInstance(value));

          if (configExports.length === 0) {
            const nonConfigExports = allExports
              .filter(([key]) => key !== 'default')
              .filter(([, value]) => !this.isConfigBoundInstance(value))
              .map(([key, value]) => [key, typeof value] as [string, string]);
            const hasDefault = allExports.some(([key]) => key === 'default');

            throw new NoConfigBoundInstancesException(
              filePath,
              nonConfigExports,
              hasDefault
            );
          }

          if (configExports.length > 1) {
            const exportNames = configExports.map(([key]) => key);
            throw new MultipleConfigBoundInstancesException(
              filePath,
              exportNames
            );
          }

          configInstance = configExports[0][1] as
            | ConfigBound
            | TypedConfigBound<ConfigSchema>;
        } else {
          // exportName === 'default' was explicitly requested, so use it even if invalid
          configInstance = defaultExport;
        }
      }

      if (!configInstance) {
        const targetExport = exportName || 'default';
        const allExports = Object.keys(module).filter(
          (key) => key !== '__esModule'
        );
        const namedExports = allExports.filter((key) => key !== 'default');
        const hasDefault = allExports.includes('default');

        throw new ExportNotFoundException(
          targetExport,
          filePath,
          namedExports,
          hasDefault,
          module[targetExport]
        );
      }

      if (!this.isConfigBoundInstance(configInstance)) {
        const targetExport = exportName || 'default';
        const exportValue = module[targetExport];
        const valueType = typeof exportValue;
        const valueDetails =
          exportValue === null
            ? 'null'
            : exportValue === undefined
              ? 'undefined'
              : valueType === 'object'
                ? `${valueType} (missing required properties: name, sections)`
                : valueType;

        throw new InvalidConfigBoundInstanceException(
          targetExport,
          filePath,
          valueDetails
        );
      }

      return {
        name: configInstance.name,
        sections: configInstance.sections,
        instance: configInstance
      };
    } catch (error) {
      if (error instanceof ConfigLoaderException) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes('Cannot find module')) {
          const moduleMatch = error.message.match(
            /Cannot find module ['"]([^'"]+)['"]/
          );
          const missingModule = moduleMatch ? moduleMatch[1] : 'unknown';
          throw new MissingDependencyException(
            filePath,
            missingModule,
            error.message
          );
        }
        if (
          error.message.includes('SyntaxError') ||
          error.message.includes('parse') ||
          error.message.includes('Unexpected token')
        ) {
          throw new ConfigFileParseException(filePath, error.message);
        }
        throw error;
      }
      throw new Error(
        `Failed to load config file: ${filePath}. Unexpected error: ${String(error)}`
      );
    }
  }

  async loadConfigs(filePath: string): Promise<Map<string, LoadedConfig>> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      const parentDir = path.dirname(absolutePath);
      const parentExists = fs.existsSync(parentDir);
      let similarFiles: string[] | undefined;
      if (parentExists) {
        const fileName = path.basename(absolutePath);
        const dirFiles = fs.readdirSync(parentDir);
        similarFiles = dirFiles.filter((file) =>
          file.toLowerCase().includes(fileName.toLowerCase().slice(0, 3))
        );
      }
      throw new ConfigFileNotFoundException(
        absolutePath,
        parentDir,
        parentExists,
        similarFiles
      );
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      throw new ConfigFileIsDirectoryException(absolutePath);
    }

    // If it's a TypeScript file, check if there's a compiled .js version
    const isTypeScript =
      absolutePath.endsWith('.ts') || absolutePath.endsWith('.tsx');
    let fileToLoad = absolutePath;

    if (isTypeScript) {
      // First, check for .js in the same directory
      const jsPath = absolutePath.replace(/\.tsx?$/, '.js');
      if (fs.existsSync(jsPath)) {
        fileToLoad = jsPath;
      } else {
        // If in src/, check for corresponding file in dist/
        const srcMatch = absolutePath.match(/^(.*[/\\])src([/\\].+)$/);
        if (srcMatch) {
          const distPath =
            srcMatch[1] + 'dist' + srcMatch[2].replace(/\.tsx?$/, '.js');
          if (fs.existsSync(distPath)) {
            fileToLoad = distPath;
          } else {
            throw new ConfigFileParseException(
              filePath,
              `TypeScript file found but no compiled .js file exists. Please compile the file first (e.g., run 'tsc' or 'npm run build'). Checked: ${jsPath} and ${distPath}`
            );
          }
        } else {
          throw new ConfigFileParseException(
            filePath,
            `TypeScript file found but no compiled .js file exists. Please compile the file first (e.g., run 'tsc' or 'npm run build'). Expected compiled file at: ${jsPath}`
          );
        }
      }
    }

    try {
      const fileURL = pathToFileURL(fileToLoad).href;
      const module = await import(fileURL);

      const configs = new Map<string, LoadedConfig>();

      // Check default export
      if (module.default && this.isConfigBoundInstance(module.default)) {
        configs.set('default', {
          name: module.default.name,
          sections: module.default.sections,
          instance: module.default
        });
      }

      // Check named exports
      for (const [exportName, exportValue] of Object.entries(module)) {
        if (
          exportName !== '__esModule' &&
          exportName !== 'default' &&
          this.isConfigBoundInstance(exportValue)
        ) {
          const typedValue = exportValue as
            | ConfigBound
            | TypedConfigBound<ConfigSchema>;
          configs.set(exportName, {
            name: typedValue.name,
            sections: typedValue.sections,
            instance: typedValue
          });
        }
      }

      return configs;
    } catch (error) {
      if (error instanceof ConfigLoaderException) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes('Cannot find module')) {
          const moduleMatch = error.message.match(
            /Cannot find module ['"]([^'"]+)['"]/
          );
          const missingModule = moduleMatch ? moduleMatch[1] : 'unknown';
          throw new MissingDependencyException(
            filePath,
            missingModule,
            error.message
          );
        }
        if (
          error.message.includes('SyntaxError') ||
          error.message.includes('parse') ||
          error.message.includes('Unexpected token')
        ) {
          throw new ConfigFileParseException(filePath, error.message);
        }
        throw error;
      }
      throw new Error(
        `Failed to load config file: ${filePath}. Unexpected error: ${String(error)}`
      );
    }
  }

  private isConfigBoundInstance(
    value: unknown
  ): value is ConfigBound | TypedConfigBound<ConfigSchema> {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      'name' in value &&
      'sections' in value &&
      typeof (value as { name: unknown }).name === 'string' &&
      typeof (value as { sections: unknown }).sections === 'object'
    );
  }
}
