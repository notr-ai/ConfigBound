/**
 * Walks a dot-separated path through a nested object.
 *
 * @param data The nested object.
 * @param dotPath The dot-separated path.
 * @returns The value at the path, or `undefined` if the path is invalid.
 */
export function resolveNested(
  data: Record<string, unknown>,
  dotPath: string
): unknown {
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
