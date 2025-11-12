import Joi from 'joi';
import { ConfigBound, configItem, configSection } from './configBound';
import { Section } from './section/section';
import { SectionExistsException } from './utilities/errors';
import { ConsoleLogger, NullLogger } from './utilities/logger';
import { EnvVarBind } from './bind/binds/envVar';

// Mock the Section class
jest.mock('./section/section', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Section: jest.fn().mockImplementation((name, elements = []) => {
      return {
        name: name,
        configItems: [],
        elements: elements,
        getElements: jest.fn().mockReturnValue(elements),
        setLogger: jest.fn(),
        setConfigValueProvider: jest.fn()
      };
    })
  };
});

/**
 * @group unit
 */
describe('ConfigBound', () => {
  let configBound: ConfigBound;
  let mockSection1: Section;

  beforeEach(() => {
    // Reset the mocks
    jest.clearAllMocks();

    // Clear environment variables before each test
    delete process.env.APP_PORT;
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.APP_APIKEY;

    mockSection1 = new Section('TestSection1', []);
    configBound = new ConfigBound(
      'TestConfig',
      [],
      [],
      process.env.TEST_USE_CONSOLE_LOGGER === 'true'
        ? new ConsoleLogger()
        : new NullLogger()
    );
  });

  describe('addSection', () => {
    it('should add a Section to the sections array', () => {
      const configBoundAny = configBound as any;

      // Arrange
      expect(configBoundAny.sections).toHaveLength(0);

      // Act
      configBound.addSection(mockSection1);

      // Assert
      expect(configBoundAny.sections).toHaveLength(1);
      expect(configBoundAny.sections[0]).toBe(mockSection1);
    });

    it('should add multiple Sections to the sections array', () => {
      // Arrange
      const configBoundAny = configBound as any;
      const mockSection2 = new Section('TestSection2', []);

      // Act
      configBound.addSection(mockSection1);
      configBound.addSection(mockSection2);

      // Assert
      expect(configBoundAny['sections']).toHaveLength(2);
      expect(configBoundAny.sections[0]).toBe(mockSection1);
      expect(configBoundAny.sections[1]).toBe(mockSection2);
    });

    it('should throw SectionExistsException when adding a section with the same name', () => {
      // Arrange
      const section1 = new Section('TestSection', []);
      const section2 = new Section('TestSection', []);
      configBound.addSection(section1);

      // Act & Assert
      expect(() => {
        configBound.addSection(section2);
      }).toThrow(SectionExistsException);
    });

    it('should allow adding a section with a different name', () => {
      // Arrange
      const section1 = new Section('Section1', []);
      const section2 = new Section('Section2', []);
      configBound.addSection(section1);

      // Act
      configBound.addSection(section2);

      // Assert
      expect(configBound.getSections()).toHaveLength(2);
      expect(configBound.getSections()[1]).toBe(section2);
    });
  });

  describe('createConfig', () => {
    it('should create a ConfigBound instance from a simple schema', () => {
      const config = ConfigBound.createConfig({
        port: configItem({
          default: 3000,
          validator: Joi.number(),
          description: 'Server port'
        }),
        host: configItem({
          default: 'localhost',
          validator: Joi.string(),
          description: 'Server host'
        })
      });

      expect(config).toBeDefined();
      expect(config.get('app', 'port')).toBe(3000);
      expect(config.get('app', 'host')).toBe('localhost');
    });

    it('should create sections for nested objects', () => {
      const config = ConfigBound.createConfig({
        database: configSection({
          host: configItem({
            default: 'localhost',
            validator: Joi.string()
          }),
          port: configItem({
            default: 5432,
            validator: Joi.number()
          })
        })
      });

      expect(config.get('database', 'host')).toBe('localhost');
      expect(config.get('database', 'port')).toBe(5432);
    });

    it('should support environment variables through EnvVarBind', () => {
      process.env.APP_PORT = '8080';
      process.env.DATABASE_HOST = 'db.example.com';

      const config = ConfigBound.createConfig({
        port: configItem({
          default: 3000,
          validator: Joi.number()
        }),
        database: configSection({
          host: configItem({
            default: 'localhost',
            validator: Joi.string()
          })
        })
      });

      config.addBind(new EnvVarBind());

      expect(config.get('app', 'port')).toBe(8080);
      expect(config.get('database', 'host')).toBe('db.example.com');
    });

    it('should validate values using Joi', () => {
      const config = ConfigBound.createConfig({
        port: {
          default: 3000,
          validator: Joi.number().min(1).max(65535)
        }
      });

      expect(config.get('app', 'port')).toBe(3000);
    });

    it('should throw error for invalid values', () => {
      process.env.APP_PORT = 'not-a-number';

      const config = ConfigBound.createConfig({
        port: {
          default: 3000,
          validator: Joi.number()
        }
      });

      config.addBind(new EnvVarBind());

      expect(() => config.get('app', 'port')).toThrow();
    });

    it('should support sensitive fields', () => {
      const config = ConfigBound.createConfig({
        password: {
          default: 'secret123',
          validator: Joi.string(),
          sensitive: true
        }
      });

      expect(config.get('app', 'password')).toBe('secret123');
    });

    it('should support custom config name', () => {
      const config = ConfigBound.createConfig(
        {
          port: {
            default: 3000,
            validator: Joi.number()
          }
        },
        {
          name: 'myapp'
        }
      );

      expect(config.name).toBe('myapp');
    });

    it('should support custom binds', () => {
      const config = ConfigBound.createConfig(
        {
          port: {
            default: 3000,
            validator: Joi.number()
          }
        },
        {
          binds: [new EnvVarBind()]
        }
      );

      expect(config.binds).toHaveLength(1);
      expect(config.binds[0]).toBeInstanceOf(EnvVarBind);
    });

    it('should use getOrThrow for required values', () => {
      process.env.APP_PORT = '8080';

      const config = ConfigBound.createConfig({
        port: {
          validator: Joi.number()
        }
      });

      config.addBind(new EnvVarBind());

      expect(config.getOrThrow('app', 'port')).toBe(8080);
    });

    it('should get sections', () => {
      const config = ConfigBound.createConfig({
        port: configItem({
          default: 3000,
          validator: Joi.number()
        }),
        database: configSection({
          host: configItem({
            default: 'localhost',
            validator: Joi.string()
          })
        })
      });

      const sections = config.getSections();
      expect(sections).toHaveLength(2);
      expect(sections.map((s) => s.name).sort()).toEqual(['app', 'database']);
    });
  });

  describe('validate', () => {
    it('should validate all config values without throwing when valid', () => {
      const config = ConfigBound.createConfig({
        port: configItem({
          default: 3000,
          validator: Joi.number()
        }),
        host: configItem({
          default: 'localhost',
          validator: Joi.string()
        })
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should throw ConfigInvalidException when validation fails', () => {
      process.env.APP_PORT = 'invalid-number';

      const config = ConfigBound.createConfig({
        port: configItem({
          default: 3000,
          validator: Joi.number()
        })
      });

      config.addBind(new EnvVarBind());

      expect(() => config.validate()).toThrow();
    });

    it('should validate on init when validateOnInit is true', () => {
      process.env.APP_PORT = 'invalid-number';

      expect(() => {
        ConfigBound.createConfig(
          {
            port: configItem({
              validator: Joi.number()
            })
          },
          {
            binds: [new EnvVarBind()],
            validateOnInit: true
          }
        );
      }).toThrow();
    });

    it('should not validate on init when validateOnInit is false or undefined', () => {
      process.env.APP_PORT = 'invalid-number';

      expect(() => {
        ConfigBound.createConfig(
          {
            port: configItem({
              validator: Joi.number()
            })
          },
          {
            binds: [new EnvVarBind()],
            validateOnInit: false
          }
        );
      }).not.toThrow();
    });

    it('should detect required values that are not set', () => {
      const config = ConfigBound.createConfig({
        apiKey: configItem({
          validator: Joi.string().required(),
          description: 'API key'
        })
      });

      expect(() => config.validate()).toThrow();
    });
  });

  describe('getValidationErrors', () => {
    it('should return empty array when all values are valid', () => {
      const config = ConfigBound.createConfig({
        port: configItem({
          default: 3000,
          validator: Joi.number()
        })
      });

      const errors = config.getValidationErrors();
      expect(errors).toEqual([]);
    });

    it('should return array of errors when validation fails', () => {
      process.env.APP_PORT = 'not-a-number';

      const config = ConfigBound.createConfig({
        port: configItem({
          validator: Joi.number()
        })
      });

      config.addBind(new EnvVarBind());

      const errors = config.getValidationErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('path');
      expect(errors[0]).toHaveProperty('message');
      expect(errors[0].path).toBe('app.port');
    });

    it('should detect multiple errors across sections', () => {
      process.env.APP_PORT = 'invalid';
      process.env.DATABASE_PORT = 'also-invalid';

      const config = ConfigBound.createConfig({
        port: configItem({
          validator: Joi.number()
        }),
        database: configSection({
          port: configItem({
            validator: Joi.number()
          })
        })
      });

      config.addBind(new EnvVarBind());

      const errors = config.getValidationErrors();
      expect(errors).toHaveLength(2);
      expect(errors.map((e) => e.path).sort()).toEqual([
        'app.port',
        'database.port'
      ]);
    });

    it('should report required values that are missing', () => {
      const config = ConfigBound.createConfig({
        apiKey: configItem({
          validator: Joi.string().required(),
          description: 'Required API key'
        })
      });

      const errors = config.getValidationErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].path).toBe('app.apiKey');
      expect(errors[0].message).toContain('Required');
    });
  });
});
