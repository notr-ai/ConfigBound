import {
  MASKED_TOKEN,
  LOG_LEVELS,
  shouldLog,
  ConsoleLogger,
  NullLogger,
  LogLevel
} from './logger';

// Mock console methods
const mockConsole = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Store original console methods
const originalConsole = {
  trace: console.trace,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

describe('Logger Constants', () => {
  test('MASKED_TOKEN should be defined correctly', () => {
    expect(MASKED_TOKEN).toBe('[MASKED]');
  });

  test('LOG_LEVELS should contain all expected levels in correct order', () => {
    expect(LOG_LEVELS).toEqual([
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'silent'
    ]);
    expect(LOG_LEVELS).toHaveLength(6);
  });
});

describe('shouldLog function', () => {
  test('should return true when logLevels contains the exact level', () => {
    const logLevels: LogLevel[] = ['info', 'warn', 'error'];
    expect(shouldLog(logLevels, 'info')).toBe(true);
    expect(shouldLog(logLevels, 'warn')).toBe(true);
    expect(shouldLog(logLevels, 'error')).toBe(true);
  });

  test('should return false when logLevels does not contain appropriate levels', () => {
    const logLevels: LogLevel[] = ['error'];
    expect(shouldLog(logLevels, 'warn')).toBe(false);
    expect(shouldLog(logLevels, 'info')).toBe(false);
    expect(shouldLog(logLevels, 'debug')).toBe(false);
    expect(shouldLog(logLevels, 'trace')).toBe(false);
  });

  test('should return false when logLevels is empty', () => {
    const logLevels: LogLevel[] = [];
    expect(shouldLog(logLevels, 'error')).toBe(false);
    expect(shouldLog(logLevels, 'info')).toBe(false);
    expect(shouldLog(logLevels, 'trace')).toBe(false);
  });
});

describe('ConsoleLogger', () => {
  beforeEach(() => {
    // Mock all console methods before each test
    console.trace = mockConsole.trace;
    console.debug = mockConsole.debug;
    console.info = mockConsole.info;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore original console methods
    console.trace = originalConsole.trace;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('constructor', () => {
    test('should set default log level to info', () => {
      const logger = new ConsoleLogger();
      expect(logger.logLevels).toEqual(['info', 'warn', 'error']);
    });

    test('should set custom log level', () => {
      const logger = new ConsoleLogger('warn');
      expect(logger.logLevels).toEqual(['warn', 'error']);
    });

    test('should handle trace log level', () => {
      const logger = new ConsoleLogger('trace');
      expect(logger.logLevels).toEqual([
        'trace',
        'debug',
        'info',
        'warn',
        'error'
      ]);
    });

    test('should handle silent log level', () => {
      const logger = new ConsoleLogger('silent');
      expect(logger.logLevels).toEqual([]);
    });

    test('should handle error log level', () => {
      const logger = new ConsoleLogger('error');
      expect(logger.logLevels).toEqual(['error']);
    });
  });

  describe('logging methods', () => {
    test('should log trace when trace level is active', () => {
      const logger = new ConsoleLogger('trace');
      logger.trace('test message', { extra: 'data' });

      expect(mockConsole.trace).toHaveBeenCalledWith('test message', {
        extra: 'data'
      });
      expect(mockConsole.trace).toHaveBeenCalledTimes(1);
    });

    test('should not log trace when trace level is inactive', () => {
      const logger = new ConsoleLogger('info');
      logger.trace('test message');

      expect(mockConsole.trace).not.toHaveBeenCalled();
    });

    test('should log debug when debug level is active', () => {
      const logger = new ConsoleLogger('debug');
      logger.debug('debug message', 'extra', 'args');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        'debug message',
        'extra',
        'args'
      );
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
    });

    test('should not log debug when debug level is inactive', () => {
      const logger = new ConsoleLogger('info');
      logger.debug('debug message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    test('should log info when info level is active', () => {
      const logger = new ConsoleLogger('info');
      logger.info('info message');

      expect(mockConsole.info).toHaveBeenCalledWith('info message');
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
    });

    test('should not log info when info level is inactive', () => {
      const logger = new ConsoleLogger('warn');
      logger.info('info message');

      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    test('should log warn when warn level is active', () => {
      const logger = new ConsoleLogger('warn');
      logger.warn('warning message', { context: 'test' });

      expect(mockConsole.warn).toHaveBeenCalledWith('warning message', {
        context: 'test'
      });
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    });

    test('should not log warn when warn level is inactive', () => {
      const logger = new ConsoleLogger('error');
      logger.warn('warning message');

      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    test('should log error when error level is active', () => {
      const logger = new ConsoleLogger('error');
      logger.error('error message', new Error('test error'));

      expect(mockConsole.error).toHaveBeenCalledWith(
        'error message',
        new Error('test error')
      );
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    test('should always log error regardless of level (except silent)', () => {
      const logger = new ConsoleLogger('trace');
      logger.error('error message');

      expect(mockConsole.error).toHaveBeenCalledWith('error message');
    });

    test('should not log anything when silent level is set', () => {
      const logger = new ConsoleLogger('silent');

      logger.trace('trace');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.trace).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('logging with multiple arguments', () => {
    test('should pass through multiple arguments correctly', () => {
      const logger = new ConsoleLogger('info');
      const obj = { key: 'value' };
      const arr = [1, 2, 3];

      logger.info('message', obj, arr, 'string', 42);

      expect(mockConsole.info).toHaveBeenCalledWith(
        'message',
        obj,
        arr,
        'string',
        42
      );
    });

    test('should handle no additional arguments', () => {
      const logger = new ConsoleLogger('info');
      logger.info('just message');

      expect(mockConsole.info).toHaveBeenCalledWith('just message');
    });
  });
});

describe('NullLogger', () => {
  test('should have empty logLevels array', () => {
    const logger = new NullLogger();
    expect(logger.logLevels).toEqual([]);
  });

  test('should not call any console methods', () => {
    const logger = new NullLogger();

    // Mock console to ensure nothing is called
    const consoleSpy = {
      trace: jest.spyOn(console, 'trace').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    };

    logger.trace('trace message', { data: 'test' });
    logger.debug('debug message', 'extra');
    logger.info('info message');
    logger.warn('warn message', [1, 2, 3]);
    logger.error('error message', new Error('test'));

    expect(consoleSpy.trace).not.toHaveBeenCalled();
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    expect(consoleSpy.error).not.toHaveBeenCalled();

    // Restore spies
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
  });

  test('should accept any number of arguments without errors', () => {
    const logger = new NullLogger();

    expect(() => {
      logger.info('message');
      logger.warn('message', 'arg1', 'arg2', { obj: true }, [1, 2, 3]);
      logger.error('message', new Error('test'), 'additional', 42);
    }).not.toThrow();
  });
});

describe('Logger Interface Compliance', () => {
  test('ConsoleLogger should implement Logger interface', () => {
    const logger = new ConsoleLogger();

    expect(logger).toHaveProperty('logLevels');
    expect(logger).toHaveProperty('trace');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');

    expect(typeof logger.trace).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  test('NullLogger should implement Logger interface', () => {
    const logger = new NullLogger();

    expect(logger).toHaveProperty('logLevels');
    expect(logger).toHaveProperty('trace');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');

    expect(typeof logger.trace).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
