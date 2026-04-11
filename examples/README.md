# ConfigBound Examples

This directory contains comprehensive examples demonstrating the ConfigBound library using the recommended `createConfig` approach.

## Examples

### `envVar/envVarBindExample.ts` - EnvVar Bind Configuration Example

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

### `file/fileBindExample.ts` - File Bind Configuration Example

A file-based example showing how to:

- Load values from a YAML config file using `FileBind`
- Keep schema validation and type safety with `createConfig`
- Layer binds so environment variables override file values
- Use a checked-in file (`file/config.yaml`) as a baseline config

### `static/staticBindExample.ts` - Static Bind Configuration Example

An in-memory object example showing how to:

- Provide baseline config values using `StaticBind`
- Keep schema validation and type safety with `createConfig`
- Layer binds so environment variables override static values
- Use deterministic values without relying on external files
- Keep sensitive values out of source literals and inject them at runtime

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

# Run the file bind example
npm run examples:file

# Run the static bind example
npm run examples:static

# Run the export example
npm run examples:export
```

### Direct execution

```bash
# Build the project first
npm run build

# Run examples directly
node dist/envVar/envVarBindExample.js
node dist/file/fileBindExample.js
node dist/static/staticBindExample.js
```

## Environment Variable Usage

The example shows how environment variables automatically override configuration values:

```bash
# Override specific values
EXAMPLE_APP_PORT=8080                    # Override app port
EXAMPLE_DATABASE_HOST=prod-db.example.com # Override database host
EXAMPLE_API_KEY=your-secret-key          # Override API key
EXAMPLE_LOGGING_LEVEL=debug              # Override log level
```

## Turbo Integration

This examples workspace is integrated with Turbo for efficient task orchestration. Turbo will automatically:

- Build dependencies before running examples
- Cache successful builds for faster subsequent runs
- Run tasks in parallel where possible
