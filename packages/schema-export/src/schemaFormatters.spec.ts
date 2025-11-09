import { formatAsJSON, formatAsYAML } from './schemaFormatters';
import { ExportedSchema } from './schemaExporter';

describe('Schema Formatters', () => {
  const mockSchema: ExportedSchema = {
    name: 'testApp',
    sections: [
      {
        name: 'app',
        description: 'Application settings',
        elements: [
          {
            name: 'port',
            description: 'Server port',
            type: 'number',
            default: 3000,
            example: 8080,
            required: false,
            sensitive: false,
            joiValidation: {
              type: 'number',
              rules: [
                { name: 'min', args: { limit: 1 } },
                { name: 'max', args: { limit: 65535 } }
              ]
            }
          },
          {
            name: 'apiKey',
            description: 'API key',
            type: 'string',
            default: undefined,
            example: 'sk_test_123',
            required: true,
            sensitive: true,
            joiValidation: { type: 'string', flags: { presence: 'required' } }
          }
        ]
      },
      {
        name: 'database',
        description: 'Database configuration',
        elements: [
          {
            name: 'host',
            description: 'Database host',
            type: 'string',
            default: 'localhost',
            example: undefined,
            required: false,
            sensitive: false,
            joiValidation: { type: 'string' }
          }
        ]
      }
    ]
  };

  describe('formatAsJSON', () => {
    it('should format schema as pretty JSON', () => {
      const result = formatAsJSON(mockSchema, true);

      expect(result).toContain('"name": "testApp"');
      expect(result).toContain('"port"');
      expect(result).toContain('"database"');
      expect(JSON.parse(result)).toEqual(mockSchema);
    });

    it('should format schema as compact JSON', () => {
      const result = formatAsJSON(mockSchema, false);

      expect(result).not.toContain('\n');
      expect(JSON.parse(result)).toEqual(mockSchema);
    });
  });

  describe('formatAsYAML', () => {
    it('should format schema as YAML', () => {
      const result = formatAsYAML(mockSchema);

      expect(result).toContain('name: testApp');
      expect(result).toContain('port:');
      expect(result).toContain('database:');
      expect(result).toBeTruthy();
    });
  });
});
