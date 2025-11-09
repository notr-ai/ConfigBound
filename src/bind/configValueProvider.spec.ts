import Joi from 'joi';
import { ConfigBound } from '../configBound';
import { Element } from '../element/element';
import { Section } from '../section/section';
import { EnvVarBind } from './binds/envVar';
import { ConsoleLogger, NullLogger } from '../utilities/logger';

/**
 * @group integration
 */
describe('ConfigValueProvider functionality', () => {
  let configBound: ConfigBound;
  let serverSection: Section;
  let databaseSection: Section;
  let portElement: Element<number>;
  let hostElement: Element<string>;
  let dbHostElement: Element<string>;
  let dbPortElement: Element<number>;

  beforeEach(() => {
    // Set environment variables before creating any objects
    process.env.TEST_APP_SERVER_PORT = '8081';
    process.env.TEST_APP_DATABASE_HOST = 'test-db.example.com';

    // Create config elements for server
    portElement = new Element<number>(
      'port',
      'The port for the server to listen on',
      3000, // default
      8080, // example
      false, // not sensitive
      false, // not omitted from schema
      Joi.number().port().required()
    );

    hostElement = new Element<string>(
      'host',
      'The host for the server',
      'localhost', // default
      '0.0.0.0', // example
      false, // not sensitive
      false, // not omitted from schema
      Joi.string().required()
    );

    // Create config elements for database
    dbHostElement = new Element<string>(
      'host',
      'The database host',
      'localhost', // default
      'db.example.com', // example
      false, // not sensitive
      false, // not omitted from schema
      Joi.string().required()
    );

    dbPortElement = new Element<number>(
      'port',
      'The database port',
      5432, // default
      5432, // example
      false, // not sensitive
      false, // not omitted from schema
      Joi.number().port().required()
    );

    // Create sections
    serverSection = new Section(
      'server',
      [portElement, hostElement],
      'Server configuration settings'
    );

    databaseSection = new Section(
      'database',
      [dbHostElement, dbPortElement],
      'Database configuration settings'
    );

    // Create bind first
    const envVarBind = new EnvVarBind({ prefix: 'TEST_APP' });

    // Create the config bound with bind and then add sections
    configBound = new ConfigBound(
      'my-app',
      [envVarBind],
      [],
      process.env.TEST_USE_CONSOLE_LOGGER === 'true'
        ? new ConsoleLogger()
        : new NullLogger()
    );

    // Add sections to the configBound
    configBound.addSection(serverSection);
    configBound.addSection(databaseSection);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.TEST_APP_SERVER_PORT;
    delete process.env.TEST_APP_DATABASE_HOST;
  });

  test('elements can get their values directly from the config value provider', () => {
    // Get the config value provider from the section
    const serverConfigValueProvider = serverSection.getConfigValueProvider();
    expect(serverConfigValueProvider).toBeDefined();

    // Elements should be able to get their values from the config value provider
    const portValue = portElement.get<number>(serverConfigValueProvider!);
    expect(portValue).toBe(8081);

    // Host element should use default since not in env
    const hostValue = hostElement.get<string>(serverConfigValueProvider!);
    expect(hostValue).toBe('localhost');
  });

  test('sections can get element values directly with getValue', () => {
    // Get element values through the section
    const portValue = serverSection.getValue<number>('port');
    expect(portValue).toBe(8081);

    const dbHostValue = databaseSection.getValue<string>('host');
    expect(dbHostValue).toBe('test-db.example.com');

    // Non-existent element should return undefined
    const nonExistentValue = serverSection.getValue<string>('nonexistent');
    expect(nonExistentValue).toBeUndefined();
  });

  test('configBound can get values via get method', () => {
    // Get values through the configBound
    const portValue = configBound.get<number>('server', 'port');
    expect(portValue).toBe(8081);

    const dbHostValue = configBound.get<string>('database', 'host');
    expect(dbHostValue).toBe('test-db.example.com');

    // Element with default value should use default
    const hostValue = configBound.get<string>('server', 'host');
    expect(hostValue).toBe('localhost');
  });
});
