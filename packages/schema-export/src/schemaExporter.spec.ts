import { Section } from '@config-bound/config-bound/section';
import { Element } from '@config-bound/config-bound/element';
import Joi from 'joi';
import { exportElement, exportSection, exportSchema } from './schemaExporter';

describe('Schema Exporter', () => {
  describe('exportElement', () => {
    it('should export a basic element', () => {
      const element = new Element<string>(
        'testElement',
        'A test element',
        'default-value',
        'example-value',
        false,
        false,
        Joi.string()
      );

      const exported = exportElement(element);

      expect(exported.name).toBe('testElement');
      expect(exported.description).toBe('A test element');
      expect(exported.type).toBe('string');
      expect(exported.default).toBe('default-value');
      expect(exported.example).toBe('example-value');
      expect(exported.required).toBe(false);
      expect(exported.sensitive).toBe(false);
    });

    it('should handle required elements', () => {
      const element = new Element<number>(
        'requiredElement',
        'A required element',
        undefined,
        42,
        false,
        false,
        Joi.number().required()
      );

      const exported = exportElement(element);

      expect(exported.required).toBe(true);
    });

    it('should handle sensitive elements', () => {
      const element = new Element<string>(
        'secretKey',
        'API secret key',
        undefined,
        'sk_test_123',
        true,
        false,
        Joi.string()
      );

      const exported = exportElement(element);

      expect(exported.sensitive).toBe(true);
    });

    it('should handle elements with omitFromSchema', () => {
      const element = new Element<string>(
        'privateKey',
        'Private configuration key',
        'default',
        'example',
        false,
        true,
        Joi.string()
      );

      expect(element.omitFromSchema).toBe(true);
    });

    it('should extract joi validation object', () => {
      const element = new Element<number>(
        'port',
        'Server port',
        3000,
        undefined,
        false,
        false,
        Joi.number().min(1).max(65535).required()
      );

      const exported = exportElement(element);

      expect(exported.joiValidation).toBeDefined();
      expect((exported.joiValidation as any).type).toBe('number');
      expect((exported.joiValidation as any).rules).toBeDefined();
    });

    it('should handle enum types', () => {
      const element = new Element<string>(
        'environment',
        'Runtime environment',
        'development',
        undefined,
        false,
        false,
        Joi.string().valid('development', 'staging', 'production')
      );

      const exported = exportElement(element);

      expect(exported.type).toContain('development');
      expect(exported.type).toContain('staging');
      expect(exported.type).toContain('production');
    });
  });

  describe('exportSection', () => {
    it('should export a section with elements', () => {
      const elements = [
        new Element<string>('host', 'Database host', 'localhost'),
        new Element<number>('port', 'Database port', 5432)
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
      const publicElement = new Element<string>(
        'appName',
        'Application name',
        'myApp',
        'exampleApp',
        false,
        false,
        Joi.string()
      );
      const privateElement = new Element<string>(
        'internalKey',
        'Internal configuration key',
        'secret',
        'example',
        false,
        true,
        Joi.string()
      );

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
        exported.elements.find((e) => e.name === 'internalKey')
      ).toBeUndefined();
    });

    it('should include omitted elements when includeOmitted is true', () => {
      const publicElement = new Element<string>(
        'appName',
        'Application name',
        'myApp',
        'exampleApp',
        false,
        false,
        Joi.string()
      );
      const privateElement = new Element<string>(
        'internalKey',
        'Internal configuration key',
        'secret',
        'example',
        false,
        true,
        Joi.string()
      );

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
        new Element<number>('port', 'Application port', 3000),
        new Element<string>('host', 'Application host', 'localhost')
      ];

      const dbElements = [
        new Element<string>(
          'connectionString',
          'Database connection',
          undefined
        )
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
      const publicElement = new Element<string>(
        'appName',
        'Application name',
        'myApp',
        'exampleApp',
        false,
        false,
        Joi.string()
      );
      const privateElement = new Element<string>(
        'internalKey',
        'Internal configuration key',
        'secret',
        'example',
        false,
        true,
        Joi.string()
      );

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
