/* eslint-disable @typescript-eslint/no-explicit-any */

export const MASKED_TOKEN = '[MASKED]';

export const LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'silent'
] as const;

/**
 * A type representing the log levels
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Type to ensure all log levels have corresponding methods
 */
export type LogMethods = {
  [K in LogLevel]: (message: string, ...meta: any[]) => void;
};

/**
 * A logger interface that ensures all log levels are implemented except for trace
 */
export interface Logger
  extends Partial<Pick<LogMethods, 'trace' | 'silent'>>,
    Omit<LogMethods, 'trace' | 'silent'> {
  logLevels: LogLevel[];
}

/**
 * Get all log levels that will actually log at the specified log level
 * @param logLevel - The current log level setting
 * @returns Array of log levels that will be logged
 */
function getActiveLogLevels(logLevel: LogLevel): LogLevel[] {
  const currentIndex = LOG_LEVELS.indexOf(logLevel);

  // If silent, nothing logs
  if (logLevel === 'silent') {
    return [];
  }

  // Return all levels from current level onwards (higher severity)
  return LOG_LEVELS.slice(currentIndex).filter((level) => level !== 'silent');
}

/**
 * Check if a log level should be logged
 * @param logLevels - The log levels to check
 * @param logLevelToCheck - The log level to check
 * @returns True if the log level should be logged, false otherwise
 */
export function shouldLog(
  logLevels: LogLevel[],
  logLevelToCheck: LogLevel
): boolean {
  return logLevels.some(
    (level) => LOG_LEVELS.indexOf(logLevelToCheck) >= LOG_LEVELS.indexOf(level)
  );
}

/**
 * A logger that logs to the console
 */
export class ConsoleLogger implements Logger {
  logLevels: LogLevel[];

  constructor(logLevel: LogLevel = 'info') {
    this.logLevels = getActiveLogLevels(logLevel);
  }

  /**
   * Log a trace level message
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  trace(message: string, ...meta: any[]): void {
    if (shouldLog(this.logLevels, 'trace')) {
      console.trace(message, ...meta);
    }
  }

  /**
   * Log a debug level message
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  debug(message: string, ...meta: any[]): void {
    if (shouldLog(this.logLevels, 'debug')) {
      console.debug(message, ...meta);
    }
  }

  /**
   * Log an info level message
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  info(message: string, ...meta: any[]): void {
    if (shouldLog(this.logLevels, 'info')) {
      console.info(message, ...meta);
    }
  }

  /**
   * Log a warn level message
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  warn(message: string, ...meta: any[]): void {
    if (shouldLog(this.logLevels, 'warn')) {
      console.warn(message, ...meta);
    }
  }

  /**
   * Log an error level message
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  error(message: string, ...meta: any[]): void {
    if (shouldLog(this.logLevels, 'error')) {
      console.error(message, ...meta);
    }
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * A logger that does nothing
 */
export class NullLogger implements Logger {
  logLevels: LogLevel[] = [];

  /**
   * Don't log anything at the trace level
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  trace(_message: string, ..._meta: any[]): void {
    // noop
  }

  /**
   * Don't log anything at the debug level
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  debug(_message: string, ..._meta: any[]): void {
    // noop
  }

  /**
   * Don't log anything at the info level
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  info(_message: string, ..._meta: any[]): void {
    // noop
  }

  /**
   * Don't log anything at the warn level
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  warn(_message: string, ..._meta: any[]): void {
    // noop
  }

  /**
   * Don't log anything at the error level
   * @param message - The message to log
   * @param meta - Additional metadata to log
   */
  error(_message: string, ..._meta: any[]): void {
    // noop
  }
}

/* eslint-enable @typescript-eslint/no-unused-vars */
