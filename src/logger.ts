/* eslint-disable no-console */

// Some arbitrary log levels.
export const LOG_LEVEL_MAXIMUM = 10; // Max detail steps (like useEffects unmounting)
export const LOG_LEVEL_HIGH = 8; // Fine detail steps (like useEffects)
export const LOG_LEVEL_MEDIUM = 5; // Medium level steps
export const LOG_LEVEL_LOW = 3; // Essential steps
export const LOG_LEVEL_MINIMAL = 1; // Core steps

// Indicates logging level. The higher the number, the more detailed the log.
const LOGGING_LEVEL: number = LOG_LEVEL_LOW;

/**
 * Checks if the web application is running localhost
 * @returns boolean true if running localhost
 */
const runningDev = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Checks if not running localhost and checks that the level is greater or equal to the application logging level.
 * If both conditions are valid, logs using console.log().
 * @param level number the level associated with the message to be logged.
 * @param message string[] the messages to log
 */
const log = (level: number, ...message: unknown[]): void => {
  // If not running localhost, skip
  if (!runningDev()) return;
  if (level <= LOGGING_LEVEL) console.log(`${'-'.repeat(level)}>`, ...message);
};

export const logMaximum = (...message: unknown[]): void => {
  // Redirect
  log(LOG_LEVEL_MAXIMUM, ...message);
};

export const logHigh = (...message: unknown[]): void => {
  // Redirect
  log(LOG_LEVEL_HIGH, ...message);
};

export const logMedium = (...message: unknown[]): void => {
  // Redirect
  log(LOG_LEVEL_MEDIUM, ...message);
};

export const logLow = (...message: unknown[]): void => {
  // Redirect
  log(LOG_LEVEL_LOW, ...message);
};

export const logMinimal = (...message: unknown[]): void => {
  // Redirect
  log(LOG_LEVEL_MINIMAL, ...message);
};

export const logUseEffectMount = (useEffectFunction: string, ...message: unknown[]): void => {
  // Redirect
  logHigh(`${useEffectFunction} - MOUNT`, ...message);
};

export const logUseEffectUnmount = (useEffectFunction: string, ...message: unknown[]): void => {
  // Redirect
  logMaximum(`${useEffectFunction} - UNMOUNT`, ...message);
};
