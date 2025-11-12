/**
 * Sanitizes and type-checks errors.
 *
 * @remarks
 * Derived from:
 * {@link https://medium.com/with-orus/the-5-commandments-of-clean-error-handling-in-typescript-93a9cbdf1af5}
 *
 * @param value - A value that has been thrown
 * @returns if value is an instance of Error, returns value.
 * @throws if value is not an instance of Error, throws a {@link TypeError}
 */
export function ensureError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }

  let stringified: string;
  try {
    stringified = JSON.stringify(value);
  } catch {
    stringified = '[Unable to stringify the thrown value]';
  }

  return new TypeError(`Thrown value was not of type Error: ${stringified}`);
}
