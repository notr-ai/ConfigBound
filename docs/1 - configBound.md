# ConfigBound

Main configuration object containing sections and binds.

## Constructor

```typescript
new ConfigBound(name: string, binds: Bind[], sections: Section[])
```

## Methods

- `get(section: string, element: string): T` - Get configuration value
- `validate(): void` - Validate all configuration values
