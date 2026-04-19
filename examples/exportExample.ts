import {
  ConfigBound,
  configItem,
  configEnum,
  configSection
} from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import {
  exportSchema,
  formatAsEnvExample,
  formatAsJSON,
  formatAsYAML
} from '@config-bound/schema-export';
import { z } from 'zod';

/**
 * Example demonstrating configuration schema export functionality
 *
 * This example shows how to:
 * - Export configuration schema to different formats
 * - Generate documentation automatically
 * - Inspect configuration structure programmatically
 *
 * Usage:
 *   node exportExample.js [format]
 *   npm run examples:export [format]
 *
 * Formats: json, yaml, all (default)
 */

// Get format parameter from command line
const format = process.argv[2] || 'all';

// Show help if invalid format
const validFormats = ['json', 'yaml', 'env', 'all'];
if (!validFormats.includes(format)) {
  console.log('Usage: npm run examples:export [format]');
  console.log('Formats: json, yaml, env, all (default)');
  console.log();
  console.log('Examples:');
  console.log('  npm run examples:export json     # JSON format only');
  console.log('  npm run examples:export yaml     # YAML format only');
  console.log('  npm run examples:export env      # .env.example format only');
  console.log('  npm run examples:export all      # Both formats (default)');
  console.log();
  console.log('Or use individual scripts:');
  console.log('  npm run examples:export:json     # JSON format only');
  console.log('  npm run examples:export:yaml     # YAML format only');
  console.log('  npm run examples:export:env      # .env.example format only');
  process.exit(1);
}

async function main() {
  const config = await ConfigBound.createConfig(
    {
      port: configItem<number>({
        default: 3000,
        validator: z.number().int().min(0).max(65535),
        description: 'Application server port',
        example: 8080
      }),
      environment: configEnum({
        values: ['development', 'staging', 'production'],
        default: 'development',
        description: 'Runtime environment for the application'
      }),
      host: configItem<string>({
        default: '0.0.0.0',
        validator: z.string(),
        description: 'Application server host address'
      }),
      logLevel: configEnum({
        values: ['debug', 'info', 'warn', 'error'],
        default: 'info',
        description: 'Logging verbosity level'
      }),
      database: configSection(
        {
          host: configItem<string>({
            default: 'localhost',
            validator: z.string(),
            description: 'Database server hostname',
            example: 'db.example.com'
          }),
          port: configItem<number>({
            default: 5432,
            validator: z.number().int().min(0).max(65535),
            description: 'Database server port'
          }),
          name: configItem<string>({
            default: 'myapp',
            validator: z.string().min(1),
            description: 'Database name',
            example: 'production_db'
          }),
          username: configItem<string>({
            validator: z.string(),
            description: 'Database username',
            example: 'dbuser'
          }),
          password: configItem<string>({
            validator: z.string(),
            description: 'Database password',
            sensitive: true,
            example: 'super_secret_password'
          }),
          ssl: configItem<boolean>({
            default: false,
            validator: z.boolean(),
            description: 'Enable SSL/TLS for database connection'
          })
        },
        'Database connection configuration'
      ),
      api: configSection(
        {
          baseUrl: configItem<string>({
            default: 'https://api.example.com',
            validator: z.string().url(),
            description: 'Base URL for external API',
            example: 'https://api.production.com'
          }),
          apiKey: configItem<string>({
            validator: z.string(),
            description: 'API key for authentication',
            sensitive: true,
            example: 'sk_live_1234567890abcdef'
          }),
          timeout: configItem<number>({
            default: 5000,
            validator: z.number().min(100).max(60000),
            description: 'Request timeout in milliseconds',
            example: 10000
          }),
          retries: configItem<number>({
            default: 3,
            validator: z.number().min(0).max(10),
            description: 'Number of retry attempts for failed requests'
          })
        },
        'External API configuration'
      )
    },
    {
      binds: [new EnvVarBind({ prefix: 'MYAPP' })],
      name: 'myApplication'
    }
  );

  console.log('='.repeat(48));
  console.log('Configuration Schema Export Examples');
  if (format !== 'all') {
    console.log(`Format: ${format.toUpperCase()}`);
  }
  console.log('='.repeat(48));
  console.log();

  // Get the schema for inspection
  const schema = exportSchema(config.name, config.sections);

  // Handle different format outputs
  if (format === 'all' || format === 'json') {
    console.log('JSON EXPORT');
    console.log('-'.repeat(48));
    const json = formatAsJSON(schema);
    console.log(json);
    console.log();
  }

  if (format === 'all' || format === 'yaml') {
    console.log('YAML EXPORT');
    console.log('-'.repeat(48));
    const yaml = formatAsYAML(schema);
    console.log(yaml);
    console.log();
  }
  if (format === 'all' || format === 'env') {
    console.log('.ENV.EXAMPLE EXPORT');
    console.log('-'.repeat(48));
    const envExample = formatAsEnvExample(schema, 'MYAPP');
    console.log(envExample);
    console.log();
  }

  console.log('='.repeat(48));
  console.log('Export completed successfully!');
  console.log('='.repeat(48));
}

main();
