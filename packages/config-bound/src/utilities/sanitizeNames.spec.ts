import { InvalidNameException } from './errors';
import { sanitizeName } from './sanitizeNames';

/**
 * @group unit
 */
describe('SanitizeName', () => {
  it('should return value when formatted correctly.', () => {
    expect(sanitizeName('correctlyFormatted')).toBe('correctlyFormatted');
  });

  it('should return value when formatted correctly with underscores.', () => {
    expect(sanitizeName('correctly_formatted')).toBe('correctly_formatted');
  });

  it('should return value when formatted correctly with dashes.', () => {
    expect(sanitizeName('correctly-formatted')).toBe('correctly-formatted');
  });

  it('should return value without surrounding spaces.', () => {
    expect(sanitizeName('   spacesbeforeandafter   ')).toBe(
      'spacesbeforeandafter'
    );
  });

  it('should throw an exception when unapproved special characters are used.', () => {
    expect(() => {
      sanitizeName("can'tUseSpecialCharacters");
    }).toThrow(InvalidNameException);
  });

  it('should throw an exception when ending in an underscore', () => {
    expect(() => {
      sanitizeName('cant_end_in_');
    }).toThrow(InvalidNameException);
  });

  it('should throw an exception when starting in an dash', () => {
    expect(() => {
      sanitizeName('-cant-start-with');
    }).toThrow(InvalidNameException);
  });

  it('should throw an exception when an empty string is passed.', () => {
    expect(() => {
      sanitizeName('');
    }).toThrow(InvalidNameException);
  });
});
