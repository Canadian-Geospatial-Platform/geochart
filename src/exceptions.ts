/**
 * Error thrown to indicate that an operation was explicitly cancelled.
 * This is useful in scenarios where cancellation is part of expected control flow.
 * @extends {Error}
 */
export class CancelledError extends Error {
  /**
   * Creates an instance of CancelledError.
   *
   * @param {string} message - A custom error message explaining the cancellation.
   */
  constructor(message: string = 'This has been cancelled.') {
    // Call the base Error constructor with the provided message
    super(message);

    // Set a custom name for the error type to differentiate it from other error types
    this.name = 'CancelledError';

    // Capture the stack trace (V8-specific, e.g., Chrome and Node.js)
    // Omits the constructor call from the trace for cleaner debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CancelledError);
    }

    // Ensure the prototype chain is correct (required in some transpilation targets)
    Object.setPrototypeOf(this, CancelledError.prototype);
  }
}
