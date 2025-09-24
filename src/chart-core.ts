import { ValidatorResult } from './chart-schema-validator';
import { GeoChartQuery, GeoChartQueryOptionClause } from './types';

export class ChartCore {
  /**
   * Fetches the items that should be attached to the given Datasource.
   * @param {GeoChartQuery} queryConfig - The layer configuration we're currently using.
   * @param {string} language - The language
   * @param {Record<string, unknown> | undefined} sourceItem - The source item to grab items form
   * @returns {Promise<Record<string, unknown>[]>} Returns the items that should be attached to the Datasource
   * @static
   */
  static async fetchItemsViaQueryForDatasource(
    queryConfig: GeoChartQuery,
    language: string,
    sourceItem: Record<string, unknown> | undefined
  ): Promise<Record<string, unknown>[]> {
    // Depending on the type of query
    let entries: Record<string, unknown>[];
    if (queryConfig.type === 'ogcAPIFeatures') {
      // Base query url
      let { url } = queryConfig;

      // Append the mandatory params
      url += `/items?f=json&lang=${language}&skipGeometry=true&offset=0&filter-lang=cql-text`;

      // If any query options
      if (queryConfig.queryOptions) {
        // NOTE: The filter clause is only supported in Part 3 of the OGC Features API doc. For some services, this might not work.
        // The options
        const urlOptions = queryConfig.queryOptions;

        // Build the where clause of the url
        url += `&filter=${ChartCore.#buildQueryWhereClause(urlOptions.whereClauses, sourceItem)}`;
      }

      // Query an OGC Features endpoint
      entries = await ChartCore.#queryOGCFeaturesByUrl(url);
    } else if (queryConfig.type === 'esriRegular') {
      // Base query url
      let { url } = queryConfig;

      // Append the mandatory params
      url += '/query?outFields=*&f=json';

      // If any query options
      if (queryConfig.queryOptions) {
        // The options
        const urlOptions = queryConfig.queryOptions;

        // Build the where clause of the url
        url += `&where=${ChartCore.#buildQueryWhereClause(urlOptions.whereClauses, sourceItem)}`;

        // Build the order by clause of the url
        url += `&orderByFields=${urlOptions.orderByField}`;
      }

      // Query an Esri layer/table regular method
      entries = await ChartCore.#queryEsriFeaturesByUrl(url);
    } else if (queryConfig.type === 'json') {
      // Base query url
      const { url } = queryConfig;

      // Query an Esri layer/table regular method
      entries = await ChartCore.#queryOGCFeaturesByUrl(url);

      // TODO: Do something with the payload if we want to be fancy about it like filtering client side and stuff
    } else {
      throw Error('Unsupported query type to fetch the Datasource items.');
    }

    // Simplify for the GeoChart
    return entries;
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

  /**
   * Builds a where clause string, to be used in an url, given the array of GeoChartQueryOptionClause.
   * @param {GeoChartQueryOptionClause[]} whereClauses - The array of where clauses objects.
   * @param {Record<string, unknown> | undefined} sourceItem - The source to read the information from when building the clause in case 'valueFrom' is needed.
   * @returns {string} Returns the where clause string
   * @static
   * @private
   */
  static #buildQueryWhereClause(whereClauses: GeoChartQueryOptionClause[], sourceItem: Record<string, unknown> | undefined): string {
    // Loop on each url options
    let theWhereClause = '';
    if (whereClauses) {
      whereClauses.forEach((urlOpt: GeoChartQueryOptionClause) => {
        // Read the value we want
        let val;
        if (urlOpt.valueIs) {
          // As-is replace
          val = urlOpt.valueIs;
        } else if (urlOpt.valueFrom && sourceItem) {
          // Value comes from the record object
          val = sourceItem[urlOpt.valueFrom] as string;
        }
        // If value was read, concatenate to the where clause
        if (val) {
          val = `${urlOpt.prefix || ''}${val}${urlOpt.suffix || ''}`;
          val = encodeURIComponent(val);
          theWhereClause += `${urlOpt.field}=${val} AND `;
        }
      });
      theWhereClause = theWhereClause.replace(/ AND $/, '');
    }

    // Return the where clause
    return theWhereClause;
  }

  /**
   * Asynchronously queries an Esri Features endpoint given the url and returns an array of `unknown` records.
   * @param {string} url - An Esri Features url indicating a feature layer to query
   * @returns {Promise<Record<string, unknown>[]>} An array of relared records of type unknown, or an empty array.
   * @static
   * @private
   */
  static async #queryEsriFeaturesByUrl(url: string): Promise<Record<string, unknown>[]> {
    // Query the data
    const response = await fetch(url);
    const respJson = await response.json();

    // Return the array of records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ChartCore.#parseFeatureInfoEsriEntries(respJson.features as any[]);
  }

  /**
   * Asynchronously queries an OGC API Features endpoint given the url and returns an array of `unknown` records.
   * @param {string} url - An OGC API Features url indicating a feature layer to query
   * @returns {Promise<Record<string, unknown>[]>} An array of relared records of type unknown, or an empty array.
   * @static
   * @private
   */
  static async #queryOGCFeaturesByUrl(url: string): Promise<Record<string, unknown>[]> {
    // Query the data
    const response = await fetch(url);
    const respJson = await response.json();

    // Return the array of records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ChartCore.#parseFeatureInfoOGCEntries(respJson.features as any[]);
  }

  /**
   * Transforms the query results of an Esri features service response.
   * The transformation reads the Esri formatted information and return a list of `unknown` records.
   * @param {any[]} records - The Json Object representing the data from Esri.
   * @returns {Record<string, unknown>[]} An array of relared records of type Record<string, unknown>
   * @static
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static #parseFeatureInfoEsriEntries(records: any[]): Record<string, unknown>[] {
    // Loop on the Esri results
    return records.map((rec) => {
      // Prep the any
      const featInfo = {} as Record<string, unknown>;

      // Loop on the object attributes
      Object.entries(rec.attributes as { [s: string]: unknown }).forEach((tupleAttrValue: [string, unknown]) => {
        // eslint-disable-next-line prefer-destructuring
        featInfo[tupleAttrValue[0]] = tupleAttrValue[1];
      });

      // Return the record
      return featInfo;
    });
  }

  /**
   * Transforms the query results of an OGC API features service response.
   * The transformation reads the GeoJson formatted information and return a list of `unknown` records.
   * @param {any[]} records - The Json Object representing the data from OGC.
   * @returns {Record<string, unknown>[]} An array of relared records of type Record<string, unknown>
   * @static
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static #parseFeatureInfoOGCEntries(records: any[]): Record<string, unknown>[] {
    // Loop on the Esri results
    return records.map((rec) => {
      // Prep the record
      const featInfo = {} as Record<string, unknown>;

      // Loop on the object properties
      Object.entries(rec.properties as { [s: string]: unknown }).forEach((tupleAttrValue: [string, unknown]) => {
        // eslint-disable-next-line prefer-destructuring
        featInfo[tupleAttrValue[0]] = tupleAttrValue[1];
      });

      // Return the record
      return featInfo;
    });
  }
}
