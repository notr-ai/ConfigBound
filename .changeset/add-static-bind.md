---
"@config-bound/config-bound": minor
---

Add StaticBind for in-memory configuration values with nested key access.

- New `StaticBind` class for reading values from plain JavaScript objects without environment variables or files
- Supports nested object lookups via dot-path keys
- Preserves explicit `null` values and distinguishes them from missing keys
- Improves error handling consistency across bind implementations
