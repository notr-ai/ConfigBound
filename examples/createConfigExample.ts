import { ConfigBound, configItem, configEnum, configSection } from '../src/configBound';
import { EnvVarBind } from '../src/bind/binds/envVar';
import Joi from 'joi';

/**
 * Example demonstrating ConfigBound.createConfig with type safety
 *
 * This example shows how to use the typed schema system that preserves
 * type information throughout the configuration process.
 */

// Define configuration schema with proper typing
const config = ConfigBound.createConfig({
  // Top-level properties go into 'app' section
  port: configItem<number>({
    default: 3000,
    validator: Joi.number().port(),
    description: 'Application server port'
  }),
  environment: configEnum<'development' | 'staging' | 'production'>({
    values: ['development', 'staging', 'production'],
    default: 'development',
    description: 'Runtime environment'
  }),
  host: configItem<string>({
    default: '0.0.0.0',
    validator: Joi.string(),
    description: 'Application server host'
  }),
  ssl: configItem<boolean>({
    default: false,
    validator: Joi.boolean(),
    description: 'Enable SSL'
  }),
  database: configSection({
    host: configItem<string>({
      default: 'localhost',
      validator: Joi.string().hostname(),
      description: 'Database host'
    }),
    port: configItem<number>({
      default: 5432,
      validator: Joi.number().port(),
      description: 'Database port'
    }),
    name: configItem<string>({
      default: 'myapp',
      validator: Joi.string(),
      description: 'Database name'
    }),
    username: configItem<string>({
      default: 'postgres',
      validator: Joi.string(),
      description: 'Database username'
    }),
    password: configItem<string>({
      validator: Joi.string(),
      description: 'Database password',
      sensitive: true
    }),
    ssl: configItem<boolean>({
      default: false,
      validator: Joi.boolean(),
      description: 'Enable SSL for database connection'
    }),
    maxConnections: configItem<number>({
      default: 10,
      validator: Joi.number().min(1).max(100),
      description: 'Maximum database connections'
    })
  }, 'Database configuration'),

  logging: configSection({
    level: configEnum<'trace' | 'debug' | 'info' | 'warn' | 'error'>({
      values: ['trace', 'debug', 'info', 'warn', 'error'],
      default: 'info',
      description: 'Log level'
      // The validator is automatically generated from the values array
    }),
    format: configEnum<'json' | 'text'>({
      values: ['json', 'text'],
      default: 'json',
      description: 'Log format'
    })
  }, 'Logging configuration'),

  api: configSection({
    key: configItem<string>({
      validator: Joi.string(),
      description: 'API key for external services',
      sensitive: true
    }),
    timeout: configItem<number>({
      default: 5000,
      validator: Joi.number().min(0),
      description: 'API timeout in milliseconds'
    }),
    retries: configItem<number>({
      default: 3,
      validator: Joi.number().min(0).max(10),
      description: 'Number of API retries'
    })
  }, 'API configuration')
});

// Add binds
// This is where you specify HOW to get the data, not WHAT the data looks like

config.addBind(new EnvVarBind({ prefix: 'EXAMPLE' }));

// Access configuration values with full type safety and autocomplete!
console.log('=== Application Configuration ===\n');

console.log('App Section:');
console.log(`  Port: ${config.get('app', 'port')}`);
console.log(`  Environment: ${config.get('app', 'environment')}`);
console.log(`  Host: ${config.get('app', 'host')}`);
console.log(`  SSL: ${config.get('app', 'ssl')}`);

console.log('\nDatabase Section:');
console.log(`  Host: ${config.get('database', 'host')}`);
console.log(`  Port: ${config.get('database', 'port')}`);
console.log(`  Name: ${config.get('database', 'name')}`);
console.log(`  Username: ${config.get('database', 'username')}`);
console.log(`  Password: ${config.get('database', 'password') ? '[SET]' : '[NOT SET]'}`);
console.log(`  SSL: ${config.get('database', 'ssl')}`);
console.log(`  Max Connections: ${config.get('database', 'maxConnections')}`);

console.log('\nLogging Section:');
console.log(`  Level: ${config.get('logging', 'level')}`);
console.log(`  Format: ${config.get('logging', 'format')}`);

console.log('\nAPI Section:');
console.log(`  Key: ${config.get('api', 'key') ? '[SET]' : '[NOT SET]'}`);
console.log(`  Timeout: ${config.get('api', 'timeout')}ms`);
console.log(`  Retries: ${config.get('api', 'retries')}`);

console.log('\n=== All Sections ===');
const sections = config.getSections();
console.log(`Total sections: ${sections.length}`);
sections.forEach(section => {
  console.log(`  - ${section.name} (${section.getElements().length} elements)`);
});

console.log('\n=== Environment Variable Usage ===');
console.log('You can override any configuration value using environment variables:');
console.log('  EXAMPLE_APP_PORT=8080                    # Override app port');
console.log('  EXAMPLE_DATABASE_HOST=prod-db.example.com # Override database host');
console.log('  EXAMPLE_API_KEY=your-secret-key          # Override API key');
console.log('  EXAMPLE_LOGGING_LEVEL=debug              # Override log level');
console.log('\nOr with custom prefix (if using EnvVarBind with prefix):');
console.log('  EXAMPLE_APP_PORT=8080                  # With EXAMPLE_APP_ prefix');
console.log('  EXAMPLE_DATABASE_HOST=prod-db...   # With EXAMPLE_DATABASE_ prefix');

console.log('\n=== Validation ===');
console.log('You can validate all configuration at startup:');
console.log('  config.validate();                # Throws if any value is invalid');
console.log('  const errors = config.getValidationErrors(); # Returns all errors');
console.log('\nOr validate on initialization:');
console.log('  const config = ConfigBound.createConfig(schema, {');
console.log('    validateOnInit: true            # Validates immediately');
console.log('  });');

console.log('\n✅ Example completed successfully!');
