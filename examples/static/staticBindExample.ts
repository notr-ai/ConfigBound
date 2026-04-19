import {
  ConfigBound,
  configItem,
  configEnum,
  configSection
} from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import { StaticBind } from '@config-bound/config-bound/bind/binds/static';
import { z } from 'zod';

/**
 * Example demonstrating static in-memory config values with optional env overrides.
 */
function generateRuntimeSecret(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

const staticValues = {
  app: {
    port: 7000,
    host: '127.0.0.1',
    environment: 'staging'
  },
  database: {
    host: 'static-db.internal',
    port: 5432,
    name: 'app_from_static',
    username: 'static_user'
  },
  logging: {
    level: 'warn',
    format: 'text'
  },
  api: {
    key: generateRuntimeSecret('example_api_key'),
    timeout: 3000,
    retries: 5
  }
};

async function main() {
  const config = await ConfigBound.createConfig(
    {
      port: configItem({
        default: 3000,
        validator: z.number().int().min(0).max(65535),
        description: 'Application server port'
      }),
      environment: configEnum({
        values: ['development', 'staging', 'production'],
        default: 'development',
        description: 'Runtime environment'
      }),
      host: configItem({
        default: '0.0.0.0',
        validator: z.string().ip(),
        description: 'Application server host'
      }),
      database: configSection(
        {
          host: configItem({
            default: 'localhost',
            validator: z.string(),
            description: 'Database host'
          }),
          port: configItem({
            default: 5432,
            validator: z.number().int().min(0).max(65535),
            description: 'Database port'
          }),
          name: configItem({
            default: 'myapp',
            validator: z.string(),
            description: 'Database name'
          }),
          username: configItem({
            default: 'postgres',
            validator: z.string(),
            description: 'Database username'
          }),
          password: configItem({
            validator: z.string(),
            description: 'Database password',
            sensitive: true
          })
        },
        'Database configuration'
      ),
      logging: configSection(
        {
          level: configEnum({
            values: ['trace', 'debug', 'info', 'warn', 'error'],
            default: 'info',
            description: 'Log level'
          }),
          format: configEnum({
            values: ['json', 'text'],
            default: 'json',
            description: 'Log format'
          })
        },
        'Logging configuration'
      ),
      api: configSection(
        {
          key: configItem({
            validator: z.string(),
            description: 'API key for external services',
            sensitive: true
          }),
          timeout: configItem({
            default: 5000,
            validator: z.number().min(0),
            description: 'API timeout in milliseconds'
          }),
          retries: configItem({
            default: 3,
            validator: z.number().min(0).max(10),
            description: 'Number of API retries'
          })
        },
        'API configuration'
      )
    },
    {
      // Bind order is priority; env vars override static defaults.
      binds: [new EnvVarBind({ prefix: 'EXAMPLE' }), new StaticBind(staticValues)]
    }
  );

  console.log('=== StaticBind Example ===');
  console.log();

  console.log('App Section:');
  console.log(`  Port: ${await config.get('app', 'port')}`);
  console.log(`  Environment: ${await config.get('app', 'environment')}`);
  console.log(`  Host: ${await config.get('app', 'host')}`);

  console.log('\nDatabase Section:');
  console.log(`  Host: ${await config.get('database', 'host')}`);
  console.log(`  Port: ${await config.get('database', 'port')}`);
  console.log(`  Name: ${await config.get('database', 'name')}`);
  console.log(`  Username: ${await config.get('database', 'username')}`);
  console.log(
    `  Password: ${await config.get('database', 'password') ? '[SET]' : '[NOT SET]'}`
  );

  console.log('\nLogging Section:');
  console.log(`  Level: ${await config.get('logging', 'level')}`);
  console.log(`  Format: ${await config.get('logging', 'format')}`);

  console.log('\nAPI Section:');
  console.log(`  Key: ${await config.get('api', 'key') ? '[SET]' : '[NOT SET]'}`);
  console.log(`  Timeout: ${await config.get('api', 'timeout')}ms`);
  console.log(`  Retries: ${await config.get('api', 'retries')}`);
  console.log('  API key source: runtime-generated StaticBind value');

  console.log('\nTry overriding static values with env vars:');
  console.log('  EXAMPLE_APP_PORT=8080 npm run examples:static');
  console.log('  EXAMPLE_DATABASE_HOST=override-db npm run examples:static');
  console.log('  EXAMPLE_DATABASE_PASSWORD=secret EXAMPLE_API_KEY=secret npm run examples:static');
}

main();
