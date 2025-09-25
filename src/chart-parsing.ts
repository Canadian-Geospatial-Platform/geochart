import { Chart as ChartJS, ChartType, ChartData, ChartDataset, ChartOptions, Tick, PluginChartOptions } from 'chart.js';
import {
  GeoChartConfig,
  GeoChartXYData,
  GeoDefaultDataPoint,
  GeoChartCategoriesGroup,
  GeoChartSelectedDataset,
  StepsPossibilities,
  ScalePossibilities,
  DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT,
  DEFAULT_COLOR_PALETTE_CUSTOM_OPAQUE,
  DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT,
  DEFAULT_COLOR_PALETTE_CUSTOM_ALT_OPAQUE,
  DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT,
  DEFAULT_COLOR_PALETTE_CHARTJS_OPAQUE,
  DATE_OPTIONS_AXIS,
} from './types';
import { isNumber } from './utils';

export class ChartParsing {
  /**
   * Creates the ChartJS Options object necessary for ChartJS process.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart Inputs to use to build the ChartJS ingestable information.
   * @param {ChartOptions<TType> }defaultOptions - The default, basic, necessary Options for ChartJS.
   * @param {ScalePossibilities | undefined} yAxisType - The scale possibilities, if any
   * @param {string} language - The current language of the UI.
   * @returns {ChartOptions<TType>} The ingestable Options properties
   * @static
   */
  static createChartJSOptions<TType extends ChartType>(
    chartConfig: GeoChartConfig<TType>,
    defaultOptions: ChartOptions<TType>,
    yAxisType: ScalePossibilities | undefined,
    language: string
  ): ChartOptions<TType> {
    // The Chart JS Options as entered or the default options
    const options = {
      ...defaultOptions,
      ...chartConfig.chartjsOptions,
      plugins: { ...(defaultOptions as PluginChartOptions<TType>).plugins },
    } as ChartOptions<TType>;

    // If line and using a time series
    if (
      chartConfig.chart === 'line' &&
      (chartConfig.geochart.xAxis?.type === 'time' || chartConfig.geochart.xAxis?.type === 'timeseries')
    ) {
      // Generate the options object
      const optionsLine = options as ChartOptions<'line'>;
      optionsLine.scales = {
        ...optionsLine.scales,
        x: {
          type: chartConfig.geochart.xAxis?.type,
          ticks: {
            autoSkip: true,
            major: {
              enabled: true,
            },
            padding: 10,
            source: 'auto',
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            callback: (tickValue: number | Date | string, index: number, ticks: Tick[]): string => {
              // Make it a date
              const d = new Date(tickValue);
              const label = d.toLocaleString(language, DATE_OPTIONS_AXIS);

              // Trick by keeping the previously calculated label in an extra property (for performance)
              // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-explicit-any
              (ticks[index] as any).geoLabel = label;

              // If the generated label is major or different than the one prior
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (ticks[index].major || (index > 0 && label !== (ticks[index - 1] as any).geoLabel)) {
                return label;
              }

              // No label, redundant
              return '';
            },
          },
          offset: true,
        },
      };
    }

    // If line or bar
    if (chartConfig.chart === 'line' || chartConfig.chart === 'bar') {
      const optionsLine = options as ChartOptions<'line' | 'bar'>;
      // If type is set
      if (yAxisType) {
        optionsLine.scales = {
          ...optionsLine.scales,
          y: {
            type: yAxisType,
          },
        };
      }

      // Drill
      optionsLine.plugins = optionsLine.plugins || {};
      optionsLine.plugins.tooltip = optionsLine.plugins.tooltip || {};
      optionsLine.plugins.tooltip.callbacks = optionsLine.plugins.tooltip.callbacks || {};

      // If tooltip
      if (chartConfig.geochart.yAxis.tooltipSuffix) {
        optionsLine.plugins.tooltip.callbacks.label = (context): string => {
          return `${context.formattedValue} ${chartConfig.geochart.yAxis.tooltipSuffix}`;
        };
      }
    }

    // Return the ChartJS Options
    return options;
  }

  /**
   * Creates the ChartJS Data object necessary for ChartJS process.
   * The datasets are being sorted by labels.
   * When the xAxis reprensents time, the datasets are internally sorted by date.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {GeoChartSelectedDataset} datasetsRegistry - The datasets registry
   * @param {GeoChartSelectedDataset} datasRegistry - The datas registry
   * @param {StepsPossibilities  | undefined} steps - The steps, if any
   * @param {Record<string, unknown>[]} records - The records to build the data from.
   * @param {ChartData<TType, TData, TLabel>} defaultData - The default, basic, necessary Data for ChartJS.
   * @returns {ChartData<TType, TData, TLabel>} The ChartJS ingestable Data properties
   * @static
   */
  static createChartJSData<
    TType extends ChartType,
    TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
    TLabel extends string = string
  >(
    chartConfig: GeoChartConfig<TType>,
    datasetsRegistry: GeoChartSelectedDataset,
    datasRegistry: GeoChartSelectedDataset,
    steps: StepsPossibilities,
    records: Record<string, unknown>[] | undefined,
    defaultData: ChartData<TType, TData, TLabel>
  ): ChartData<TType, TData, TLabel> {
    // If there's a data source, parse it to a GeoChart data
    let data: ChartData<TType, TData, TLabel> = { ...defaultData };
    if (records && records.length > 0) {
      data = ChartParsing.#createDatasets(chartConfig, datasetsRegistry, datasRegistry, steps, records);
    }

    // Sort the dataset labels
    ChartParsing.#sortOnDatasetLabels(data);

    // If the x axis type is time
    if (chartConfig.geochart.xAxis?.type === 'time' || chartConfig.geochart.xAxis?.type === 'timeseries') {
      // Make sure the datasets data are sorted on X
      ChartParsing.#sortOnX(data.datasets);
    }

    // GeoChart Parsed information
    return data;
  }

  /**
   * Validates and Sets the color palette that shall be used by the Chart. This is to best align the UI (notably the checkboxes)
   * with the possible real display of the Chart. Indeed, ChartJS uses a default color palette when none is set and we'd like to
   * explicit that so that the rest of the UI can adapt to whatever color palette the Chart is 'really' using.
   * Logic goes:
   *   - when a paletteBackgrounds or paletteBorders are specified via the configuration, that's the palette that shall be used
   *   - when no paletteBackgrounds or paletteBorders are specified via the configuration, the ChartJS palette shall be explicitely
   *     used (not letting ChartJS make it by magic).
   *   - when no paletteBackgrounds or paletteBorders are specified via the configuration, and usePalette is true, a custom palette
   *     is explicitely used.
   * @param {GeoChartConfig<TType> | undefined} chartConfig - The Inputs to use to build the ChartJS ingestable information.
   * @static
   */
  static setColorPalettes<TType extends ChartType>(chartConfig: GeoChartConfig<TType> | undefined): void {
    // If there's a category
    if (chartConfig?.category) {
      // If there's no background palettes
      if (!chartConfig.category.paletteBackgrounds) {
        // For line or bar charts, set the ChartJS default color palette
        if (chartConfig.chart === 'line' || chartConfig.chart === 'bar') {
          // eslint-disable-next-line no-param-reassign
          chartConfig.category.paletteBackgrounds = DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT;
        }
        // eslint-disable-next-line no-param-reassign
        if (chartConfig.category.usePalette) chartConfig.category.paletteBackgrounds = DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT;
      }
      // If there's no border palettes
      if (!chartConfig.category.paletteBorders) {
        // For line or bar charts, we may want to use ChartJS's color palette
        if (chartConfig.chart === 'line' || chartConfig.chart === 'bar') {
          // eslint-disable-next-line no-param-reassign
          chartConfig.category.paletteBorders = DEFAULT_COLOR_PALETTE_CHARTJS_OPAQUE;
        }
        // eslint-disable-next-line no-param-reassign
        if (chartConfig.category.usePalette) chartConfig.category.paletteBorders = DEFAULT_COLOR_PALETTE_CUSTOM_OPAQUE;
      }
    }

    // If there's a X-Axis
    if (chartConfig?.geochart.xAxis) {
      // If there's no background palettes
      if (!chartConfig.geochart.xAxis.paletteBackgrounds) {
        // eslint-disable-next-line no-param-reassign
        chartConfig.geochart.xAxis.paletteBackgrounds = DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT;
        if (chartConfig.geochart.xAxis.usePalette)
          // eslint-disable-next-line no-param-reassign
          chartConfig.geochart.xAxis.paletteBackgrounds = DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT;
      }
      // If there's no border palettes
      if (!chartConfig.geochart.xAxis.paletteBorders) {
        // eslint-disable-next-line no-param-reassign
        chartConfig.geochart.xAxis.paletteBorders = DEFAULT_COLOR_PALETTE_CHARTJS_OPAQUE;
        // eslint-disable-next-line no-param-reassign
        if (chartConfig.geochart.xAxis.usePalette) chartConfig.geochart.xAxis.paletteBorders = DEFAULT_COLOR_PALETTE_CUSTOM_ALT_OPAQUE;
      }
    }
  }

  /**
   * Creates all ChartDataset objects, for ChartJS, based on the GeoChart configuration.
   * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {GeoChartSelectedDataset} datasetsRegistry - The datasets registry
   * @param {GeoChartSelectedDataset} datasRegistry - The datas registry
   * @param {StepsPossibilities  | undefined} steps - The steps, if any
   * @param {Record<string, unknown>[]} records - The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
   * @returns {ChartData<TType, TData, TLabel>} The object containing the ChartDatasets
   * @static
   * @private
   */
  static #createDatasets<
    TType extends ChartType = ChartType,
    TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
    TLabel extends string = string
  >(
    chartConfig: GeoChartConfig<TType>,
    datasetsRegistry: GeoChartSelectedDataset,
    datasRegistry: GeoChartSelectedDataset,
    steps: StepsPossibilities | undefined,
    records: Record<string, unknown>[]
  ): ChartData<TType, TData, TLabel> {
    // Depending on the ChartType
    if (chartConfig.chart === 'line' || chartConfig.chart === 'bar') {
      return ChartParsing.#createDatasetsLineBar(chartConfig, datasetsRegistry, steps, records);
    }
    if (chartConfig.chart === 'pie' || chartConfig.chart === 'doughnut') {
      return ChartParsing.#createDatasetsPieDoughnut(chartConfig, datasetsRegistry, datasRegistry, records);
    }
    throw Error('Unsupported chart type');
  }

  /**
   * Creates all ChartDataset objects for line chart types, for ChartJS, based on the GeoChart configuration.
   * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {GeoChartSelectedDataset} datasetsRegistry - The dataset registry
   * @param {StepsPossibilities | undefined} steps - The steps if any
   * @param {Record<string, unknown>[]} records - The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
   * @returns {ChartData<TType, TData, TLabel>} The object containing the ChartDatasets
   * @static
   * @private
   */
  static #createDatasetsLineBar<
    TType extends ChartType = 'line' | 'bar',
    TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
    TLabel extends string = string
  >(
    chartConfig: GeoChartConfig<TType>,
    datasetsRegistry: GeoChartSelectedDataset,
    steps: StepsPossibilities | undefined,
    records: Record<string, unknown>[]
  ): ChartData<TType, TData, TLabel> {
    // Transform the TypeFeatureJson data to ChartData<TType, TData, string>
    const returnedChartData: ChartData<TType, TData, TLabel> = {
      labels: [],
      datasets: [],
    };

    // If we categorize
    let idx = 0;
    if (chartConfig.category?.property) {
      // 1 category = 1 dataset
      const categoriesRead: GeoChartCategoriesGroup<TData> = {};
      records.forEach((rec) => {
        // Read the category as a string
        const catName = rec[chartConfig.category!.property] as string;

        // If it's a category we actually want
        if (datasetsRegistry[catName].checked) {
          // If new category
          if (!Object.keys(categoriesRead).includes(catName)) {
            // Get the color using the registry
            // Create dataset
            const newDataset = ChartParsing.#createDataset<TType, TData>(
              chartConfig,
              datasetsRegistry[catName].backgroundColor,
              datasetsRegistry[catName].borderColor,
              steps,
              catName
            );
            categoriesRead[catName] = { index: idx++, data: newDataset.data };
            returnedChartData.datasets.push(newDataset);
          }

          // Parse data
          const dataParsed = ChartParsing.#createDataXYFormat<TType>(chartConfig, rec);

          // Find the data array and push in it.
          categoriesRead[catName].data.push(dataParsed);
        }
      });
    } else {
      // 1 feature = 1 dataset
      // Create dataset
      const newDataset = ChartParsing.#createDataset<TType, TData>(
        chartConfig,
        ChartJS.defaults.color as string,
        undefined,
        steps,
        undefined
      );
      returnedChartData.datasets.push(newDataset);

      // For each record
      records.forEach((rec) => {
        // Parse data
        const dataParsed = ChartParsing.#createDataXYFormat<TType>(chartConfig, rec);
        newDataset.data.push(dataParsed);
      });
    }

    // Done
    return returnedChartData;
  }

  /**
   * Creates all ChartDataset objects for line and bar chart types, for ChartJS, based on the GeoChart configuration.
   * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {GeoChartSelectedDataset} datasetsRegistry - The datasets registry
   * @param {GeoChartSelectedDataset} datasRegistry - The datas registry
   * @param {Record<string, unknown>[]} records - The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
   * @returns {ChartData<TType, TData, TLabel>} The object containing the ChartDatasets
   * @static
   * @private
   */
  static #createDatasetsPieDoughnut<
    TType extends ChartType = 'pie' | 'doughnut',
    TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
    TLabel extends string = string
  >(
    chartConfig: GeoChartConfig<TType>,
    datasetsRegistry: GeoChartSelectedDataset,
    datasRegistry: GeoChartSelectedDataset,
    records: Record<string, unknown>[]
  ): ChartData<TType, TData, TLabel> {
    // Transform the TypeFeatureJson data to ChartData<TType, TData, string>
    const returnedChartData: ChartData<TType, TData, TLabel> = {
      labels: [],
      datasets: [],
    };

    // For Pie and Doughnut, all values for x axis will go in labels
    records.forEach((rec) => {
      // Read the value on x axis for each
      const valX: TLabel = rec[chartConfig.geochart.xAxis.property] as string as TLabel;
      if (!returnedChartData.labels!.includes(valX)) returnedChartData.labels!.push(valX);
    });

    // Build the color palette using registry and label (the same palette is used for all datasets)
    let paletteBackgroundAll: string[];
    if (returnedChartData.labels) {
      paletteBackgroundAll = returnedChartData.labels?.map((label: TLabel) => {
        return datasRegistry[label].backgroundColor;
      });
    }

    // If we categorize
    if (chartConfig.category?.property) {
      // 1 category = 1 dataset
      const categoriesRead: GeoChartCategoriesGroup<TData> = {};
      let idx = 0;
      records.forEach((rec) => {
        // Read the category as a string
        const catName = rec[chartConfig.category!.property] as string;

        // If it's a category we actually want
        if (datasetsRegistry[catName].checked) {
          // If new category
          if (!Object.keys(categoriesRead).includes(catName)) {
            // Create dataset
            const newDataset = ChartParsing.#createDataset<TType, TData>(
              chartConfig,
              paletteBackgroundAll,
              ChartJS.defaults.color as string,
              undefined,
              catName
            );
            categoriesRead[catName] = { index: idx++, data: newDataset.data };
            returnedChartData.datasets.push(newDataset);
          }
        }
      });

      // Now that each data is in its own category, compress it all for a pie/doughnut chart

      // For each dataset
      returnedChartData.datasets.forEach((chartDataset: ChartDataset<TType, TData>) => {
        // Compress the data for the ChartDataset
        const newData: TData = ChartParsing.#createDataCompressedForPieDoughnut(
          chartConfig,
          chartDataset,
          returnedChartData.labels!,
          records
        );

        // Find the data array and push in it.
        categoriesRead[chartDataset.label!].data.push(...newData);
      });
    } else {
      // 1 feature = 1 dataset
      // Create dataset
      const newDataset = ChartParsing.#createDataset<TType, TData>(
        chartConfig,
        ChartJS.defaults.color as string,
        undefined,
        undefined,
        undefined
      );
      returnedChartData.datasets.push(newDataset);

      // Compress the data for the ChartDataset
      const newData: TData = ChartParsing.#createDataCompressedForPieDoughnut(chartConfig, newDataset, returnedChartData.labels!, records);

      // Push the data
      newDataset.data.push(...newData);
    }

    // Done
    return returnedChartData;
  }

  /**
   * Creates a ChartDataset object, for ChartJS, based on the GeoChart configuration.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {string | string[] | undefined} backgroundColor - The background color if any
   * @param {string | string[] | undefined} borderColor - The border color if any
   * @param {StepsPossibilities | undefined} steps - The steps if any
   * @param {string?} label - The label if any
   * @returns {ChartDataset} The object
   * @static
   * @private
   */
  static #createDataset<TType extends ChartType, TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>>(
    chartConfig: GeoChartConfig<TType>,
    backgroundColor: string | string[] | undefined,
    borderColor: string | string[] | undefined,
    steps: StepsPossibilities | undefined,
    label?: string
  ): ChartDataset<TType, TData> {
    // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
    const theDataset: ChartDataset<TType, TData> = {
      label,
      data: [],
    } as unknown as ChartDataset<TType, TData>;

    // If building a line chart
    if (chartConfig.chart === 'line') {
      // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
      const theDatasetLine = theDataset as ChartDataset<'line'>;

      // If useSteps is defined, set it for each dataset
      if (steps !== undefined) theDatasetLine.stepped = steps;

      // If tension is defined, set it for each dataset
      if (chartConfig.geochart.tension) theDatasetLine.tension = chartConfig.geochart.tension;
    }

    // Set the colors
    if (backgroundColor) theDataset.backgroundColor = backgroundColor;
    if (borderColor) theDataset.borderColor = borderColor;

    // If the border width is set (applies to all datasets the same)
    if (chartConfig.geochart.borderWidth) {
      theDataset.borderWidth = chartConfig.geochart.borderWidth;
    }
    return theDataset;
  }

  /**
   * Compresses the data for the given dataset in a data array format expected for the Pie/Doughnut charts. This function also
   * considers the categorization when one must be done.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {ChartDataset<TType, TData>} dataset - The current dataset being parsed
   * @param {string[]} labels - The current labels array for the whole Chart (all ChartDatasets) being parsed
   * @param {Record<string, unknown>[]} records - The records for the whole Chart
   * @returns {TData} The object representing the expected data array of expected dimension based on the labels array
   * @static
   * @private
   */
  static #createDataCompressedForPieDoughnut<
    TType extends ChartType,
    TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
    TLabel extends string = string
  >(chartConfig: GeoChartConfig<TType>, dataset: ChartDataset<TType, TData>, labels: string[], records: Record<string, unknown>[]): TData {
    // Create a new data array of expected length containing only 'null' values
    const newData: TData = Array.from({ length: labels.length }, () => null) as TData;

    // If categorizing, filter on the current dataset label
    let subRecords = records;
    if (chartConfig.category) {
      subRecords = records.filter((rec) => {
        return (rec[chartConfig.category!.property] as string as TLabel) === dataset.label;
      });
    }

    // For each data to compress in the array
    subRecords.forEach((rec) => {
      const valX: TLabel = rec[chartConfig.geochart.xAxis.property] as string as TLabel;
      // Find the index for that value
      const labelIndex = labels.indexOf(valX);
      newData[labelIndex] = rec[chartConfig.geochart.yAxis.property] as number;
    });

    // Return the compressed data
    return newData;
  }

  /**
   * Creates a GeoChartXYData data value by reading attributes from a Record<string, unknown>.
   * The GeoChartXYData has x and y properties and functions similar to the DefaultDataPoint, like ChartJS supports, but with additional
   * support of Dates on the 'x' property.
   * @param {GeoChartConfig<TType>} chartConfig - The GeoChart configuration
   * @param {Record<string, unknown>} attributes - The data opbject containing the attributes to use to create the GeoChartXYData
   * @returns {GeoChartXYData} The GeoChartXYData object
   * @static
   * @private
   */
  static #createDataXYFormat<TType extends ChartType>(
    chartConfig: GeoChartConfig<TType>,
    attributes: Record<string, unknown>
  ): GeoChartXYData {
    // Read the unknown value in x
    const valRawX: unknown = attributes[chartConfig.geochart.xAxis.property];

    // If the value is expected to be a time
    let xVal: unknown = valRawX;
    if (chartConfig.geochart.xAxis?.type === 'time' || chartConfig.geochart.xAxis?.type === 'timeseries') {
      // Make sure it's a date object
      if (valRawX instanceof Date) {
        xVal = valRawX;
      } else {
        // Do our best to convert to date
        xVal = new Date(valRawX as string);
      }
    }

    // Read the value in y, hopefully it's a number, that's what GeoChartXYPair supports for now (there's a TODO there)
    const valRawY: number = attributes[chartConfig.geochart.yAxis.property] as number;

    // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
    return {
      x: xVal,
      y: valRawY,
    };
  }

  /**
   * Sorts all ChartDatasets based on the X values of their data.
   * @param {ChartDataset<TType, TData>[]} datasets - The array of ChartDataset that we each want to sort on their X value.
   * @static
   * @private
   */
  static #sortOnX<TType extends ChartType, TData = GeoDefaultDataPoint<TType>>(datasets: ChartDataset<TType, TData>[]): void {
    // For each dataset
    datasets.forEach((ds: ChartDataset<TType, TData>) => {
      const dataInDataset = ds.data as { x: number | string | Date | undefined }[];
      const dataOrdered = dataInDataset.sort(
        (a: { x: number | string | Date | undefined }, b: { x: number | string | Date | undefined }) => {
          if (a.x instanceof Date) {
            if (a.x === (b.x as Date)) return 0;
            if (a.x < (b.x as Date)) return -1;
            return 1;
          }
          if (isNumber(a.x) && isNumber(b.x)) return (a.x as number) - (b.x as number);
          if (a.x && b.x) return (a.x as string).localeCompare(b.x as string);
          if (!a.x) return -1;
          if (!b.x) return 1;
          return 0;
        }
      );

      // Replace
      // eslint-disable-next-line no-param-reassign
      ds.data = dataOrdered as TData;
    });
  }

  /**
   * Sorts all ChartDatasets in the given ChartData based on their label values.
   * @param {ChartData<TType, TData, TLabel>} data - The data holding the datasets to be sorted.
   * @static
   * @private
   */
  static #sortOnDatasetLabels<TType extends ChartType, TData = GeoDefaultDataPoint<TType>, TLabel = string>(
    data: ChartData<TType, TData, TLabel>
  ): void {
    // For each dataset
    const datasetsOrdered = data.datasets.sort((a: ChartDataset<TType, TData>, b: ChartDataset<TType, TData>) => {
      if (a.label && b.label) return a.label.localeCompare(b.label);
      return 0;
    });

    // Replace
    // eslint-disable-next-line no-param-reassign
    data.datasets = datasetsOrdered;
  }
}
