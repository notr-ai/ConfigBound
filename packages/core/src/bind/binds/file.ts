/**
 * File-based bind implementation supporting JSON, JSONC, and YAML
 * @module
 */

import { promises as fsPromises } from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  parse as parseJsonc,
  printParseErrorCode,
  type ParseError
} from 'jsonc-parser';
import { Bind } from '../bind';
import { ConfigInvalidException } from '../../utilities/errors';
import { ensureError } from '../../utilities/ensureError';
import { resolveNested } from '../utilities/resolveNested';

/**
 * Supported file formats for configuration files.
 */
export type FileFormat = 'json' | 'jsonc' | 'yaml';

/**
 * Options for creating a {@link FileBind} instance.
 */
export interface FileBindOptions {
  /** Path to the configuration file. Resolved to absolute via `path.resolve()`. */
  filePath: string;
  /** Explicit format override. When omitted, format is detected from the file extension. */
  format?: FileFormat;
  /** Dot-separated path to scope into a subtree of the parsed file. */
  rootKey?: string;
}

/**
 * Maps file extensions to their corresponding parse format.
 * Extend this when adding new formats.
 */
const EXTENSION_FORMAT_ENTRIES: ReadonlyArray<readonly [string, FileFormat]> = [
  ['.json', 'json'],
  ['.jsonc', 'jsonc'],
  ['.hujson', 'jsonc'],
  ['.yml', 'yaml'],
  ['.yaml', 'yaml']
];

const EXTENSION_FORMATS: ReadonlyMap<string, FileFormat> = new Map(
  EXTENSION_FORMAT_ENTRIES
);

/**
 * Each parser normalizes its library's calling convention into a single
 * `(content: string) => unknown` signature. Parse failures throw.
 */
const PARSERS: Readonly<Record<FileFormat, (content: string) => unknown>> = {
  json: JSON.parse,

  jsonc: (content) => {
    const errors: ParseError[] = [];
    const result = parseJsonc(content, errors, { allowTrailingComma: true });
    if (errors.length > 0) {
      const first = errors[0];
      throw new Error(
        `${printParseErrorCode(first.error)} at offset ${first.offset}`
      );
    }
    return result;
  },

  // JSON_SCHEMA restricts types to JSON primitives (string, number, boolean, null).
  // Prevents the default schema's surprises: yes/no → boolean, date strings → Date objects.
  yaml: (content) => yaml.load(content, { schema: yaml.JSON_SCHEMA })
};

/**
 * A {@link Bind} that reads configuration values from a JSON, JSONC, or YAML file.
 *
 * The file is read and parsed once via {@link FileBind.create}. Values are cached
 * in memory and served from the cache on every `retrieve()` call. Call
 * {@link reload} to re-read the file when its contents have changed.
 *
 * Key resolution follows a nested-first strategy: the element path
 * `"database.host"` first tries `data.database.host`, then falls back
 * to `data["database.host"]` for flat-keyed files.
 *
 * Explicit `null` values in the file are treated as "not set" and
 * return `undefined`, allowing the next bind or element default to
 * take over.
 *
 * @example
 * ```typescript
 * const bind = await FileBind.create({ filePath: './config.yaml' });
 * ```
 */
export class FileBind extends Bind {
  readonly resolvedPath: string;
  readonly format: FileFormat;
  private readonly rootKey?: string;
  private data: Record<string, unknown>;

  private constructor(
    resolvedPath: string,
    format: FileFormat,
    rootKey: string | undefined,
    data: Record<string, unknown>
  ) {
    super('File');
    this.resolvedPath = resolvedPath;
    this.format = format;
    this.rootKey = rootKey;
    this.data = data;
  }

  /**
   * Creates a `FileBind` by asynchronously reading and parsing the config file.
   *
   * @param options - File bind options.
   * @returns A fully initialised `FileBind` instance.
   * @throws ConfigInvalidException If the file cannot be read, parsed, or scoped.
   */
  static async create(options: FileBindOptions): Promise<FileBind> {
    const resolvedPath = path.resolve(options.filePath);
    const format = options.format ?? detectFormat(resolvedPath);
    const data = await FileBind.loadAndParseAsync(resolvedPath, format, options.rootKey);
    return new FileBind(resolvedPath, format, options.rootKey, data);
  }

  /**
   * Retrieves a value for the given element path from the cached file data.
   *
   * Resolution is nested-first (e.g. `a.b` -> `data.a.b`) with a fallback to
   * flat keys (e.g. `data["a.b"]`). `null` and `undefined` are treated as unset
   * and return `undefined` so downstream binds/defaults can take over.
   *
   * @param elementPath Dot-separated element path to resolve.
   * @returns The resolved value when present, otherwise `undefined`.
   */
  async retrieve<T>(elementPath: string): Promise<T | undefined> {
    const value =
      resolveNested(this.data, elementPath) ?? this.data[elementPath];

    return value != null ? (value as T) : undefined;
  }

  /**
   * Re-reads and re-parses the configuration file, replacing the cached data.
   *
   * @throws ConfigInvalidException If the file cannot be read, parsed, or scoped.
   */
  async reload(): Promise<void> {
    this.data = await FileBind.loadAndParseAsync(this.resolvedPath, this.format, this.rootKey);
  }

  private static async loadAndParseAsync(
    resolvedPath: string,
    format: FileFormat,
    rootKey: string | undefined
  ): Promise<Record<string, unknown>> {
    const content = await FileBind.readFileAsync(resolvedPath);
    const parsed = FileBind.parseContent(content, resolvedPath, format);
    return rootKey ? scopeToRootKey(parsed, rootKey, resolvedPath) : parsed;
  }

  private static async readFileAsync(resolvedPath: string): Promise<string> {
    try {
      return await fsPromises.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      throw new ConfigInvalidException(
        'FileBind',
        `Cannot read "${resolvedPath}": ${ensureError(error).message}`
      );
    }
  }

  private static parseContent(
    content: string,
    resolvedPath: string,
    format: FileFormat
  ): Record<string, unknown> {
    let parsed: unknown;

    try {
      parsed = PARSERS[format](content);
    } catch (error) {
      throw new ConfigInvalidException(
        'FileBind',
        `Failed to parse "${resolvedPath}" as ${format}: ${ensureError(error).message}`
      );
    }

    // Empty files (e.g., blank YAML) produce null/undefined — treat as empty config
    if (parsed == null) return {};

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      const actual = Array.isArray(parsed) ? 'array' : typeof parsed;
      throw new ConfigInvalidException(
        'FileBind',
        `Config file "${resolvedPath}" must contain an object at the top level, found ${actual}`
      );
    }

    return parsed as Record<string, unknown>;
  }
}

/**
 * Narrows the config to a subtree of the parsed file.
 *
 * Walks `rootKey` (a dot-separated path) through `data` and returns the
 * object found there. All subsequent key lookups are resolved relative to
 * that object rather than the file's top level.
 *
 * @param data The full parsed file contents.
 * @param rootKey Dot-separated path to the subtree to use as the config root.
 * @param filePath Path to the source file, used in error messages.
 * @returns The object at `rootKey`.
 */
function scopeToRootKey(
  data: Record<string, unknown>,
  rootKey: string,
  filePath: string
): Record<string, unknown> {
  const scoped = resolveNested(data, rootKey);

  if (scoped == null || typeof scoped !== 'object' || Array.isArray(scoped)) {
    throw new ConfigInvalidException(
      'FileBind',
      `Root key "${rootKey}" does not resolve to an object in "${filePath}"`
    );
  }

  return scoped as Record<string, unknown>;
}

/**
 * Detects the format of a file based on its extension.
 *
 * @param filePath The path to the file.
 * @returns The format of the file.
 */
function detectFormat(filePath: string): FileFormat {
  const ext = path.extname(filePath).toLowerCase();
  const format = EXTENSION_FORMATS.get(ext);

  if (!format) {
    const supported = EXTENSION_FORMAT_ENTRIES.map(([extension]) => extension).join(', ');
    throw new ConfigInvalidException(
      'FileBind',
      `Unsupported file extension "${ext}". Supported: ${supported}. ` +
        `Use the "format" option to specify explicitly.`
    );
  }

  return format;
}
