/* eslint-disable no-console */

// Indicates logging level. The higher the number, the more detailed the log.
const LOGGING_LEVEL: number = 3;

// Some arbitrary log levels.
export const LOG_LEVEL_MAXIMUM = 10;
export const LOG_LEVEL_HIGH = 8;
export const LOG_LEVEL_MEDIUM = 5;
export const LOG_LEVEL_LOW = 3;
export const LOG_LEVEL_MINIMAL = 1;

/**
 * Checks if the web application is running localhost
 * @returns boolean true if running localhost
 */
const runningLocalhost = (): boolean => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

/**
 * Checks if not running localhost and checks that the level is greater or equal to the application logging level.
 * If both conditions are valid, logs using console.log().
 * @param level number the level associated with the message to be logged.
 * @param message string[] the messages to log
 */
export const log = (level: number, ...message: unknown[]): void => {
  // If not running localhost, skip
  if (!runningLocalhost) return;
  if (level <= LOGGING_LEVEL) console.log(`${'-'.repeat(level)}>`, ...message);
};
