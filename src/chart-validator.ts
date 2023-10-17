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
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      labels: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      datasets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
            },
            data: {
              oneOf: [
                {
                  type: 'array',
                  items: {
                    type: 'number',
                  },
                },
                {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      x: {
                        type: 'number',
                      },
                      y: {
                        type: 'number',
                      },
                    },
                    required: ['x', 'y'],
                  },
                },
                {
                  type: 'object',
                },
              ],
            },
            backgroundColor: {
              oneOf: [
                {
                  type: 'string',
                },
                {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              ],
            },
            borderColor: {
              oneOf: [
                {
                  type: 'string',
                },
                {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              ],
            },
            borderWidth: {
              type: 'integer',
            },
          },
          required: ['data'],
        },
      },
    },
    required: ['datasets'],
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
          chart: {
            type: 'string',
            enum: ['line', 'bar', 'pie', 'doughnut'],
          },
        },
      },
    },
    required: ['geochart'],
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
