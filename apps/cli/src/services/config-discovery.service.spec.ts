import { Test, TestingModule } from '@nestjs/testing';
import { ConfigDiscoveryService } from './config-discovery.service.js';
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigDiscoveryService', () => {
  let service: ConfigDiscoveryService;
  let tempDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigDiscoveryService]
    }).compile();

    service = module.get<ConfigDiscoveryService>(ConfigDiscoveryService);

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configbound-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTempFile(relativePath: string, content: string): string {
    const filePath = path.join(tempDir, relativePath);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should discover named export with ConfigBound.createConfig', async () => {
    createTempFile(
      'config.ts',
      `
      import { ConfigBound } from '@config-bound/config-bound';
      
      export const appConfig = ConfigBound.createConfig({
        name: 'MyApp',
        sections: {}
      });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(1);
    expect(configs[0].exportName).toBe('appConfig');
    expect(configs[0].configName).toBe('MyApp');
    expect(configs[0].isDefault).toBe(false);
  });

  it('should discover named export with createConfig from named import', async () => {
    createTempFile(
      'config.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      
      export const dbConfig = createConfig({
        name: 'Database',
        sections: {}
      });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(1);
    expect(configs[0].exportName).toBe('dbConfig');
    expect(configs[0].configName).toBe('Database');
  });

  it('should discover default export', async () => {
    createTempFile(
      'config.ts',
      `
      import { ConfigBound } from '@config-bound/config-bound';
      
      export default ConfigBound.createConfig({
        name: 'DefaultConfig',
        sections: {}
      });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(1);
    expect(configs[0].exportName).toBe('default');
    expect(configs[0].isDefault).toBe(true);
    expect(configs[0].configName).toBe('DefaultConfig');
  });

  it('should discover multiple exports in same file', async () => {
    createTempFile(
      'configs.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      
      export const config1 = createConfig({ name: 'Config1', sections: {} });
      export const config2 = createConfig({ name: 'Config2', sections: {} });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(2);
    expect(
      configs.map((c: (typeof configs)[0]) => c.exportName).sort()
    ).toEqual(['config1', 'config2']);
  });

  it('should discover configs recursively', async () => {
    createTempFile(
      'config1.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      export const config1 = createConfig({ name: 'Config1', sections: {} });
    `
    );

    createTempFile(
      'subdir/config2.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      export const config2 = createConfig({ name: 'Config2', sections: {} });
    `
    );

    const configs = await service.discoverConfigs(tempDir, true);

    expect(configs).toHaveLength(2);
  });

  it('should not discover configs when recursive is false', async () => {
    createTempFile(
      'config1.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      export const config1 = createConfig({ name: 'Config1', sections: {} });
    `
    );

    createTempFile(
      'subdir/config2.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      export const config2 = createConfig({ name: 'Config2', sections: {} });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(1);
  });

  it('should skip non-exported configs', async () => {
    createTempFile(
      'config.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      const privateConfig = createConfig({ name: 'Private', sections: {} });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(0);
  });

  it('should skip test files', async () => {
    createTempFile(
      'config.spec.ts',
      `
      import { createConfig } from '@config-bound/config-bound';
      export const testConfig = createConfig({ name: 'Test', sections: {} });
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(0);
  });

  it('should handle files without configs', async () => {
    createTempFile(
      'other.ts',
      `
      export const someValue = 42;
    `
    );

    const configs = await service.discoverConfigs(tempDir, false);

    expect(configs).toHaveLength(0);
  });
});
