import {
  formatAsJSON,
  formatAsYAML,
  formatAsEnvExample
} from './schemaFormatters.js';
import { ExportedSchema } from './schemaExporter.js';

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
      expect(result).toContain('- name: port');
      expect(result).toContain('- name: database');
      expect(result).toBeTruthy();
    });
  });

  describe('formatAsEnvExample', () => {
    it('should format schema as .env.example without prefix', () => {
      const result = formatAsEnvExample(mockSchema);

      expect(result).toContain('# testApp Configuration');
      expect(result).toContain('# Generated from schema export');
      expect(result).toContain('APP_PORT=');
      expect(result).toContain('APP_APIKEY=');
      expect(result).toContain('DATABASE_HOST=');
      expect(result).toContain('# Server port');
      expect(result).toContain('# API key');
      expect(result).toContain('# Database host');
    });

    it('should format schema as .env.example with prefix', () => {
      const result = formatAsEnvExample(mockSchema, 'MYAPP');

      expect(result).toContain('MYAPP_APP_PORT=');
      expect(result).toContain('MYAPP_APP_APIKEY=');
      expect(result).toContain('MYAPP_DATABASE_HOST=');
    });

    it('should include example values when available', () => {
      const result = formatAsEnvExample(mockSchema);

      expect(result).toContain('APP_PORT=8080');
    });

    it('should include default values when example is not available', () => {
      const result = formatAsEnvExample(mockSchema);

      expect(result).toContain('DATABASE_HOST=localhost');
    });

    it('should use placeholder for sensitive values', () => {
      const result = formatAsEnvExample(mockSchema);

      expect(result).toContain('APP_APIKEY=your-example-value');
    });

    it('should mark required fields', () => {
      const result = formatAsEnvExample(mockSchema);

      expect(result).toContain('# API key (required)');
    });

    it('should handle sections without descriptions', () => {
      const schemaWithoutDesc: ExportedSchema = {
        name: 'test',
        sections: [
          {
            name: 'app',
            elements: [
              {
                name: 'port',
                type: 'number',
                default: 3000,
                required: false,
                sensitive: false,
                joiValidation: {}
              }
            ]
          }
        ]
      };

      const result = formatAsEnvExample(schemaWithoutDesc);
      expect(result).toContain('APP_PORT=3000');
    });

    it('should handle elements without descriptions', () => {
      const schemaWithoutElementDesc: ExportedSchema = {
        name: 'test',
        sections: [
          {
            name: 'app',
            description: 'App config',
            elements: [
              {
                name: 'port',
                type: 'number',
                default: 3000,
                required: false,
                sensitive: false,
                joiValidation: {}
              }
            ]
          }
        ]
      };

      const result = formatAsEnvExample(schemaWithoutElementDesc);
      expect(result).toContain('# App config');
      expect(result).toContain('APP_PORT=3000');
    });
  });
});
