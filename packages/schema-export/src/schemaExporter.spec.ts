import { Section } from '@config-bound/core/section';
import { Element } from '@config-bound/core/element';
import { z } from 'zod';
import {
  exportElement,
  exportSection,
  exportSchema
} from './schemaExporter.js';

describe('Schema Exporter', () => {
  describe('exportElement', () => {
    it('should export a basic element', () => {
      const element = new Element<string>({
        name: 'testElement',
        description: 'A test element',
        default: 'default-value',
        example: 'example-value',
        sensitive: false,
        omitFromSchema: false,
        validator: z.string()
      });

      const exported = exportElement(element);

      expect(exported.name).toBe('testElement');
      expect(exported.description).toBe('A test element');
      expect(exported.type).toBe('string');
      expect(exported.default).toBe('default-value');
      expect(exported.example).toBe('example-value');
      expect(exported.required).toBe(true);
      expect(exported.sensitive).toBe(false);
    });

    it('should handle required elements', () => {
      const element = new Element<number>({
        name: 'requiredElement',
        description: 'A required element',
        example: 42,
        sensitive: false,
        omitFromSchema: false,
        validator: z.number()
      });

      const exported = exportElement(element);

      expect(exported.required).toBe(true);
    });

    it('should handle sensitive elements', () => {
      const element = new Element<string>({
        name: 'secretKey',
        description: 'API secret key',
        example: 'sk_test_123',
        sensitive: true,
        omitFromSchema: false,
        validator: z.string()
      });

      const exported = exportElement(element);

      expect(exported.sensitive).toBe(true);
    });

    it('should handle elements with omitFromSchema', () => {
      const element = new Element<string>({
        name: 'privateKey',
        description: 'Private configuration key',
        default: 'default',
        example: 'example',
        sensitive: false,
        omitFromSchema: true,
        validator: z.string()
      });

      expect(element.omitFromSchema).toBe(true);
    });

    it('should extract zod validation object', () => {
      const element = new Element<number>({
        name: 'port',
        description: 'Server port',
        default: 3000,
        sensitive: false,
        omitFromSchema: false,
        validator: z.number().min(1).max(65535)
      });

      const exported = exportElement(element);

      expect(exported.zodValidation).toBeDefined();
      expect((exported.zodValidation as any).type).toBe('number');
    });

    it('should handle enum types', () => {
      const element = new Element<string>({
        name: 'environment',
        description: 'Runtime environment',
        default: 'development',
        sensitive: false,
        omitFromSchema: false,
        validator: z.enum(['development', 'staging', 'production'])
      });

      const exported = exportElement(element);

      expect(exported.type).toContain('development');
      expect(exported.type).toContain('staging');
      expect(exported.type).toContain('production');
    });
  });

  describe('exportSection', () => {
    it('should export a section with elements', () => {
      const elements = [
        new Element<string>({
          name: 'host',
          description: 'Database host',
          default: 'localhost'
        }),
        new Element<number>({
          name: 'port',
          description: 'Database port',
          default: 5432
        })
      ];

      const section = new Section(
        'database',
        elements,
        'Database configuration'
      );

      const exported = exportSection(section);

      expect(exported.name).toBe('database');
      expect(exported.description).toBe('Database configuration');
      expect(exported.elements).toHaveLength(2);
      expect(exported.elements[0].name).toBe('host');
      expect(exported.elements[1].name).toBe('port');
    });

    it('should handle empty sections', () => {
      const section = new Section('empty', [], 'Empty section');

      const exported = exportSection(section);

      expect(exported.name).toBe('empty');
      expect(exported.elements).toHaveLength(0);
    });

    it('should filter out elements with omitFromSchema: true', () => {
      const publicElement = new Element<string>({
        name: 'appName',
        description: 'Application name',
        default: 'myApp',
        example: 'exampleApp',
        sensitive: false,
        omitFromSchema: false,
        validator: z.string()
      });
      const privateElement = new Element<string>({
        name: 'internalKey',
        description: 'Internal configuration key',
        default: 'secret',
        example: 'example',
        sensitive: false,
        omitFromSchema: true,
        validator: z.string()
      });

      const section = new Section(
        'app',
        [publicElement, privateElement],
        'Application settings'
      );
      const exported = exportSection(section);

      expect(exported.name).toBe('app');
      expect(exported.description).toBe('Application settings');
      expect(exported.elements).toHaveLength(1);
      expect(exported.elements[0].name).toBe('appName');
      expect(
        exported.elements.find(
          (e: { name: string }) => e.name === 'internalKey'
        )
      ).toBeUndefined();
    });

    it('should include omitted elements when includeOmitted is true', () => {
      const publicElement = new Element<string>({
        name: 'appName',
        description: 'Application name',
        default: 'myApp',
        example: 'exampleApp',
        sensitive: false,
        omitFromSchema: false,
        validator: z.string()
      });
      const privateElement = new Element<string>({
        name: 'internalKey',
        description: 'Internal configuration key',
        default: 'secret',
        example: 'example',
        sensitive: false,
        omitFromSchema: true,
        validator: z.string()
      });

      const section = new Section(
        'app',
        [publicElement, privateElement],
        'Application settings'
      );
      const exported = exportSection(section, true);

      expect(exported.name).toBe('app');
      expect(exported.description).toBe('Application settings');
      expect(exported.elements).toHaveLength(2);
      expect(exported.elements[0].name).toBe('appName');
      expect(exported.elements[1].name).toBe('internalKey');
    });
  });

  describe('exportSchema', () => {
    it('should export a complete schema', () => {
      const appElements = [
        new Element<number>({
          name: 'port',
          description: 'Application port',
          default: 3000
        }),
        new Element<string>({
          name: 'host',
          description: 'Application host',
          default: 'localhost'
        })
      ];

      const dbElements = [
        new Element<string>({
          name: 'connectionString',
          description: 'Database connection'
        })
      ];

      const sections = [
        new Section('app', appElements, 'Application settings'),
        new Section('database', dbElements, 'Database settings')
      ];

      const schema = exportSchema('myApp', sections);

      expect(schema.name).toBe('myApp');
      expect(schema.sections).toHaveLength(2);
      expect(schema.sections[0].name).toBe('app');
      expect(schema.sections[1].name).toBe('database');
    });

    it('should include omitted elements when includeOmitted is true', () => {
      const publicElement = new Element<string>({
        name: 'appName',
        description: 'Application name',
        default: 'myApp',
        example: 'exampleApp',
        sensitive: false,
        omitFromSchema: false,
        validator: z.string()
      });
      const privateElement = new Element<string>({
        name: 'internalKey',
        description: 'Internal configuration key',
        default: 'secret',
        example: 'example',
        sensitive: false,
        omitFromSchema: true,
        validator: z.string()
      });

      const sections = [
        new Section(
          'app',
          [publicElement, privateElement],
          'Application settings'
        )
      ];

      const schema = exportSchema('myApp', sections, true);

      expect(schema.name).toBe('myApp');
      expect(schema.sections).toHaveLength(1);
      expect(schema.sections[0].elements).toHaveLength(2);
      expect(schema.sections[0].elements[0].name).toBe('appName');
      expect(schema.sections[0].elements[1].name).toBe('internalKey');
    });
  });
});
