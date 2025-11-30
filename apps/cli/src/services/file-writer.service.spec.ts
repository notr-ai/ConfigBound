import { Test, TestingModule } from '@nestjs/testing';
import { FileWriterService } from './file-writer.service.js';
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest
} from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileWriterService', () => {
  let service: FileWriterService;
  let tempDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileWriterService]
    }).compile();

    service = module.get<FileWriterService>(FileWriterService);

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configbound-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('writeToFile', () => {
    it('should write content to file', () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';

      service.writeToFile(filePath, content);

      expect(fs.existsSync(filePath)).toBe(true);
      const writtenContent = fs.readFileSync(filePath, 'utf8');
      expect(writtenContent).toBe(content);
    });

    it('should create directories if they do not exist', () => {
      const filePath = path.join(tempDir, 'nested', 'dir', 'test.txt');
      const content = 'Test content';

      service.writeToFile(filePath, content);

      expect(fs.existsSync(filePath)).toBe(true);
      const writtenContent = fs.readFileSync(filePath, 'utf8');
      expect(writtenContent).toBe(content);
    });

    it('should overwrite existing file', () => {
      const filePath = path.join(tempDir, 'test.txt');

      service.writeToFile(filePath, 'First content');
      service.writeToFile(filePath, 'Second content');

      const writtenContent = fs.readFileSync(filePath, 'utf8');
      expect(writtenContent).toBe('Second content');
    });
  });

  describe('writeToStdout', () => {
    let stdoutWriteSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      stdoutWriteSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    it('should write content to stdout', () => {
      const content = 'Test output';

      service.writeToStdout(content);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(content);
    });

    it('should add newline if content does not end with one', () => {
      const content = 'No newline';

      service.writeToStdout(content);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(content);
      expect(stdoutWriteSpy).toHaveBeenCalledWith('\n');
    });

    it('should not add extra newline if content already ends with one', () => {
      const content = 'With newline\n';

      service.writeToStdout(content);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(content);
      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('write', () => {
    it('should write to file when output path is provided', () => {
      const filePath = path.join(tempDir, 'output.txt');
      const content = 'File output';

      service.write(content, filePath);

      expect(fs.existsSync(filePath)).toBe(true);
      const writtenContent = fs.readFileSync(filePath, 'utf8');
      expect(writtenContent).toBe(content);
    });

    it('should write to stdout when output path is not provided', () => {
      const stdoutWriteSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      const content = 'Stdout output';

      service.write(content);

      expect(stdoutWriteSpy).toHaveBeenCalledWith(content);

      stdoutWriteSpy.mockRestore();
    });
  });
});
