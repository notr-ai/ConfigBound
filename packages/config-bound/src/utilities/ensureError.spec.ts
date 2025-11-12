import { ensureError } from './ensureError';

/**
 * @group unit
 */
describe('ensureError', () => {
  test('returns the error when passed an Error instance', () => {
    // Arrange
    const originalError = new Error('Original error message');

    // Act
    const result = ensureError(originalError);

    // Assert
    expect(result).toBe(originalError);
  });

  test('returns the error when passed a subclass of Error', () => {
    // Arrange
    const typeError = new TypeError('Type error message');
    const syntaxError = new SyntaxError('Syntax error message');

    // Act
    const result1 = ensureError(typeError);
    const result2 = ensureError(syntaxError);

    // Assert
    expect(result1).toBe(typeError);
    expect(result2).toBe(syntaxError);
  });

  test('converts string to TypeError with proper message', () => {
    // Arrange
    const stringValue = 'this is a string';

    // Act
    const result = ensureError(stringValue);

    // Assert
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe(
      'Thrown value was not of type Error: "this is a string"'
    );
  });

  test('converts number to TypeError with proper message', () => {
    // Arrange
    const numberValue = 42;

    // Act
    const result = ensureError(numberValue);

    // Assert
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe('Thrown value was not of type Error: 42');
  });

  test('converts null to TypeError with proper message', () => {
    // Arrange
    const nullValue = null;

    // Act
    const result = ensureError(nullValue);

    // Assert
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe('Thrown value was not of type Error: null');
  });

  test('converts undefined to TypeError with proper message', () => {
    // Arrange
    const undefinedValue = undefined;

    // Act
    const result = ensureError(undefinedValue);

    // Assert
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe(
      'Thrown value was not of type Error: undefined'
    );
  });

  test('converts object to TypeError with proper message', () => {
    // Arrange
    const objectValue = { foo: 'bar', baz: 42 };

    // Act
    const result = ensureError(objectValue);

    // Assert
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe(
      'Thrown value was not of type Error: {"foo":"bar","baz":42}'
    );
  });

  test('handles circular references gracefully', () => {
    // Arrange
    const circularObj: any = { foo: 'bar' };
    circularObj.self = circularObj; // Create circular reference

    // Act
    const result = ensureError(circularObj);

    // Assert
    expect(result).toBeInstanceOf(TypeError);
    expect(result.message).toBe(
      'Thrown value was not of type Error: [Unable to stringify the thrown value]'
    );
  });
});
