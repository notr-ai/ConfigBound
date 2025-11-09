import {
  ConfigBound,
  configItem,
  configSection,
  configEnum
} from './configBound';
import Joi from 'joi';

describe('ConfigBound Export Methods', () => {
  let config: ReturnType<typeof ConfigBound.createConfig>;

  beforeEach(() => {
    config = ConfigBound.createConfig({
      port: configItem<number>({
        default: 3000,
        validator: Joi.number().port(),
        description: 'Application server port',
        example: 8080
      }),
      environment: configEnum<'development' | 'production'>({
        values: ['development', 'production'],
        default: 'development',
        description: 'Runtime environment'
      }),
      database: configSection(
        {
          host: configItem<string>({
            default: 'localhost',
            validator: Joi.string().hostname(),
            description: 'Database host'
          }),
          port: configItem<number>({
            default: 5432,
            validator: Joi.number().port(),
            description: 'Database port'
          }),
          password: configItem<string>({
            validator: Joi.string().required(),
            description: 'Database password',
            sensitive: true,
            example: 'secret123'
          })
        },
        'Database configuration'
      )
    });
  });

  describe('exportSchema', () => {
    it('should export the complete schema structure', () => {
      const schema = config.exportSchema();

      expect(schema).toBeDefined();
      expect(schema.name).toBe('app');
      expect(schema.sections).toHaveLength(2);
    });

    it('should include app section with top-level items', () => {
      const schema = config.exportSchema();
      const appSection = schema.sections.find((s) => s.name === 'app');

      expect(appSection).toBeDefined();
      expect(appSection?.elements).toHaveLength(2);
      expect(appSection?.elements.find((e) => e.name === 'port')).toBeDefined();
      expect(
        appSection?.elements.find((e) => e.name === 'environment')
      ).toBeDefined();
    });

    it('should include omitted elements when includeOmitted is true', () => {
      // Create a config with omitted elements
      const customConfig = ConfigBound.createConfig({
        port: configItem<number>({
          description: 'Server port',
          default: 3000,
          example: 8080,
          validator: Joi.number().port().required()
        }),
        internalKey: configItem<string>({
          description: 'Internal configuration key',
          default: 'secret',
          example: 'example',
          omitFromSchema: true,
          validator: Joi.string()
        })
      });

      const schemaWithoutOmitted = customConfig.exportSchema();
      const schemaWithOmitted = customConfig.exportSchema(true);

      const appSectionWithout = schemaWithoutOmitted.sections.find(
        (s: any) => s.name === 'app'
      );
      const appSectionWith = schemaWithOmitted.sections.find(
        (s: any) => s.name === 'app'
      );

      expect(appSectionWithout?.elements).toHaveLength(1);
      expect(
        appSectionWithout?.elements.find((e: any) => e.name === 'port')
      ).toBeDefined();
      expect(
        appSectionWithout?.elements.find((e: any) => e.name === 'internalKey')
      ).toBeUndefined();

      expect(appSectionWith?.elements).toHaveLength(2);
      expect(
        appSectionWith?.elements.find((e: any) => e.name === 'port')
      ).toBeDefined();
      expect(
        appSectionWith?.elements.find((e: any) => e.name === 'internalKey')
      ).toBeDefined();
    });

    it('should include database section', () => {
      const schema = config.exportSchema();
      const dbSection = schema.sections.find((s) => s.name === 'database');

      expect(dbSection).toBeDefined();
      expect(dbSection?.description).toBe('Database configuration');
      expect(dbSection?.elements).toHaveLength(3);
    });

    it('should preserve element metadata', () => {
      const schema = config.exportSchema();
      const appSection = schema.sections.find((s) => s.name === 'app');
      const portElement = appSection?.elements.find((e) => e.name === 'port');

      expect(portElement?.description).toBe('Application server port');
      expect(portElement?.type).toBe('number');
      expect(portElement?.default).toBe(3000);
      expect(portElement?.example).toBe(8080);
      expect(portElement?.required).toBe(false);
      expect(portElement?.sensitive).toBe(false);
    });

    it('should mark sensitive fields correctly', () => {
      const schema = config.exportSchema();
      const dbSection = schema.sections.find((s) => s.name === 'database');
      const passwordElement = dbSection?.elements.find(
        (e) => e.name === 'password'
      );

      expect(passwordElement?.sensitive).toBe(true);
      expect(passwordElement?.required).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should export as valid JSON', () => {
      const json = config.toJSON();

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all configuration data', () => {
      const json = config.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('app');
      expect(parsed.sections).toHaveLength(2);
    });

    it('should format pretty by default', () => {
      const json = config.toJSON();

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should include omitted elements when includeOmitted is true', () => {
      const customConfig = ConfigBound.createConfig({
        port: configItem<number>({
          description: 'Server port',
          default: 3000,
          validator: Joi.number().port().required()
        }),
        internalKey: configItem<string>({
          description: 'Internal configuration key',
          default: 'secret',
          omitFromSchema: true,
          validator: Joi.string()
        })
      });

      const jsonWithoutOmitted = customConfig.toJSON();
      const jsonWithOmitted = customConfig.toJSON(true, true);

      const parsedWithout = JSON.parse(jsonWithoutOmitted);
      const parsedWith = JSON.parse(jsonWithOmitted);

      const appSectionWithout = parsedWithout.sections.find(
        (s: any) => s.name === 'app'
      );
      const appSectionWith = parsedWith.sections.find(
        (s: any) => s.name === 'app'
      );

      expect(appSectionWithout.elements).toHaveLength(1);
      expect(appSectionWith.elements).toHaveLength(2);
      expect(
        appSectionWith.elements.find((e: any) => e.name === 'internalKey')
      ).toBeDefined();
    });

    it('should support compact formatting', () => {
      const json = config.toJSON(false);

      expect(json).not.toContain('\n  ');
    });
  });

  describe('Custom config name', () => {
    it('should use custom name in export', () => {
      const customConfig = ConfigBound.createConfig(
        {
          setting: configItem<string>({ default: 'value' })
        },
        { name: 'myCustomApp' }
      );

      const schema = customConfig.exportSchema();
      expect(schema.name).toBe('myCustomApp');

      const json = customConfig.toJSON();
      expect(json).toContain('myCustomApp');
    });
  });
});
