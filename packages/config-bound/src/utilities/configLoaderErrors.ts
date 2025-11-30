/**
 * An error that occurs when a config file cannot be loaded.
 */
export class ConfigLoaderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = ConfigLoaderException.name;
  }
}

/**
 * An error that occurs when a config file cannot be found.
 */
export class ConfigFileNotFoundException extends ConfigLoaderException {
  constructor(
    filePath: string,
    parentDir: string,
    parentExists: boolean,
    similarFiles?: string[]
  ) {
    let message = `Config file not found: ${filePath}`;
    if (!parentExists) {
      message = `${message} (parent directory does not exist: ${parentDir})`;
    } else if (similarFiles && similarFiles.length > 0) {
      message = `${message}. Similar files in directory: ${similarFiles.slice(0, 5).join(', ')}`;
    }
    super(message);
    this.name = ConfigFileNotFoundException.name;
  }
}

/**
 * An error that occurs when a config path is a directory instead of a file.
 */
export class ConfigFileIsDirectoryException extends ConfigLoaderException {
  constructor(filePath: string) {
    super(
      `Config file path is a directory, not a file: ${filePath}. Please specify a file path.`
    );
    this.name = ConfigFileIsDirectoryException.name;
  }
}

/**
 * An error that occurs when a named export cannot be found in a config file.
 */
export class ExportNotFoundException extends ConfigLoaderException {
  constructor(
    exportName: string,
    filePath: string,
    namedExports: string[],
    hasDefault: boolean,
    exportValue?: unknown
  ) {
    let message = `Export '${exportName}' not found in ${filePath}`;

    if (exportName in { [exportName]: true } && exportValue !== undefined) {
      if (exportValue === null) {
        message = `Export '${exportName}' exists in ${filePath} but is null`;
      } else {
        const valueType = typeof exportValue;
        message = `Export '${exportName}' exists in ${filePath} but is not a ConfigBound instance (found: ${valueType})`;
      }
    }

    const suggestions: string[] = [];
    if (namedExports.length > 0) {
      suggestions.push(`Available named exports: ${namedExports.join(', ')}`);
    }
    if (hasDefault) {
      suggestions.push(
        'A default export is available (use --name default or omit --name)'
      );
    }
    if (namedExports.length === 0 && !hasDefault) {
      suggestions.push('No ConfigBound exports found in this file');
    }

    if (suggestions.length > 0) {
      message = `${message}. ${suggestions.join('. ')}`;
    }

    super(message);
    this.name = ExportNotFoundException.name;
  }
}

/**
 * An error that occurs when no ConfigBound instances are found in a config file.
 */
export class NoConfigBoundInstancesException extends ConfigLoaderException {
  constructor(
    filePath: string,
    exports: Array<[string, string]>,
    hasDefault: boolean
  ) {
    let message = `No ConfigBound instances found in ${filePath}`;

    const exportList =
      exports.length > 0
        ? exports.map(([name, type]) => `${name} (${type})`).join(', ')
        : 'none';

    if (exports.length > 0 || hasDefault) {
      message = `${message}. Found exports: ${exportList}`;
      if (hasDefault) {
        message = `${message}. Default export exists but is not a ConfigBound instance`;
      }
    } else {
      message = `${message}. No exports found in this module`;
    }

    super(message);
    this.name = NoConfigBoundInstancesException.name;
  }
}

/**
 * An error that occurs when multiple ConfigBound instances are found and none is specified.
 */
export class MultipleConfigBoundInstancesException extends ConfigLoaderException {
  constructor(filePath: string, exportNames: string[]) {
    super(
      `Multiple ConfigBound instances found in ${filePath}: ${exportNames.join(', ')}. Please specify which one to use with --name.`
    );
    this.name = MultipleConfigBoundInstancesException.name;
  }
}

/**
 * An error that occurs when a config instance is not valid.
 */
export class InvalidConfigBoundInstanceException extends ConfigLoaderException {
  constructor(exportName: string, filePath: string, valueDetails: string) {
    super(
      `Export '${exportName}' in ${filePath} is not a ConfigBound instance (found: ${valueDetails})`
    );
    this.name = InvalidConfigBoundInstanceException.name;
  }
}

/**
 * An error that occurs when a config file cannot be parsed or loaded.
 */
export class ConfigFileParseException extends ConfigLoaderException {
  constructor(filePath: string, originalError: string) {
    super(`Failed to parse config file: ${filePath}. ${originalError}`);
    this.name = ConfigFileParseException.name;
  }
}

/**
 * An error that occurs when a dependency required by a config file is missing.
 */
export class MissingDependencyException extends ConfigLoaderException {
  constructor(filePath: string, missingModule: string, originalError: string) {
    super(
      `Failed to load config file: ${filePath}. Missing dependency: ${missingModule}. Make sure all dependencies are installed (run npm install or equivalent). Original error: ${originalError}`
    );
    this.name = MissingDependencyException.name;
  }
}
