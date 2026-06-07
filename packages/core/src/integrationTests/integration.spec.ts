import { z } from 'zod';
import { ConfigBound } from '../configBound';
import { Element } from '../element/element';
import { Section } from '../section/section';
import { EnvVarBind } from '../bind/binds/envVar';
import { testLogger } from '../../test/testUtils';

let config: ConfigBound;

/**
 * @group integration
 */
describe('envVarBindIntegration', () => {
  beforeEach(async () => {
    // Set environment variables first
    process.env.MY_APP_SERVER_PORT = '8081';
    process.env.MY_APP_API_APIKEY = 'abc123';

    // Create config elements
    const serverPortElement = new Element<number>({
      name: 'port',
      description: 'The port for the server to listen on',
      default: 3000,
      example: 8080,
      sensitive: false,
      omitFromSchema: false,
      validator: z.number().int().min(0).max(65535)
    });

    const apiKeyElement = new Element<string>({
      name: 'apiKey',
      description: 'API key for external service',
      example: 'abc123',
      sensitive: true,
      omitFromSchema: false,
      validator: z.string()
    });

    // Create a section
    const serverSection = new Section(
      'server',
      [serverPortElement],
      'Server configuration settings'
    );

    const apiSection = new Section(
      'api',
      [apiKeyElement],
      'API configuration settings'
    );

    // Create an env var bind
    const envVarBind = await EnvVarBind.create({ prefix: 'MY_APP' });

    // Create the config bound with the bind
    config = new ConfigBound('my-app', [envVarBind], [], testLogger());

    // Add sections after creating the config bound
    config.addSection(serverSection);
    config.addSection(apiSection);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.MY_APP_SERVER_PORT;
    delete process.env.MY_APP_API_APIKEY;
  });

  it('should bind the config elements', () => {
    expect(config).toBeDefined();
  });

  it('should get the port from the env var', async () => {
    await expect(config.get<number>('server', 'port')).resolves.toBe(8081);
  });

  it('should get the api key from the env var', async () => {
    await expect(config.get<string>('api', 'apiKey')).resolves.toBe('abc123');
  });
});
