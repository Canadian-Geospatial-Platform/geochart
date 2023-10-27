import { ChartType, ChartData, ChartDataset, ChartOptions } from 'chart.js';
import {
  GeoChartConfig,
  GeoChartXYData,
  GeoDefaultDataPoint,
  GeoChartDatasource,
  TypeJsonObject,
  DEFAULT_COLOR_PALETTE,
  GeoChartCategories,
} from './chart-types';

export const isNumber = (val: unknown): boolean => {
  return typeof val === 'number' && !Number.isNaN(val);
};

/**
 * Sorts all ChartDatasets based on the X values of their data.
 * @param datasets ChartDataset<TType, TData>[] the array of ChartDataset that we each want to sort on their X value.
 */
function sortOnX<TType extends ChartType, TData = GeoDefaultDataPoint<TType>>(datasets: ChartDataset<TType, TData>[]): void {
  // For each dataset
  datasets.forEach((ds: ChartDataset<TType, TData>) => {
    const dataInDataset = ds.data as { x: number | Date }[];
    const dataOrdered = dataInDataset.sort((a: { x: number | Date }, b: { x: number | Date }) => {
      if (a.x instanceof Date) {
        if ((a.x as Date) === (b.x as Date)) return 0;
        if ((a.x as Date) < (b.x as Date)) return -1;
        return 1;
      }
      return (a.x as number) - (b.x as number);
    });

    // Replace
    // eslint-disable-next-line no-param-reassign
    ds.data = dataOrdered as TData;
  });
}

/**
 * Create a GeoChartXYData data value by reading attributes from a TypeJsonObject.
 * The GeoChartXYData has x and y properties and functions similar to the DefaultDataPoint, like ChartJS supports, but with additional
 * support of Dates on the 'x' property.
 * @param chartConfig GeoChartConfig<TType> The GeoChart configuration
 * @param attributes TypeJsonObject The data opbject containing the attributes to use to create the GeoChartXYData
 * @returns The GeoChartXYData object
 */
function createDataXYFormat<TType extends ChartType>(chartConfig: GeoChartConfig<TType>, attributes: TypeJsonObject): GeoChartXYData {
  // Read the value in x
  const valRawX: unknown = attributes[chartConfig.geochart.xAxis!.property];

  // If the value is expected to be a time
  let xVal: number | Date | string | unknown = valRawX;
  if (chartConfig.geochart.xAxis?.type === 'time') {
    // Create a date!
    if (valRawX instanceof Date) xVal = valRawX as Date;
    if (isNumber(valRawX)) xVal = new Date(valRawX as number);
    // if (!xVal) throw Error('Unsupported date for x axis');
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
 * Create a ChartDataset object, for ChartJS, based on the GeoChart configuration.
 * @param chartConfig GeoChartConfig<TType> The GeoChart configuration
 * @param creationIndex number The index of the ChartDataset being created (used for the loop in 'createDtasets')
 * @param label string The ChartDataset label
 * @param attributes TypeJsonObject All attributes to use for the ChartDataset
 * @returns The ChartDataset object
 */
function createDataset<TType extends ChartType, TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>>(
  chartConfig: GeoChartConfig<TType>,
  creationIndex: number,
  label?: string,
  attributes?: TypeJsonObject
): ChartDataset<TType, TData> {
  // Transform the TypeFeatureJson data to ChartDataset<TType, TData>
  const theDataset: ChartDataset<TType, TData> = {
    label,
    data: [],
  } as unknown as ChartDataset<TType, TData>;
  // TODO: Work on removing the unknown typing here by supporting other charts

  // If building a line chart and useSteps is defined, set it for each dataset
  if (chartConfig.chart === 'line' && chartConfig.geochart.useSteps) {
    (theDataset as ChartDataset<'line', TData>).stepped = chartConfig.geochart.useSteps;
  }

  if (chartConfig.chart === 'line' || chartConfig.chart === 'bar') {
    if (chartConfig.geochart.featuresUsePalette) {
      theDataset.backgroundColor = chartConfig.geochart.color_palette![creationIndex % chartConfig.geochart.color_palette!.length];
      if (chartConfig.chart === 'line') {
        theDataset.borderColor = chartConfig.geochart.color_palette![creationIndex % chartConfig.geochart.color_palette!.length];
      }
    }
  }

  if (attributes && chartConfig.geochart.labelsAreColors && chartConfig.geochart.xAxis?.property) {
    const labelColors = (attributes[chartConfig.geochart.xAxis!.property || 'label'] as string).split(';').map((x) => {
      return x.toLowerCase();
    });
    // If labels are colors
    theDataset.backgroundColor = labelColors;
    if (chartConfig.chart === 'line') {
      (theDataset as ChartDataset<'line', TData>).pointBackgroundColor = labelColors;
      (theDataset as ChartDataset<'line', TData>).pointBorderColor = labelColors;
    }
  }
  return theDataset;
}

/**
 * Create all ChartDataset objects, for ChartJS, based on the GeoChart configuration.
 * This function supports various on-the-fly formatting such as the chart config 'category' and the datasource 'compressed' format.
 * @param chartConfig  GeoChartConfig<TType> The GeoChart configuration
 * @param datasource GeoChartDatasource The datasource to read to create the datasets with
 * @param records TypeJsonObject[] The records within the dataset. It's a distinct argument than the datasource one, because of on-the-fly filterings with the sliders.
 * @returns The ChartData object containing the ChartDatasets
 */
function createDatasets<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string
>(chartConfig: GeoChartConfig<TType>, datasource: GeoChartDatasource, records: TypeJsonObject[]): ChartData<TType, TData, TLabel> {
  // Transform the TypeFeatureJson data to ChartData<TType, TData, string>
  const result: ChartData<TType, TData, TLabel> = {
    labels: [],
    datasets: [],
  };

  // If special case of datasource format
  if (datasource.format === 'compressed') {
    // 1 feature = 1 dataset, but each feature has more than 1 attribute/value
    records.forEach((item: TypeJsonObject, idx: number) => {
      const newDataset = createDataset<TType, TData>(chartConfig, idx, `Feature ${idx + 1}`, undefined);
      result.datasets.push(newDataset);

      // Read the value as string to split on it
      (item[chartConfig.geochart.yAxis?.property || 'data'] as string)
        .split(';')
        .map(Number)
        .forEach((x: number) => {
          newDataset.data.push(x);
        });
    });

    // If have prop label
    if (chartConfig.geochart.xAxis?.property && chartConfig.geochart.xAxis!.property in records[0])
      result.labels = (records[0][chartConfig.geochart.xAxis!.property] as string).split(';') as TLabel[];
  } else {
    // Regular case with attributes
    // If we categorize
    // eslint-disable-next-line no-lonely-if
    if (chartConfig.category) {
      // 1 category = 1 dataset
      const categoriesRead: GeoChartCategories<TData> = {};
      let idx = 0;
      records.forEach((item: TypeJsonObject) => {
        // Read the category as a string
        const cat = item[chartConfig.category] as string;

        // If new category
        if (!Object.keys(categoriesRead).includes(cat)) {
          // Create dataset
          const newDataset = createDataset<TType, TData>(chartConfig, idx, cat, item);
          categoriesRead[cat] = { index: idx++, data: newDataset.data };
          result.datasets.push(newDataset);
        }

        // Parse data
        const dataParsed = createDataXYFormat<TType>(chartConfig, item);

        // Find the data array and push in it.
        categoriesRead[cat].data.push(dataParsed);
      });
    } else {
      // all features = 1 dataset
      // Create dataset
      const newDataset = createDataset<TType, TData>(chartConfig, 0, 'ALL', undefined);
      result.datasets.push(newDataset);

      records.forEach((item: TypeJsonObject) => {
        // Parse data
        const dataParsed = createDataXYFormat<TType>(chartConfig, item);
        newDataset.data.push(dataParsed);
      });
    }
  }

  // Return result
  return result!;
}

/**
 * Creates the ChartJS Options object necessary for ChartJS process.
 * @param chartConfig The GeoChart Inputs to use to build the ChartJS ingestable information.
 * @param defaultOptions The default, basic, necessary Options for ChartJS.
 * @returns The ChartJS ingestable Options properties
 */
export function createChartJSOptions<TType extends ChartType>(
  chartConfig: GeoChartConfig<TType>,
  defaultOptions: ChartOptions<TType>
): ChartOptions<TType> {
  // The Chart JS Options as entered or the default options
  const options = (chartConfig.chartjsOptions || { ...defaultOptions }) as ChartOptions<TType>;

  // If no palette was specified, use the default
  // eslint-disable-next-line no-param-reassign
  if (!chartConfig.geochart.color_palette) chartConfig.geochart.color_palette = DEFAULT_COLOR_PALETTE;

  // If line and using a time series
  if (chartConfig.chart === 'line' && chartConfig.geochart.xAxis?.type === 'time') {
    (options as ChartOptions<'line'>).scales = {
      x: {
        type: 'time',
        ticks: {
          major: {
            enabled: true,
          },
          source: 'auto',
          // // eslint-disable-next-line @typescript-eslint/no-unused-vars
          // callback: (tickValue: number | Date | string, index: number, ticks: unknown[]): string => {
          //   // Hide every 2nd tick label

          //   // Make it a date
          //   const d = new Date(tickValue).getMonth();
          //   return d.toString();
          // },
        },
      },
    };
  }

  // Return the ChartJS Options
  return options;
}

/**
 * Creates the ChartJS Data object necessary for ChartJS process.
 * @param chartConfig The GeoChart Inputs to use to build the ChartJS ingestable information.
 * @param records The Records to build the data from.
 * @param defaultData The default, basic, necessary Data for ChartJS.
 * @returns The ChartJS ingestable Data properties
 */
export function createChartJSData<
  TType extends ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string
>(
  chartConfig: GeoChartConfig<TType>,
  datasource: GeoChartDatasource,
  records: TypeJsonObject[],
  defaultData: ChartData<TType, TData, TLabel>
): ChartData<TType, TData, TLabel> {
  // If there's a data source, parse it to a GeoChart data
  let data: ChartData<TType, TData, TLabel> = { ...defaultData };
  if (records && records.length > 0) {
    data = createDatasets(chartConfig, datasource, records);
  }

  // If the x axis type is time
  if (chartConfig.geochart.xAxis?.type === 'time') {
    // Make sure the data is sorted on X
    sortOnX(data.datasets);
  }

  // GeoChart Parsed information
  return data;
}
