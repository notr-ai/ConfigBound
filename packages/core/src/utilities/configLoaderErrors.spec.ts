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
} from './configLoaderErrors';

describe('ConfigLoader Exceptions', () => {
  describe('ConfigFileNotFoundException', () => {
    it('should create error when file not found with parent directory missing', () => {
      const error = new ConfigFileNotFoundException(
        '/path/to/config.ts',
        '/path/to',
        false
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('ConfigFileNotFoundException');
      expect(error.message).toContain('Config file not found');
      expect(error.message).toContain('parent directory does not exist');
    });

    it('should create error with similar file suggestions', () => {
      const error = new ConfigFileNotFoundException(
        '/path/to/config.ts',
        '/path/to',
        true,
        ['config.example.ts', 'config.prod.ts']
      );

      expect(error.message).toContain('Similar files');
      expect(error.message).toContain('config.example.ts');
    });
  });

  describe('ConfigFileIsDirectoryException', () => {
    it('should indicate path is directory not file', () => {
      const error = new ConfigFileIsDirectoryException('/path/to/directory');

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('ConfigFileIsDirectoryException');
      expect(error.message).toContain('directory, not a file');
      expect(error.message).toContain('Please specify a file path');
    });
  });

  describe('ExportNotFoundException', () => {
    it('should show available named exports', () => {
      const error = new ExportNotFoundException(
        'myConfig',
        '/path/to/config.ts',
        ['config1', 'config2'],
        true,
        undefined
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('ExportNotFoundException');
      expect(error.message).toContain('Export');
      expect(error.message).toContain('myConfig');
      expect(error.message).toContain('config1');
      expect(error.message).toContain('config2');
      expect(error.message).toContain('default export');
    });

    it('should indicate when export is null', () => {
      const error = new ExportNotFoundException(
        'myConfig',
        '/path/to/config.ts',
        [],
        false,
        null
      );

      expect(error.message).toContain('is null');
    });

    it('should show type when export exists but wrong type', () => {
      const error = new ExportNotFoundException(
        'myConfig',
        '/path/to/config.ts',
        [],
        false,
        'string'
      );

      expect(error.message).toContain('found: string');
    });
  });

  describe('NoConfigBoundInstancesException', () => {
    it('should list non-ConfigBound exports', () => {
      const error = new NoConfigBoundInstancesException(
        '/path/to/config.ts',
        [
          ['helper', 'function'],
          ['data', 'object']
        ],
        true
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('NoConfigBoundInstancesException');
      expect(error.message).toContain('No ConfigBound instances');
      expect(error.message).toContain('helper (function)');
      expect(error.message).toContain('data (object)');
      expect(error.message).toContain('Default export');
    });
  });

  describe('MultipleConfigBoundInstancesException', () => {
    it('should list all ConfigBound exports found', () => {
      const error = new MultipleConfigBoundInstancesException(
        '/path/to/config.ts',
        ['appConfig', 'dbConfig', 'authConfig']
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('MultipleConfigBoundInstancesException');
      expect(error.message).toContain('Multiple ConfigBound instances');
      expect(error.message).toContain('appConfig, dbConfig, authConfig');
      expect(error.message).toContain('--name');
    });
  });

  describe('InvalidConfigBoundInstanceException', () => {
    it('should indicate invalid ConfigBound instance with details', () => {
      const error = new InvalidConfigBoundInstanceException(
        'myConfig',
        '/path/to/config.ts',
        'object (missing required properties: name, sections)'
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('InvalidConfigBoundInstanceException');
      expect(error.message).toContain('not a ConfigBound instance');
      expect(error.message).toContain('missing required properties');
    });
  });

  describe('ConfigFileParseException', () => {
    it('should include parse error details', () => {
      const error = new ConfigFileParseException(
        '/path/to/config.ts',
        'Unexpected token } at line 42'
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('ConfigFileParseException');
      expect(error.message).toContain('Failed to parse');
      expect(error.message).toContain('Unexpected token');
    });
  });

  describe('MissingDependencyException', () => {
    it('should identify missing dependency', () => {
      const error = new MissingDependencyException(
        '/path/to/config.ts',
        'lodash',
        'Cannot find module "lodash"'
      );

      expect(error).toBeInstanceOf(ConfigLoaderException);
      expect(error.name).toBe('MissingDependencyException');
      expect(error.message).toContain('Missing dependency');
      expect(error.message).toContain('lodash');
      expect(error.message).toContain('npm install');
    });
  });

  describe('Error inheritance and type checking', () => {
    it('should allow catching by base ConfigLoaderException', () => {
      const errors = [
        new ConfigFileNotFoundException('/path', '/parent', false),
        new ConfigFileIsDirectoryException('/path'),
        new ExportNotFoundException('test', '/path', [], false),
        new NoConfigBoundInstancesException('/path', [], false),
        new MultipleConfigBoundInstancesException('/path', ['a', 'b']),
        new InvalidConfigBoundInstanceException('test', '/path', 'object'),
        new ConfigFileParseException('/path', 'error'),
        new MissingDependencyException('/path', 'pkg', 'error')
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(ConfigLoaderException);
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBeTruthy();
        expect(error.message).toBeTruthy();
      });
    });

    it('should allow specific error type checking', () => {
      const fileNotFoundError = new ConfigFileNotFoundException(
        '/path',
        '/parent',
        false
      );

      if (fileNotFoundError instanceof ConfigFileNotFoundException) {
        expect(true).toBe(true);
      } else {
        throw new Error('Type check failed');
      }
    });
  });
});
