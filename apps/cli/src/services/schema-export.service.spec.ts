import { Test, TestingModule } from '@nestjs/testing';
import { SchemaExportService } from './schema-export.service.js';
import { describe, beforeEach, it, expect } from '@jest/globals';
import { ConfigBound } from '@config-bound/config-bound';
import { Section } from '@config-bound/config-bound/section';
import { Element } from '@config-bound/config-bound/element';
import Joi from 'joi';

describe('SchemaExportService', () => {
  let service: SchemaExportService;
  let mockConfigInstance: ConfigBound;
  let mockSections: Section[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaExportService]
    }).compile();

    service = module.get<SchemaExportService>(SchemaExportService);

    const hostElement = new Element<string>(
      'host',
      'Database host',
      'localhost',
      undefined,
      false,
      false,
      Joi.string()
    );

    const portElement = new Element<number>(
      'port',
      'Database port',
      5432,
      undefined,
      false,
      false,
      Joi.number()
    );

    const databaseSection = new Section(
      'database',
      [hostElement, portElement],
      'Database configuration'
    );

    mockSections = [databaseSection];

    mockConfigInstance = new ConfigBound('TestConfig', [], [], undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToString', () => {
    it('should export to JSON format', () => {
      const result = service.exportToString(
        'TestConfig',
        mockSections,
        mockConfigInstance,
        {
          format: 'json',
          pretty: true
        }
      );

      expect(result).toContain('"name": "TestConfig"');
      expect(result).toContain('"database"');
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('TestConfig');
    });

    it('should export to YAML format', () => {
      const result = service.exportToString(
        'TestConfig',
        mockSections,
        mockConfigInstance,
        {
          format: 'yaml'
        }
      );

      expect(result).toContain('name: TestConfig');
      expect(result).toContain('database:');
    });

    it('should export to env format', () => {
      const result = service.exportToString(
        'TestConfig',
        mockSections,
        mockConfigInstance,
        {
          format: 'env'
        }
      );

      expect(result).toContain('DATABASE_HOST=');
      expect(result).toContain('DATABASE_PORT=');
    });

    it('should throw error for unsupported format', () => {
      expect(() =>
        service.exportToString('TestConfig', mockSections, mockConfigInstance, {
          format: 'xml' as any
        })
      ).toThrow('Unsupported format: xml');
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extension for json', () => {
      expect(service.getFileExtension('json')).toBe('.json');
    });

    it('should return correct extension for yaml', () => {
      expect(service.getFileExtension('yaml')).toBe('.yaml');
    });

    it('should return correct extension for env', () => {
      expect(service.getFileExtension('env')).toBe('.env.example');
    });
  });
});
