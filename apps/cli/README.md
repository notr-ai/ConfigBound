# @config-bound/cli

CLI tool for ConfigBound schema export and management.

## Installation

```bash
npm install -g @config-bound/cli
```

## Usage

### List discovered configs

```bash
configbound list [path]
```

Discovers all ConfigBound configurations in your project.

**Options:**

- `[path]` - Directory to search (default: current directory)
- `--recursive, -r` - Search subdirectories

**Example:**

```bash
npx configbound list ./src
npx configbound list --recursive
```

### Export schema

```bash
npx configbound export [options]
```

Exports ConfigBound schema in various formats.

**Smart Discovery:**

- If no `--config` is specified, automatically discovers configs in your project
- Auto-selects if only one config is found
- Prompts for selection if multiple configs exist
- Works with any file structure - finds `ConfigBound.createConfig()` calls anywhere

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode
npm run dev -- list

# Run tests
npm test
```

## License

MIT
