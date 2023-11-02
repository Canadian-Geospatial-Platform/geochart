import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import SCHEMA_INPUTS from '../schema-inputs.json';
import SCHEMA_DATA from '../schema-chartjs-data.json';
import SCHEMA_OPTIONS from '../schema-chartjs-options.json';

/**
 * Represents the result of a Chart data or options inputs validations.
 */
export type ValidatorResult = {
  valid: boolean;
  errors?: string[];
};

/**
 * The Schema Validator class to validate json objects.
 */
export class SchemaValidator {
  // The embedded JSON validator
  private ajv: Ajv;

  /**
   * Constructs a Chart Validate object to validate schemas.
   */
  constructor() {
    // The embedded JSON validator
    this.ajv = new Ajv();
    addFormats(this.ajv);
  }

  /**
   * Validates the GeoChart input parameters.
   * @param data object the data json object to validate
   */
  validateInputs = (data: unknown): ValidatorResult => {
    // Redirect
    return this.validateJsonSchema(SCHEMA_INPUTS, data);
  };

  /**
   * Validates the ChartJS data parameters.
   * @param data object the data json object to validate
   */
  validateData = (data: unknown): ValidatorResult => {
    // Redirect
    return this.validateJsonSchema(SCHEMA_DATA, data);
  };

  /**
   * Validates the ChartJS options parameters.
   * @param options object the options json object to validate
   */
  validateOptions = (options: unknown): ValidatorResult => {
    // Redirect
    return this.validateJsonSchema(SCHEMA_OPTIONS, options);
  };

  /**
   * Validates the a jsonObj using a schema validator.
   * @param schema object the schema validator json to validate the jsonObj with
   * @param jsonObj object the json object to validate
   */
  validateJsonSchema = (schema: object, anyObject: unknown): ValidatorResult => {
    // Compile
    const validate = this.ajv.compile(schema);

    // Validate
    const valid = validate(anyObject) as boolean;

    // Return a ValidatorResult
    return {
      valid,
      errors: validate.errors?.map((e: ErrorObject) => {
        const m = e.message || 'generic schema error';
        return `${e.schemaPath} | ${e.keyword} | ${m}`;
      }),
    };
  };

  /**
   * Returns a string representation of the errors of all ValidatorResult objects.
   * @param valRes ValidatorResult[] the list of validation results to read and put to string
   */
  public static parseValidatorResultsMessages = (valRes: ValidatorResult[]): string => {
    // Gather all error messages for data input
    let msg = '';
    valRes.forEach((v) => {
      // Redirect
      msg += SchemaValidator.parseValidatorResultMessage(v);
    });
    return msg.replace(/^\n+|\n+$/gm, '');
  };

  /**
   * Returns a string representation of the error in the ValidatorResult object.
   * @param valRes ValidatorResult the validation result to read and put to string
   */
  public static parseValidatorResultMessage = (valRes: ValidatorResult): string => {
    // Gather all error messages for data input
    let msg = '';
    valRes.errors?.forEach((m: string) => {
      msg += `${m}\n`;
    });
    return msg.replace(/^\n+|\n+$/gm, '');
  };
}
