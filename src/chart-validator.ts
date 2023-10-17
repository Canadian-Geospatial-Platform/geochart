import Ajv from 'ajv';

/**
 * Represents the result of a Chart data or options inputs validations.
 */
export type ValidatorResult = {
  valid: boolean;
  errors?: string[];
};

/**
 * The Char Validator class to validate data and options inputs.
 */
export class ChartValidator {
  // The JSON validator used by ChartValidate
  private ajv: Ajv.Ajv;

  public SCHEMA_DATA = {
    type: 'object',
    properties: {
      labels: { type: 'array' },
      datasets: { type: 'array' },
    },
    required: ['labels', 'datasets'],
    // additionalProperties: false
  };

  public SCHEMA_OPTIONS = {
    type: 'object',
    properties: {
      responsive: { type: 'boolean' },
      plugins: {
        type: 'object',
        properties: {
          legend: {
            type: 'object',
            properties: {
              display: { type: 'boolean' },
            },
          },
        },
      },
      geochart: {
        type: 'object',
        properties: {
          chart: { type: 'string' },
        },
      },
    },
    required: ['geochart'],
    // additionalProperties: false
  };

  /**
   * Constructs a Chart Validate object to validate schemas.
   */
  constructor() {
    // The embedded JSON validator
    this.ajv = new Ajv();
  }

  /**
   * Validates the data input parameters.
   */
  validateData = (data: unknown): ValidatorResult => {
    // Compile
    const validate = this.ajv.compile(this.SCHEMA_DATA);

    // Validate
    const valid = validate(data) as boolean;
    return {
      valid,
      errors: validate.errors?.map((e: Ajv.ErrorObject) => {
        return e.message || 'generic schema error';
      }),
    };
  };

  /**
   * Validates the options input parameters.
   */
  validateOptions = (options: unknown): ValidatorResult => {
    // Compile
    const validate = this.ajv.compile(this.SCHEMA_OPTIONS);

    // Validate
    const valid = validate(options) as boolean;
    return {
      valid,
      errors: validate.errors?.map((e: Ajv.ErrorObject) => {
        return e.message || 'generic schema error';
      }),
    };
  };
}
