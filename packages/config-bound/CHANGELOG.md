# @config-bound/config-bound

## 0.1.0

### Minor Changes

- 3c2cf21: Add a CLI to export and interact with configuration schemas

### Patch Changes

- de1dc3b: Add configuration schema export functionality
  - Add `exportSchema()` method to get structured schema object
  - Add `toJSON(pretty?)` method for JSON export (pretty or compact)
  - Add `toYAML()` method for YAML export (requires optional js-yaml dependency)
  - Add comprehensive schema extraction with metadata (name, description, type, defaults, examples, validation rules, sensitive flags)
  - Add export examples with format selection (JSON, YAML, or both)
  - Add environment variable mapping with prefix support
  - Add programmatic inspection capabilities for required fields and validation rules
  - Update all examples to use environment variable prefixes by default
  - Add complete documentation for export functionality

  This enables automatic documentation generation, configuration discovery, and tooling integration from ConfigBound schemas.

- dca5c72: Bumped various dependencies to latest.
