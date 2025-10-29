import { ValidatorResult } from './chart-schema-validator';
import { GeoChartQuery, GeoChartQueryOptionClause } from './types';

export class ChartCore {
  // #region PUBLIC

  /**
   * Fetches the items that should be attached to the given Datasource.
   * @param {GeoChartQuery} queryConfig - The layer configuration currently used.
   * @param {string} language - The UI language for localized results.
   * @param {Record<string, unknown> | undefined} sourceItem - The item used to build dynamic filters.
   * @param {AbortController?} abortController - Optionally provide an abort controller.
   * @returns {Promise<Record<string, unknown>[]>} The resolved items for the datasource.
   * @static
   */
  static fetchItemsViaQueryForDatasource(
    queryConfig: GeoChartQuery,
    language: string,
    sourceItem: Record<string, unknown> | undefined,
    abortController?: AbortController
  ): Promise<Record<string, unknown>[]> {
    // Depending on the query type
    switch (queryConfig.type) {
      case 'ogcAPIFeatures':
        return this.#fetchItemsFromOGCAPI(queryConfig, language, sourceItem, abortController);
      case 'esriRegular':
        return this.#fetchItemsFromEsri(queryConfig, sourceItem, abortController);
      case 'json':
        return this.#fetchItemsFromJson(queryConfig, abortController);
      default:
        // Unsupported
        throw new Error('Unsupported query type to fetch the Datasource items.');
    }
  }

  /**
   * Helper function checking for the valid states of a list of ValidatorResults. Returns true if there were no errors found.
   * @param {(ValidatorResult | undefined)[]} validators - The list of validator results to check for their valid states
   * @returns true if there were no errors in the schema validations
   */
  static hasValidSchemas(validators: (ValidatorResult | undefined)[]): boolean {
    const validatorsInvalid = validators.filter((valResult: ValidatorResult | undefined) => {
      return valResult && !valResult.valid;
    });
    return validatorsInvalid.length === 0;
  }

  // #endregion PUBLIC

  // #region PRIVATE

  /**
   * Fetches feature items from an OGC API - Features endpoint based on the provided query configuration.
   * Constructs a request URL using the base endpoint and appends query parameters including language,
   * geometry skipping, and optionally a CQL filter based on query options and a source item.
   * @param {GeoChartQuery} queryConfig - The query configuration containing the OGC API endpoint and optional filter clauses.
   * @param {string} language - The current language used for localization in the API request.
   * @param {Record<string, unknown> | undefined} sourceItem - The source item providing values for dynamic filter clause construction.
   * @param {AbortController?} abortController - Optionally provide an abort controller.
   * @returns {Promise<Record<string, unknown>[]>} A promise that resolves to an array of feature records retrieved from the OGC API.
   * @static
   * @private
   */
  static #fetchItemsFromOGCAPI(
    queryConfig: GeoChartQuery,
    language: string,
    sourceItem: Record<string, unknown> | undefined,
    abortController?: AbortController
  ): Promise<Record<string, unknown>[]> {
    // Format the url
    let { url } = queryConfig;

    // Build the params
    url += `/items?f=json&lang=${language}&skipGeometry=true&offset=0`;

    // If any where clause condition
    if (queryConfig.queryOptions?.whereClauses) {
      // Leaving this commented, for cql support (which seems to be broken in pygeoapi vanilla build at the moment)
      // url += `/items?f=json&lang=${language}&skipGeometry=true&offset=0&filter-lang=cql-text`;

      const where = ChartCore.#buildQueryWhereClause(queryConfig.queryOptions.whereClauses, sourceItem);
      url += `&${where}`;
    }

    // Query it
    return ChartCore.#queryOGCFeaturesByUrl(url, abortController);
  }

  /**
   * Fetches feature items from a standard Esri REST API endpoint based on the provided query configuration.
   * Constructs a query URL by appending required parameters (output format, geometry exclusion, fields) and optional
   * filter and sort clauses. The `where` clause is dynamically built using the provided source item and query options.
   * @param {GeoChartQuery} queryConfig - The query configuration containing the Esri service URL and query options.
   * @param {Record<string, unknown> | undefined} sourceItem - The source item used to substitute dynamic filter values in the query.
   * @param {AbortController?} abortController - Optionally provide an abort controller.
   * @returns {Promise<Record<string, unknown>[]>} A promise that resolves to an array of feature records from the Esri layer or table.
   * @static
   * @private
   */
  static #fetchItemsFromEsri(
    queryConfig: GeoChartQuery,
    sourceItem: Record<string, unknown> | undefined,
    abortController?: AbortController
  ): Promise<Record<string, unknown>[]> {
    // Format the url
    let { url } = queryConfig;

    // Build the params
    const format = queryConfig.queryOptions?.format ?? 'json';
    url += `/query?outFields=*&f=${format}&returnGeometry=false`;

    // If some query options
    const options = queryConfig.queryOptions;
    if (options) {
      const where = ChartCore.#buildQueryWhereClause(options.whereClauses, sourceItem);
      url += `&where=${where}`;

      if (options.orderByField) {
        url += `&orderByFields=${options.orderByField}`;
      }
    }

    // Query it
    return ChartCore.#queryEsriFeaturesByUrl(url, abortController);
  }

  /**
   * Fetches feature items from a raw JSON endpoint defined in the query configuration.
   * Assumes the response format is compatible with OGC Features and queries the provided URL directly.
   * Intended for simple JSON endpoints or static datasets without additional filtering or query parameters.
   * @param {GeoChartQuery} queryConfig - The query configuration containing the JSON endpoint URL.
   * @param {AbortController?} abortController - Optionally provide an abort controller.
   * @returns {Promise<Record<string, unknown>[]>} A promise that resolves to an array of feature records retrieved from the JSON source.
   * @static
   * @private
   */
  static #fetchItemsFromJson(queryConfig: GeoChartQuery, abortController?: AbortController): Promise<Record<string, unknown>[]> {
    // Query it
    return ChartCore.#queryOGCFeaturesByUrl(queryConfig.url, abortController);
    // TODO: post-process response if needed
  }

  /**
   * Builds a where clause string, to be used in an url, given the array of GeoChartQueryOptionClause.
   * @param {GeoChartQueryOptionClause[]} whereClauses - The array of where clauses objects.
   * @param {Record<string, unknown> | undefined} sourceItem - The source to read the information from when building the clause in case 'valueFrom' is needed.
   * @returns {string} Returns the where clause string
   * @static
   * @private
   */
  static #buildQueryWhereClause(
    whereClauses: GeoChartQueryOptionClause[] | undefined,
    sourceItem: Record<string, unknown> | undefined
  ): string {
    // If no clause
    if (!whereClauses || whereClauses.length === 0) {
      return encodeURIComponent('1=1');
    }

    // Loop on each url options
    const conditions = whereClauses
      .map((clause) => {
        // Read the value we want
        let rawValue: unknown;
        if (clause.valueIs !== undefined) {
          // As-is replace
          rawValue = clause.valueIs;
        } else if (clause.valueFrom && sourceItem?.[clause.valueFrom] !== undefined) {
          // Value comes from the record object
          rawValue = sourceItem[clause.valueFrom];
        }

        // If no value
        if (rawValue === undefined || rawValue === null || rawValue === '') return null;

        // Double the quotes to prevent injection
        let rawString = rawValue.toString();
        rawString = rawString.replaceAll("'", "''");

        // Write prefix/suffix if any
        const prefixedValue = `${clause.prefix || ''}${rawString}${clause.suffix || ''}`;

        // Encode, concatenate to the where clause and return
        return `${clause.field}=${encodeURIComponent(prefixedValue)}`;
      })
      .filter((condition): condition is string => !!condition);

    // Build and return the where clause
    return conditions.length > 0 ? conditions.join(' AND ') : encodeURIComponent('1=1');
  }

  /**
   * Asynchronously queries an Esri Features endpoint given the url and returns an array of `unknown` records.
   * @param {string} url - An Esri Features url indicating a feature layer to query.
   * @param {AbortController?} abortController - Optionally provide an abort controller.
   * @returns {Promise<Record<string, unknown>[]>} An array of relared records of type unknown, or an empty array.
   * @static
   * @private
   */
  static async #queryEsriFeaturesByUrl(url: string, abortController?: AbortController): Promise<Record<string, unknown>[]> {
    // Query the data
    const response = await fetch(url, { signal: abortController?.signal });
    const respJson = await response.json();

    // Return the array of records
    return ChartCore.#parseFeatureInfoEsriEntries(respJson.features);
  }

  /**
   * Asynchronously queries an OGC API Features endpoint given the url and returns an array of `unknown` records.
   * @param {string} url - An OGC API Features url indicating a feature layer to query.
   * @param {AbortController?} abortController - Optionally provide an abort controller.
   * @returns {Promise<Record<string, unknown>[]>} An array of relared records of type unknown, or an empty array.
   * @static
   * @private
   */
  static async #queryOGCFeaturesByUrl(url: string, abortController?: AbortController): Promise<Record<string, unknown>[]> {
    // Query the data
    const response = await fetch(url, { signal: abortController?.signal });
    const respJson = await response.json();

    // Return the array of records
    return ChartCore.#parseFeatureInfoOGCEntries(respJson.features);
  }

  /**
   * Parses a list of Esri feature service records and extracts only their `attributes` field.
   * This transformation is used to normalize Esri-formatted features into plain JavaScript objects,
   * suitable for downstream data processing or chart rendering. Each feature's geometry and metadata
   * are ignored, and only the attribute-value pairs are preserved.
   * @param {any[]} records - An array of Esri feature service results, each with an `attributes` object.
   * @returns {Record<string, unknown>[]} An array of simplified records containing only the attributes.
   * @static
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static #parseFeatureInfoEsriEntries(records: any[]): Record<string, unknown>[] {
    // Loop on the Esri results
    return records.map((record) => {
      const attributes = record.attributes as Record<string, unknown> | undefined;
      return attributes ? { ...attributes } : {};
    });
  }

  /**
   * Transforms the query results of an OGC API features service response.
   * The transformation reads the GeoJson formatted information and return a list of `unknown` records.
   * @param {any[]} records - An array of GeoJSON Feature objects (typically with `type`, `geometry`, and `properties`).
   * @returns {Record<string, unknown>[]} An array of simplified feature records containing only the `properties`.
   * @static
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static #parseFeatureInfoOGCEntries(records: any[]): Record<string, unknown>[] {
    // Loop on the OGC results
    return records.map((record) => {
      const properties = record.properties as Record<string, unknown> | undefined;
      return properties ? { ...properties } : {};
    });
  }

  // #endregion PRIVATE
}
