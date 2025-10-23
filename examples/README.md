# ConfigBound Examples

This directory contains a comprehensive example demonstrating the ConfigBound library using the recommended `createConfig` approach.

## Example

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

## Running the example

You can run the example in several ways:

### From the root directory using Turbo

```bash
# Run the example
npm run examples
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
