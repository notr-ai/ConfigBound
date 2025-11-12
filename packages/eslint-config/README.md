# @config-bound/eslint-config

Shared ESLint configuration for ConfigBound projects.

## Usage

### For applications (with turbo plugin)

In your `eslint.config.mjs`:

```javascript
import configBoundConfig from '@config-bound/eslint-config';

export default configBoundConfig;
```

### For packages (without turbo plugin)

In your `eslint.config.mjs`:

```javascript
import configBoundConfig from '@config-bound/eslint-config/package.eslint.mjs';

export default configBoundConfig;
```

### Extending the configuration

```javascript
import configBoundConfig from '@config-bound/eslint-config';

export default [
  ...configBoundConfig,
  {
    rules: {
      // Your custom rules
    }
  }
];
```

## What's included

- TypeScript ESLint recommended rules
- Prettier integration
- Jest plugin for test files
- Turbo plugin (in index.eslint.mjs only)
- Common code quality rules
