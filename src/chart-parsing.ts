import { ChartType, ChartData, ChartDataset, ChartOptions, Tick } from 'chart.js';
import {
  GeoChartConfig,
  GeoChartXYData,
  GeoDefaultDataPoint,
  TypeJsonObject,
  GeoChartCategoriesGroup,
  DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT,
  DEFAULT_COLOR_PALETTE_CUSTOM_OPAQUE,
  DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT,
  DEFAULT_COLOR_PALETTE_CUSTOM_ALT_OPAQUE,
  DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT,
  DEFAULT_COLOR_PALETTE_CHARTJS_OPAQUE,
  DATE_OPTIONS_AXIS,
} from './chart-types';
import { isNumber, getColorFromPalette } from './chart-util';

/**
 * Sorts all ChartDatasets based on the X values of their data.
 * @param datasets ChartDataset<TType, TData>[] the array of ChartDataset that we each want to sort on their X value.
 */
function sortOnX<TType extends ChartType, TData = GeoDefaultDataPoint<TType>>(datasets: ChartDataset<TType, TData>[]): void {
  // For each dataset
  datasets.forEach((ds: ChartDataset<TType, TData>) => {
    const dataInDataset = ds.data as { x: number | string | Date | undefined }[];
    const dataOrdered = dataInDataset.sort((a: { x: number | string | Date | undefined }, b: { x: number | string | Date | undefined }) => {
      if (a.x instanceof Date) {
        if ((a.x as Date) === (b.x as Date)) return 0;
        if ((a.x as Date) < (b.x as Date)) return -1;
        return 1;
      }
      if (isNumber(a.x) && isNumber(b.x)) return (a.x as number) - (b.x as number);
      if (a.x && b.x) return (a.x as string).localeCompare(b.x as string);
      if (!a.x) return -1;
      if (!b.x) return 1;
      return 0;
    });

    // Replace
    // eslint-disable-next-line no-param-reassign
    ds.data = dataOrdered as TData;
  });
}

/**
 * Creates a GeoChartXYData data value by reading attributes from a TypeJsonObject.
 * The GeoChartXYData has x and y properties and functions similar to the DefaultDataPoint, like ChartJS supports, but with additional
 * support of Dates on the 'x' property.
 * @param chartConfig GeoChartConfig<TType> The GeoChart configuration
 * @param attributes TypeJsonObject The data opbject containing the attributes to use to create the GeoChartXYData
 * @returns The GeoChartXYData object
 */
function createDataXYFormat<TType extends ChartType>(chartConfig: GeoChartConfig<TType>, attributes: TypeJsonObject): GeoChartXYData {
  // Read the unknown value in x
  const valRawX: unknown = attributes[chartConfig.geochart.xAxis!.property];

  // If the value is expected to be a time
  let xVal: number | Date | string | unknown = valRawX;
  if (chartConfig.geochart.xAxis?.type === 'time') {
    // Make sure it's a date object
    if (valRawX instanceof Date) xVal = valRawX as Date;
    if (isNumber(valRawX)) xVal = new Date(valRawX as number);
  }

  // Read the value in y, hopefully it's a number, that's what GeoChartXYPair supports for now (there's a TODO there)
  const valRawY: number = attributes[chartConfig.geochart.yAxis!.property] as number;

  // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
  return {
    x: xVal,
    y: valRawY,
  };
}

/**
 * Compresses the data for the given dataset in a data array format expected for the Pie/Doughnut charts. This function also
 * considers the categorization when one must be done.
 * @param chartConfig GeoChartConfig<TType> The GeoChart configuration
 * @param dataset ChartDataset<TType, TData> The current dataset being parsed
 * @param labels string[] The current labels array for the whole Chart (all ChartDatasets) being parsed
 * @param records TypeJsonObject[] The records for the whole Chart
 * @returns The TData object representing the expected data array of expected dimension based on the labels array
 */
function createDataCompressedForPieDoughnut<
  TType extends ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel extends string = string
>(chartConfig: GeoChartConfig<TType>, dataset: ChartDataset<TType, TData>, labels: string[], records: TypeJsonObject[]): TData {
  // Create a new data array of expected length containing only 'null' values
  const newData: TData = Array.from({ length: labels.length }, () => null) as TData;

  // If categorizing, filter on the current dataset label
  let subRecords = records;
  if (chartConfig.category) {
    subRecords = records.filter((rec: TypeJsonObject) => {
      return (rec[chartConfig.category!.property] as string as TLabel) === dataset.label;
    });
  }

  // For each data to compress in the array
  subRecords.forEach((rec: TypeJsonObject) => {
    const valX: TLabel = rec[chartConfig.geochart.xAxis!.property] as string as TLabel;
    // Find the index for that value
    const labelIndex = labels!.indexOf(valX);
    newData[labelIndex] = rec[chartConfig.geochart.yAxis!.property] as number;
  });

  // Return the compressed data
  return newData;
}

/**
 * Creates a ChartDataset object, for ChartJS, based on the GeoChart configuration.
 * @param chartConfig GeoChartConfig<TType> The GeoChart configuration
 * @param creationIndex number The index of the ChartDataset being created (used for the loop in 'createDtasets')
 * @param label string The ChartDataset label
 * @param attributes TypeJsonObject All attributes to use for the ChartDataset
 * @returns The ChartDataset object
 */
function createDataset<TType extends ChartType, TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>>(
  chartConfig: GeoChartConfig<TType>,
  backgroundColor: string | string[] | undefined,
  borderColor: string | string[] | undefined,
  label?: string
): ChartDataset<TType, TData> {
  // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
  let theDatasetGeneric: ChartDataset<TType, TData>;

  // If building a line chart
  if (chartConfig.chart === 'line') {
    // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
    const theDatasetLine: ChartDataset<'line', GeoDefaultDataPoint<'line'>> = {
      label,
      data: [],
    };

    // If useSteps is defined, set it for each dataset
    if (chartConfig.geochart.useSteps) theDatasetLine.stepped = chartConfig.geochart.useSteps;

    // If tension is defined, set it for each dataset
    if (chartConfig.geochart.tension) theDatasetLine.tension = chartConfig.geochart.tension;

    // Switch to generic type
    theDatasetGeneric = theDatasetLine as ChartDataset<TType, TData>;
  } else {
    // Switch to generic type, for all unspecific types, so typed to unknown first
    theDatasetGeneric = {
      label,
      data: [],
    } as unknown as ChartDataset<TType, TData>;
  }

  // Set the colors
  if (backgroundColor) theDatasetGeneric.backgroundColor = backgroundColor;
  if (borderColor) theDatasetGeneric.borderColor = borderColor;

  // If the border width is set (applies to all datasets the same)
  if (chartConfig.geochart.borderWidth) {
    theDatasetGeneric.borderWidth = chartConfig.geochart.borderWidth;
  }
  return theDatasetGeneric!;
}

/**
 * Creates all ChartDataset objects for line chart types, for ChartJS, based on the GeoChart configuration.
 * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
 * @param chartConfig  GeoChartConfig<TType> The GeoChart configuration
 * @param datasource GeoChartDatasource The datasource to read to create the datasets with
 * @param records TypeJsonObject[] The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
 * @returns The ChartData object containing the ChartDatasets
 */
function createDatasetsLineBar<
  TType extends ChartType = 'line' | 'bar',
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel extends string = string
>(chartConfig: GeoChartConfig<TType>, records: TypeJsonObject[]): ChartData<TType, TData, TLabel> {
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
    records.forEach((rec: TypeJsonObject) => {
      // Read the category as a string
      const catName = rec[chartConfig.category!.property] as string;

      // If new category
      if (!Object.keys(categoriesRead).includes(catName)) {
        // The colors to use
        const backgroundColor = getColorFromPalette(chartConfig.category!.paletteBackgrounds!, idx);
        const borderColor = getColorFromPalette(chartConfig.category!.paletteBorders!, idx);

        // Create dataset
        const newDataset = createDataset<TType, TData>(chartConfig, backgroundColor, borderColor, catName);
        categoriesRead[catName] = { index: idx++, data: newDataset.data };
        returnedChartData.datasets.push(newDataset);
      }

      // Parse data
      const dataParsed = createDataXYFormat<TType>(chartConfig, rec);

      // Find the data array and push in it.
      categoriesRead[catName].data.push(dataParsed);
    });
  } else {
    // 1 feature = 1 dataset
    // The colors to use
    const backgroundColor = getColorFromPalette(chartConfig.geochart.xAxis!.paletteBackgrounds!, 0);
    const borderColor = getColorFromPalette(chartConfig.geochart.xAxis!.paletteBorders!, 0);

    // Create dataset
    const newDataset = createDataset<TType, TData>(chartConfig, backgroundColor, borderColor, undefined);
    returnedChartData.datasets.push(newDataset);

    // For each record
    records.forEach((rec: TypeJsonObject) => {
      // Parse data
      const dataParsed = createDataXYFormat<TType>(chartConfig, rec);
      newDataset.data.push(dataParsed);
    });
  }

  // Done
  return returnedChartData;
}

/**
 * Creates all ChartDataset objects for line and bar chart types, for ChartJS, based on the GeoChart configuration.
 * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
 * @param chartConfig  GeoChartConfig<TType> The GeoChart configuration
 * @param datasource GeoChartDatasource The datasource to read to create the datasets with
 * @param records TypeJsonObject[] The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
 * @returns The ChartData object containing the ChartDatasets
 */
function createDatasetsPieDoughnut<
  TType extends ChartType = 'pie' | 'doughnut',
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel extends string = string
>(chartConfig: GeoChartConfig<TType>, records: TypeJsonObject[]): ChartData<TType, TData, TLabel> {
  // Transform the TypeFeatureJson data to ChartData<TType, TData, string>
  const returnedChartData: ChartData<TType, TData, TLabel> = {
    labels: [],
    datasets: [],
  };

  // For Pie and Doughnut, all values for x axis will go in labels
  records.forEach((rec: TypeJsonObject) => {
    // Read the value on x axis for each
    const valX: TLabel = rec[chartConfig.geochart.xAxis!.property] as string as TLabel;
    if (!returnedChartData.labels!.includes(valX)) returnedChartData.labels!.push(valX);
  });

  // Create a new color array of expected length
  const colorPaletteForAll: string[] = Array.from({ length: returnedChartData.labels!.length }, (_, paletteIndex: number) => {
    return getColorFromPalette(chartConfig.geochart.xAxis!.paletteBackgrounds, paletteIndex);
  });

  // If we categorize
  if (chartConfig.category?.property) {
    // 1 category = 1 dataset
    const categoriesRead: GeoChartCategoriesGroup<TData> = {};
    let idx = 0;
    records.forEach((rec: TypeJsonObject) => {
      // Read the category as a string
      const catName = rec[chartConfig.category!.property] as string;

      // If new category
      if (!Object.keys(categoriesRead).includes(catName)) {
        // The colors to use
        let borderColor;
        if (chartConfig.category!.paletteBorders) borderColor = getColorFromPalette(chartConfig.category!.paletteBorders!, idx);

        // Create dataset
        const newDataset = createDataset<TType, TData>(chartConfig, colorPaletteForAll, borderColor, catName);
        categoriesRead[catName] = { index: idx++, data: newDataset.data };
        returnedChartData.datasets.push(newDataset);
      }
    });

    // Now that each data is in its own category, compress it all for a pie/doughnut chart

    // For each dataset
    returnedChartData.datasets.forEach((chartDataset: ChartDataset<TType, TData>) => {
      // Compress the data for the ChartDataset
      const newData: TData = createDataCompressedForPieDoughnut(chartConfig, chartDataset, returnedChartData.labels!, records);

      // Find the data array and push in it.
      categoriesRead[chartDataset.label!].data.push(...newData);
    });
  } else {
    // 1 feature = 1 dataset
    // Create dataset
    const newDataset = createDataset<TType, TData>(chartConfig, colorPaletteForAll, undefined, undefined);
    returnedChartData.datasets.push(newDataset);

    // Compress the data for the ChartDataset
    const newData: TData = createDataCompressedForPieDoughnut(chartConfig, newDataset, returnedChartData.labels!, records);

    // Push the data
    newDataset.data.push(...newData);
  }

  // Done
  return returnedChartData;
}

/**
 * Creates all ChartDataset objects, for ChartJS, based on the GeoChart configuration.
 * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
 * @param chartConfig  GeoChartConfig<TType> The GeoChart configuration
 * @param datasource GeoChartDatasource The datasource to read to create the datasets with
 * @param records TypeJsonObject[] The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
 * @returns The ChartData object containing the ChartDatasets
 */
function createDatasets<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel extends string = string
>(chartConfig: GeoChartConfig<TType>, records: TypeJsonObject[]): ChartData<TType, TData, TLabel> {
  // Depending on the ChartType
  if (chartConfig.chart === 'line' || chartConfig.chart === 'bar') {
    return createDatasetsLineBar(chartConfig, records);
  }
  if (chartConfig.chart === 'pie' || chartConfig.chart === 'doughnut') {
    return createDatasetsPieDoughnut(chartConfig, records);
  }
  throw Error('Unsupported chart type');
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
 * @param chartConfig The GeoChart Inputs to use to build the ChartJS ingestable information.
 */
function createChartJSOptionsColorPalette<TType extends ChartType>(chartConfig: GeoChartConfig<TType>): void {
  // If there's a category
  if (chartConfig.category) {
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
  if (chartConfig.geochart.xAxis) {
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
 * Creates the ChartJS Options object necessary for ChartJS process.
 * @param chartConfig GeoChartConfig<TType>The GeoChart Inputs to use to build the ChartJS ingestable information.
 * @param defaultOptions ChartOptions<TType>The default, basic, necessary Options for ChartJS.
 * @param language string The current language of the UI.
 * @returns The ChartJS ingestable Options properties
 */
export function createChartJSOptions<TType extends ChartType>(
  chartConfig: GeoChartConfig<TType>,
  defaultOptions: ChartOptions<TType>,
  language: string
): ChartOptions<TType> {
  // The Chart JS Options as entered or the default options
  const options = (chartConfig.chartjsOptions || { ...defaultOptions }) as ChartOptions<TType>;

  // Verify the color palette is alright
  createChartJSOptionsColorPalette(chartConfig);

  // If line and using a time series
  if (chartConfig.chart === 'line' && chartConfig.geochart.xAxis?.type === 'time') {
    const optionsLine = options as ChartOptions<'line'>;
    optionsLine.scales = {
      ...optionsLine.scales,
      x: {
        type: 'time',
        ticks: {
          major: {
            enabled: true,
          },
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
      },
    };
  }

  // If line and using a time series
  if ((chartConfig.chart === 'line' || chartConfig.chart === 'bar') && chartConfig.geochart.yAxis?.type) {
    const optionsLine = options as ChartOptions<'line' | 'bar'>;
    optionsLine.scales = {
      ...optionsLine.scales,
      y: {
        type: chartConfig.geochart.yAxis?.type,
      },
    };
  }

  // Return the ChartJS Options
  return options;
}

/**
 * Creates the ChartJS Data object necessary for ChartJS process.
 * When the xAxis reprensents time, the datasets are sorted by date.
 * @param chartConfig GeoChartConfig<TType>The GeoChart Inputs to use to build the ChartJS ingestable information.
 * @param records TypeJsonObject[] | undefined The Records to build the data from.
 * @param defaultData ChartData<TType, TData, TLabel>The default, basic, necessary Data for ChartJS.
 * @returns The ChartJS ingestable Data properties
 */
export function createChartJSData<
  TType extends ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel extends string = string
>(
  chartConfig: GeoChartConfig<TType>,
  records: TypeJsonObject[] | undefined,
  defaultData: ChartData<TType, TData, TLabel>
): ChartData<TType, TData, TLabel> {
  // If there's a data source, parse it to a GeoChart data
  let data: ChartData<TType, TData, TLabel> = { ...defaultData };
  if (records && records.length > 0) {
    data = createDatasets(chartConfig, records);
  }

  // If the x axis type is time
  if (chartConfig.geochart.xAxis?.type === 'time') {
    // Make sure the datasets data are sorted on X
    sortOnX(data.datasets);
  }

  // GeoChart Parsed information
  return data;
}
