# EnvVarBind

Retrieves configuration values from environment variables.

## Constructor

```typescript
new EnvVarBind(prefix?: string)
```

## Environment Variable Naming

Converts `section.element` to `SECTION_ELEMENT` (uppercase).

Examples:

- `server.port` → `SERVER_PORT`
- With prefix `APP`: `server.port` → `APP_SERVER_PORT`
