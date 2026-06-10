import { ConsoleLogger, NullLogger, type Logger } from '../src/utilities/logger';

/**
 * Returns a NullLogger by default, or ConsoleLogger when the
 * TEST_USE_CONSOLE_LOGGER env var is set to 'true'.
 *
 * Set the env var when debugging a failing test to see log output:
 *   TEST_USE_CONSOLE_LOGGER=true pnpm test
 */
export function testLogger(): Logger {
  return process.env.TEST_USE_CONSOLE_LOGGER === 'true'
    ? new ConsoleLogger()
    : new NullLogger();
}
