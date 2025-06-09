/* eslint @typescript-eslint/no-unused-vars: 0 */
import { ConfigBound } from '@config-bound/config-bound';
import { Section } from '@config-bound/config-bound/section';
import { Element } from '@config-bound/config-bound/element';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import Joi from 'joi';

function main() {
  // Create the main configuration instance
  const config = new ConfigBound('myApp');

  // Add environment variable bind with prefix
  config.addBind(new EnvVarBind('MY_APP'));

  // Server Configuration Section
  const serverSection = new Section(
    'server',
    [
      new Element(
        'port',
        'The port for the server to listen on',
        3000,
        8080,
        false,
        Joi.number().port().required()
      ),
      new Element(
        'host',
        'The host for the server to bind to',
        'localhost',
        '0.0.0.0',
        false,
        Joi.string().hostname().required()
      ),
      new Element(
        'ssl',
        'Enable SSL/TLS',
        false,
        true,
        false,
        Joi.boolean().required()
      )
    ],
    'Server configuration settings'
  );

  // Database Configuration Section
  const databaseSection = new Section(
    'database',
    [
      new Element(
        'host',
        'Database host',
        'localhost',
        'db.example.com',
        false,
        Joi.string().required()
      ),
      new Element(
        'port',
        'Database port',
        5432,
        5432,
        false,
        Joi.number().port().required()
      ),
      new Element(
        'username',
        'Database username',
        'postgres',
        'myuser',
        false,
        Joi.string().required()
      ),
      new Element(
        'password',
        'Database password',
        undefined,
        'secretpassword',
        true, // sensitive
        Joi.string().min(8).required()
      ),
      new Element(
        'maxConnections',
        'Maximum number of database connections',
        10,
        50,
        false,
        Joi.number().min(1).max(100).required()
      )
    ],
    'Database configuration settings'
  );

  // API Configuration Section
  const apiSection = new Section(
    'api',
    [
      new Element(
        'key',
        'API key for external service',
        undefined,
        'abc123xyz',
        true, // sensitive
        Joi.string().alphanum().min(6).required()
      ),
      new Element(
        'timeout',
        'API request timeout in milliseconds',
        5000,
        10000,
        false,
        Joi.number().min(1000).max(30000).required()
      ),
      new Element(
        'retries',
        'Number of retry attempts',
        3,
        5,
        false,
        Joi.number().min(0).max(10).required()
      )
    ],
    'External API configuration settings'
  );

  // Add sections to config
  config.addSection(serverSection);
  config.addSection(databaseSection);
  config.addSection(apiSection);

  // Usage Examples
  const port = config.get<number>('server', 'port');
  const host = config.get<string>('server', 'host');
  const ssl = config.get<boolean>('server', 'ssl');
  const dbHost = config.get<string>('database', 'host');
  const dbPort = config.get<number>('database', 'port');
  const dbUsername = config.get<string>('database', 'username');
  const dbPassword = config.get<string>('database', 'password');
  const dbMaxConnections = config.get<number>('database', 'maxConnections');
  const apiKey = config.get<string>('api', 'key');
  const apiTimeout = config.get<number>('api', 'timeout');
  const apiRetries = config.get<number>('api', 'retries');

  console.log(`server.port: ${port}`);
  console.log(`server.host: ${host}`);
  console.log(`server.ssl: ${ssl}`);
  console.log(`api.key: ${apiKey}`);
  console.log(`api.timeout: ${apiTimeout}`);
  console.log(`api.retries: ${apiRetries}`);
  console.log(`database.host: ${dbHost}`);
  console.log(`database.port: ${dbPort}`);
  console.log(`database.username: ${dbUsername}`);
  console.log(`database.password: ${dbPassword}`);
  console.log(`database.maxConnections: ${dbMaxConnections}`);
}

main();
