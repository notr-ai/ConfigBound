import {
  ConfigBound,
  configItem,
  configEnum,
  configSection
} from '../src/configBound';
import { EnvVarBind } from '../src/bind/binds/envVar';
import Joi from 'joi';

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
const validFormats = ['json', 'yaml', 'all'];
if (!validFormats.includes(format)) {
  console.log('Usage: npm run examples:export [format]');
  console.log('Formats: json, yaml, all (default)');
  console.log();
  console.log('Examples:');
  console.log('  npm run examples:export json     # JSON format only');
  console.log('  npm run examples:export yaml     # YAML format only');
  console.log('  npm run examples:export all      # Both formats (default)');
  console.log();
  console.log('Or use individual scripts:');
  console.log('  npm run examples:export:json     # JSON format only');
  console.log('  npm run examples:export:yaml     # YAML format only');
  process.exit(1);
}

const config = ConfigBound.createConfig(
  {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
      description: 'Application server port',
      example: 8080
    }),
    environment: configEnum<'development' | 'staging' | 'production'>({
      values: ['development', 'staging', 'production'],
      default: 'development',
      description: 'Runtime environment for the application'
    }),
    host: configItem<string>({
      default: '0.0.0.0',
      validator: Joi.string(),
      description: 'Application server host address'
    }),
    logLevel: configEnum<'debug' | 'info' | 'warn' | 'error'>({
      values: ['debug', 'info', 'warn', 'error'],
      default: 'info',
      description: 'Logging verbosity level'
    }),
    database: configSection(
      {
        host: configItem<string>({
          default: 'localhost',
          validator: Joi.string().hostname(),
          description: 'Database server hostname',
          example: 'db.example.com'
        }),
        port: configItem<number>({
          default: 5432,
          validator: Joi.number().port(),
          description: 'Database server port'
        }),
        name: configItem<string>({
          default: 'myapp',
          validator: Joi.string().min(1),
          description: 'Database name',
          example: 'production_db'
        }),
        username: configItem<string>({
          validator: Joi.string().required(),
          description: 'Database username',
          example: 'dbuser'
        }),
        password: configItem<string>({
          validator: Joi.string().required(),
          description: 'Database password',
          sensitive: true,
          example: 'super_secret_password'
        }),
        ssl: configItem<boolean>({
          default: false,
          validator: Joi.boolean(),
          description: 'Enable SSL/TLS for database connection'
        })
      },
      'Database connection configuration'
    ),
    api: configSection(
      {
        baseUrl: configItem<string>({
          default: 'https://api.example.com',
          validator: Joi.string().uri(),
          description: 'Base URL for external API',
          example: 'https://api.production.com'
        }),
        apiKey: configItem<string>({
          validator: Joi.string().required(),
          description: 'API key for authentication',
          sensitive: true,
          example: 'sk_live_1234567890abcdef'
        }),
        timeout: configItem<number>({
          default: 5000,
          validator: Joi.number().min(100).max(60000),
          description: 'Request timeout in milliseconds',
          example: 10000
        }),
        retries: configItem<number>({
          default: 3,
          validator: Joi.number().min(0).max(10),
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
const schema = config.exportSchema();

// Handle different format outputs
if (format === 'all' || format === 'json') {
  console.log('JSON EXPORT');
  console.log('-'.repeat(48));
  const json = config.toJSON();
  console.log(json);
  console.log();
}

if (format === 'all' || format === 'yaml') {
  console.log('YAML EXPORT');
  console.log('-'.repeat(48));
  try {
    const yaml = config.toYAML();
    console.log(yaml);
  } catch (error) {
    console.log(
      'YAML export requires js-yaml to be installed: npm install js-yaml'
    );
  }
  console.log();
}

console.log('ENVIRONMENT VARIABLE MAPPING');
console.log('-'.repeat(48));
console.log('Environment variables that can be set (with MYAPP prefix):');
schema.sections.forEach((section) => {
  section.elements.forEach((element) => {
    const envVarName = `MYAPP_${section.name.toUpperCase()}_${element.name.toUpperCase()}`;
    const required = element.required && element.default === undefined;
    console.log(`  ${envVarName}${required ? ' *' : ''}`);
  });
});
console.log('\n* = Required (no default value)');
console.log();

console.log('='.repeat(48));
console.log('Export completed successfully!');
console.log('='.repeat(48));
