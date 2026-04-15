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

  test('elements can get their values directly from the config value provider', async () => {
    // Get the config value provider from the section
    const serverConfigValueProvider = serverSection.getConfigValueProvider();
    expect(serverConfigValueProvider).toBeDefined();

    // Elements should be able to get their values from the config value provider
    await expect(
      portElement.get<number>(serverConfigValueProvider!)
    ).resolves.toBe(8081);

    // Host element should use default since not in env
    await expect(
      hostElement.get<string>(serverConfigValueProvider!)
    ).resolves.toBe('localhost');
  });

  test('sections can get element values directly with getValue', async () => {
    // Get element values through the section
    await expect(serverSection.getValue<number>('port')).resolves.toBe(8081);

    await expect(databaseSection.getValue<string>('host')).resolves.toBe(
      'test-db.example.com'
    );

    // Non-existent element should return undefined
    await expect(
      serverSection.getValue<string>('nonexistent')
    ).resolves.toBeUndefined();
  });

  test('configBound can get values via get method', async () => {
    // Get values through the configBound
    await expect(configBound.get<number>('server', 'port')).resolves.toBe(8081);

    await expect(configBound.get<string>('database', 'host')).resolves.toBe(
      'test-db.example.com'
    );

    // Element with default value should use default
    await expect(configBound.get<string>('server', 'host')).resolves.toBe(
      'localhost'
    );
  });
});
