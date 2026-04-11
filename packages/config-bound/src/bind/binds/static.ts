import { Bind } from '../bind';
import { resolveNested } from '../utilities/resolveNested';

export type StaticBindValues = Record<string, unknown>;

/**
 * A {@link Bind} that provides values from an in-memory object literal.
 *
 * Supports both nested objects and flat dot-path keys.
 * For example, `app.port` resolves from either:
 * - `{ app: { port: 3000 } }`
 * - `{ 'app.port': 3000 }`
 */
export class StaticBind extends Bind {
  private values: StaticBindValues;

  constructor(values: StaticBindValues = {}) {
    super('Static');
    this.values = values;
  }

  retrieve<T>(elementPath: string): T | undefined {
    const value =
      resolveNested(this.values, elementPath) ?? this.values[elementPath];
    return value != null ? (value as T) : undefined;
  }
}
