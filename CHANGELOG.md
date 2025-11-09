# Changelog

## 1.0.0

### Patch Changes

- Add configuration schema export functionality
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

## [0.0.5] - 2025-10-24

### Changed

- Updated the way that configuration is created

## [0.0.4] - 2025-06-04

### Changed

- Add exports to package.json
- Fix element validation
- Update tsconfig to use ES2020 target and module resolution
- Update tsconfig to emit declaration files
- Add example directory

## [0.0.3] - 2025-05-23

### Changed

- Add repository to package.json for use in provenance attestations

## [0.0.2] - 2025-05-22

### Changed

- Improve CI/CD pipeline
- Force release to test release pipeline

## [0.0.1] - 2025-05-22

### Added

- Initial release of @config-bound/config-bound
