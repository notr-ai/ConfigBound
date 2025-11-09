import Joi from 'joi';
import { Element } from './element';
import {
  ConfigInvalidException,
  ConfigUnsetException
} from '../utilities/errors';
import { ConfigBound } from '../configBound';
import { Section } from '../section/section';
import { EnvVarBind } from '../bind/binds/envVar';
import { ConsoleLogger, NullLogger } from '../utilities/logger';

/**
 * @group unit
 */
describe('Element', () => {
  let configBound: ConfigBound;
  let element: Element<string>;
  let elementNoDefault: Element<string>;

  beforeEach(() => {
    // Element with default value
    element = new Element<string>(
      'testName',
      'A test config element',
      'defaultValue',
      'exampleValue',
      false
    );

    // Element without default value
    elementNoDefault = new Element<string>(
      'testNoDefault',
      'A test config element without default',
      undefined,
      'exampleValue',
      false
    );

    // Create section with both elements
    const section = new Section('TestSection', [element, elementNoDefault]);

    // Create bind and config bound
    const envVarBind = new EnvVarBind();
    configBound = new ConfigBound(
      'TestConfig',
      [envVarBind],
      [],
      process.env.TEST_USE_CONSOLE_LOGGER === 'true'
        ? new ConsoleLogger()
        : new NullLogger()
    );
    configBound.addSection(section);
  });

  test('should initialize with correct values', () => {
    expect(element.name).toBe('testName');
    expect(element.description).toBe('A test config element');
    expect(element.default).toBe('defaultValue');
    expect(element.example).toBe('exampleValue');
    expect(element.sensitive).toBe(false);
  });

  // Test for constructor with invalid default value
  test('constructor should throw ConfigInvalidException when default value is invalid', () => {
    expect(() => {
      new Element<number>(
        'invalidDefault',
        'Config with invalid default',
        -10, // Invalid default according to validator
        100,
        false,
        false,
        Joi.number().min(0).max(100) // Validator requires positive numbers
      );
    }).toThrow(ConfigInvalidException);
  });

  test('get method should return the value from value provider', () => {
    // This test verifies that get() delegates to the value provider
    // The actual value comes from the ConfigBound's get() method
    expect(element.get(configBound)).toBe('defaultValue');
  });

  test('get method should return default if value is not set and default exists', () => {
    // Element with default should return default
    expect(element.get(configBound)).toBe('defaultValue');
  });

  test('get method should return undefined if value is not set and no default exists', () => {
    // Element without default should return undefined
    expect(elementNoDefault.get(configBound)).toBeUndefined();
  });

  test('getOrThrow method should return the value from value provider', () => {
    // This test verifies that getOrThrow() delegates to the value provider
    expect(element.getOrThrow(configBound)).toBe('defaultValue');
  });

  test('getOrThrow method should return default if value is not set but default exists', () => {
    expect(element.getOrThrow(configBound)).toBe('defaultValue');
  });

  test('getOrThrow method should throw ConfigUnsetException if value is not set and no default exists', () => {
    expect(() => elementNoDefault.getOrThrow(configBound)).toThrow(
      ConfigUnsetException
    );
  });

  // Test for isRequired functionality
  test('isRequired should return true when validator has required presence', () => {
    const element = new Element<string>(
      'requiredConfig',
      'A required config element',
      'default',
      'example',
      false,
      false,
      Joi.string().required()
    );

    expect(element.isRequired()).toBe(true);
  });

  test('isRequired should return false when validator does not have required presence', () => {
    const element = new Element<string>(
      'optionalConfig',
      'An optional config element',
      'default',
      'example'
    );

    expect(element.isRequired()).toBe(false);
  });

  test('should initialize with omitFromSchema property', () => {
    const element = new Element<string>(
      'privateConfig',
      'A private config element',
      'default',
      'example',
      false,
      true
    );

    expect(element.omitFromSchema).toBe(true);
  });

  test('should default omitFromSchema to false when not specified', () => {
    const element = new Element<string>(
      'publicConfig',
      'A public config element',
      'default',
      'example'
    );

    expect(element.omitFromSchema).toBe(false);
  });
});
