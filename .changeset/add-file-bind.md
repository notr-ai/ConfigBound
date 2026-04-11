---
"@config-bound/config-bound": minor
---

Add FileBind for reading configuration from JSON, JSONC, and YAML files

- New `FileBind` class that reads config values from JSON, JSONC (comments + trailing commas), and YAML files
- Format auto-detected from file extension (`.json`, `.jsonc`, `.yml`, `.yaml`) with explicit override option
- `rootKey` option to scope into a subtree of the parsed file
- `reload()` method to re-read changed files at runtime
- YAML uses `JSON_SCHEMA` to prevent surprising type coercion (e.g., `yes` stays a string, not a boolean)
