# Element

Individual configuration option with type, default value, and validation.

## Constructor

```typescript
new Element<T>(
  name: string,                     // The name of the configuration element
  description?: string,             // Optional description of the element
  defaultValue?: T,                 // Optional default value for the element
  exampleValue?: T,                 // Optional example value for documentation
  sensitive?: boolean,              // Whether the element contains sensitive data (default: false)
  omitFromSchema?: boolean,         // Whether to omit this element from exported schema documentation (default: false), useful for private configuration elements that shouldn't be documented in public API schemas
  validator?: Joi.AnySchema<T>,     // Joi schema for validation (default: Joi.any())
  logger?: Logger                   // Optional logger instance (default: null)
)
```
