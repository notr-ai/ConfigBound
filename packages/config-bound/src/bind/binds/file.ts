/**
 * File-based bind implementation supporting JSON, JSONC, and YAML
 * @module
 */

import * as fs from 'fs';
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
  json: (content) => JSON.parse(content),

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
 * The file is read and parsed once at construction time. Values are cached
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
 */
export class FileBind extends Bind {
  readonly resolvedPath: string;
  readonly format: FileFormat;
  private readonly rootKey?: string;
  private data: Record<string, unknown>;

  constructor(options: FileBindOptions) {
    super('File');

    this.resolvedPath = path.resolve(options.filePath);
    this.format = options.format ?? detectFormat(this.resolvedPath);
    this.rootKey = options.rootKey;
    this.data = this.loadAndParse();
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
   */
  reload(): void {
    this.data = this.loadAndParse();
  }

  /**
   * Reads and parses the configuration file.
   *
   * @private
   * @returns The parsed configuration data.
   */
  private loadAndParse(): Record<string, unknown> {
    const content = this.readFile();
    const parsed = this.parseContent(content);
    return this.rootKey
      ? scopeToRootKey(parsed, this.rootKey, this.resolvedPath)
      : parsed;
  }

  /**
   * Reads the configuration file.
   *
   * @private
   * @returns The file content.
   */
  private readFile(): string {
    try {
      return fs.readFileSync(this.resolvedPath, 'utf-8');
    } catch (error) {
      throw new ConfigInvalidException(
        'FileBind',
        `Cannot read "${this.resolvedPath}": ${ensureError(error).message}`
      );
    }
  }

  /**
   * Parses the configuration file content into a record
   *
   * @private
   * @param content The file content.
   * @returns The parsed configuration data.
   */
  private parseContent(content: string): Record<string, unknown> {
    let parsed: unknown;

    try {
      parsed = PARSERS[this.format](content);
    } catch (error) {
      throw new ConfigInvalidException(
        'FileBind',
        `Failed to parse "${this.resolvedPath}" as ${this.format}: ${ensureError(error).message}`
      );
    }

    // Empty files (e.g., blank YAML) produce null/undefined — treat as empty config
    if (parsed == null) return {};

    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      const actual = Array.isArray(parsed) ? 'array' : typeof parsed;
      throw new ConfigInvalidException(
        'FileBind',
        `Config file "${this.resolvedPath}" must contain an object at the top level, found ${actual}`
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
