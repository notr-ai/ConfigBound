import { z } from 'zod';
import { Element } from './element';
import {
  ConfigInvalidException,
  ConfigUnsetException
} from '../utilities/errors';
import { ConfigBound } from '../configBound';
import { Section } from '../section/section';
import { EnvVarBind } from '../bind/binds/envVar';
import { testLogger } from '../../test/testUtils';

/**
 * @group unit
 */
describe('Element', () => {
  let configBound: ConfigBound;
  let element: Element<string>;
  let elementNoDefault: Element<string>;

  beforeEach(async () => {
    // Element with default value
    element = new Element<string>({
      name: 'testName',
      description: 'A test config element',
      default: 'defaultValue',
      example: 'exampleValue',
      sensitive: false
    });

    // Element without default value
    elementNoDefault = new Element<string>({
      name: 'testNoDefault',
      description: 'A test config element without default',
      example: 'exampleValue',
      sensitive: false
    });

    // Create section with both elements
    const section = new Section('TestSection', [element, elementNoDefault]);

    // Create bind and config bound
    const envVarBind = await EnvVarBind.create();
    configBound = new ConfigBound('TestConfig', [envVarBind], [], testLogger());
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
      new Element<number>({
        name: 'invalidDefault',
        description: 'Config with invalid default',
        default: -10,
        example: 100,
        sensitive: false,
        omitFromSchema: false,
        validator: z.number().min(0).max(100)
      });
    }).toThrow(ConfigInvalidException);
  });

  test('get method should return the value from value provider', async () => {
    // This test verifies that get() delegates to the value provider
    // The actual value comes from the ConfigBound's get() method
    await expect(element.get(configBound)).resolves.toBe('defaultValue');
  });

  test('get method should return default if value is not set and default exists', async () => {
    // Element with default should return default
    await expect(element.get(configBound)).resolves.toBe('defaultValue');
  });

  test('get method should return undefined if value is not set and no default exists', async () => {
    // Element without default should return undefined
    await expect(elementNoDefault.get(configBound)).resolves.toBeUndefined();
  });

  test('getOrThrow method should return the value from value provider', async () => {
    // This test verifies that getOrThrow() delegates to the value provider
    await expect(element.getOrThrow(configBound)).resolves.toBe('defaultValue');
  });

  test('getOrThrow method should return default if value is not set but default exists', async () => {
    await expect(element.getOrThrow(configBound)).resolves.toBe('defaultValue');
  });

  test('getOrThrow method should throw ConfigUnsetException if value is not set and no default exists', async () => {
    await expect(elementNoDefault.getOrThrow(configBound)).rejects.toThrow(
      ConfigUnsetException
    );
  });

  // Test for isRequired functionality
  test('isRequired should return true when validator does not have optional', () => {
    const element = new Element<string>({
      name: 'requiredConfig',
      description: 'A required config element',
      default: 'default',
      example: 'example',
      sensitive: false,
      omitFromSchema: false,
      validator: z.string()
    });

    expect(element.isRequired()).toBe(true);
  });

  test('isRequired should return false when validator is optional', () => {
    const element = new Element<string | undefined>({
      name: 'optionalConfig',
      description: 'An optional config element',
      default: 'default',
      example: 'example',
      sensitive: false,
      omitFromSchema: false,
      validator: z.string().optional()
    });

    expect(element.isRequired()).toBe(false);
  });

  test('should initialize with omitFromSchema property', () => {
    const element = new Element<string>({
      name: 'privateConfig',
      description: 'A private config element',
      default: 'default',
      example: 'example',
      sensitive: false,
      omitFromSchema: true
    });

    expect(element.omitFromSchema).toBe(true);
  });

  test('should default omitFromSchema to false when not specified', () => {
    const element = new Element<string>({
      name: 'publicConfig',
      description: 'A public config element',
      default: 'default',
      example: 'example'
    });

    expect(element.omitFromSchema).toBe(false);
  });
});
