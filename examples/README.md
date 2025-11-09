# ConfigBound Examples

This directory contains comprehensive examples demonstrating the ConfigBound library using the recommended `createConfig` approach.

## Examples

### `createConfigExample.ts` - Comprehensive Configuration Example

A comprehensive example showing how to:

- Use the `createConfig` helper function for declarative configuration
- Define configuration with a schema-based approach
- Set up environment variable bindings automatically
- Work with different data types (string, number, boolean, array)
- Handle sensitive configuration values
- Create nested object configurations for different sections
- Access configuration values from different sections
- Override configuration using environment variables

The example demonstrates a typical application configuration with:

- **App Section**: Basic application settings (port, host, environment, SSL)
- **Database Section**: Database connection settings with sensitive data
- **API Section**: External API configuration with timeouts and retries
- **Logging Section**: Logging configuration with array support

### `exportExample.ts` - Schema Export Example

Demonstrates configuration schema export functionality:

- Export configuration schema to JSON, YAML, Markdown, and plain text formats
- Generate documentation automatically from your config
- Programmatically inspect configuration structure
- List required environment variables
- Extract validation rules and metadata

Use cases shown:

- **Documentation Generation**: Create Markdown docs from schema
- **Configuration Discovery**: Inspect all config options programmatically
- **Environment Variable Mapping**: Generate lists of required env vars
- **Schema Inspection**: Find all required fields, validation rules, etc.

## Running the examples

You can run the example in several ways:

### From the root directory using Turbo

```bash
# Run the basic configuration example
npm run examples:envVar

# Run the export example
npm run examples:export
```

### Direct execution

```bash
# Build the project first
npm run build

# Run the example
node dist/examples/createConfigExample.js
```

## Environment Variable Usage

The example shows how environment variables automatically override configuration values:

```bash
# Override specific values
PORT=8080                    # Override app port
DB_HOST=prod-db.example.com # Override database host
API_KEY=your-secret-key     # Override API key
LOG_LEVEL=debug             # Override log level
```

## Turbo Integration

This examples workspace is integrated with Turbo for efficient task orchestration. Turbo will automatically:

- Build dependencies before running examples
- Cache successful builds for faster subsequent runs
- Run tasks in parallel where possible
