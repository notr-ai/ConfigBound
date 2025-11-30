---
'@config-bound/config-bound': patch
---

Add configuration schema export functionality

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





