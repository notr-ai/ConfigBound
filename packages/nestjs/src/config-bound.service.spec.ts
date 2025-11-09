import { Test, TestingModule } from '@nestjs/testing';
import { ConfigBoundService } from './config-bound.service';
import { ConfigBoundModule } from './config-bound.module';
import { configItem, configSection } from '@config-bound/config-bound';
import { EnvVarBind } from '@config-bound/config-bound/bind/binds/envVar';
import Joi from 'joi';

type TestSchema = {
  port: ReturnType<typeof configItem<number>>;
  database: ReturnType<typeof configSection<{ host: string; port: number }>>;
};

describe('ConfigBoundService', () => {
  let service: ConfigBoundService<TestSchema>;
  let module: TestingModule;

  const testSchema: TestSchema = {
    port: configItem<number>({
      default: 3000,
      validator: Joi.number().port(),
      description: 'Application port'
    }),
    database: configSection(
      {
        host: configItem<string>({
          default: 'localhost',
          validator: Joi.string(),
          description: 'Database host'
        }),
        port: configItem<number>({
          default: 5432,
          validator: Joi.number().port(),
          description: 'Database port'
        })
      },
      'Database configuration'
    )
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigBoundModule.forRoot({
          schema: testSchema,
          binds: [new EnvVarBind()],
          validateOnInit: false
        })
      ]
    }).compile();

    service = module.get<ConfigBoundService<TestSchema>>(ConfigBoundService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have a name', () => {
    expect(service.name).toBe('app');
  });

  it('should get default values', () => {
    const port = service.get('app', 'port');
    expect(port).toBe(3000);
  });

  it('should get database configuration', () => {
    const host = service.get('database', 'host');
    const port = service.get('database', 'port');

    expect(host).toBe('localhost');
    expect(port).toBe(5432);
  });

  it('should throw when getting non-existent value with getOrThrow', () => {
    expect(() => {
      service.getOrThrow('app', 'nonExistent' as never);
    }).toThrow();
  });

  it('should have sections', () => {
    const sections = service.getSections();
    expect(sections.length).toBeGreaterThan(0);
    const sectionNames = sections.map((s) => s.name);
    expect(sectionNames).toContain('app');
    expect(sectionNames).toContain('database');
  });

  it('should validate configuration', () => {
    expect(() => service.validate()).not.toThrow();
  });
});

describe('ConfigBoundModule - forRootAsync', () => {
  type AsyncTestSchema = {
    apiKey: ReturnType<typeof configItem<string>>;
  };

  let service: ConfigBoundService<AsyncTestSchema>;
  let module: TestingModule;

  const testSchema: AsyncTestSchema = {
    apiKey: configItem<string>({
      default: 'test-key',
      validator: Joi.string(),
      description: 'API Key'
    })
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigBoundModule.forRootAsync({
          useFactory: () => ({
            schema: testSchema,
            binds: [new EnvVarBind()],
            validateOnInit: false
          })
        })
      ]
    }).compile();

    service =
      module.get<ConfigBoundService<AsyncTestSchema>>(ConfigBoundService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined with async configuration', () => {
    expect(service).toBeDefined();
  });

  it('should get values from async config', () => {
    const apiKey = service.get('app', 'apiKey');
    expect(apiKey).toBe('test-key');
  });
});
