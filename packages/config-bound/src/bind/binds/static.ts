import { Bind } from '../bind';

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
    return value === undefined ? undefined : (value as T);
  }
}

function resolveNested(data: Record<string, unknown>, dotPath: string): unknown {
  const segments = dotPath.split('.');
  let current: unknown = data;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
