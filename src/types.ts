import { ChartType, ChartOptions, ChartTypeRegistry } from 'chart.js';
import { DistributiveArray } from 'chart.js/dist/types/utils';
import { extractColor } from './utils';

// Export all ChartJS types
export type * from 'chart.js';

// Simulate the types in cgpv
// TODO: Refactor - Think about it, do we fetch cgpv, even in '.ts' classes!?
export type TypeJsonValue = null | string | number | boolean | TypeJsonObject[] | { [key: string]: TypeJsonObject };
export type TypeJsonObject = TypeJsonValue & { [key: string]: TypeJsonObject };

/**
 * The Main GeoChart Configuration used by the GeoChart Component
 */
export type GeoChartConfig<TType extends ChartType> = {
  chart: TType;
  geochart: GeoChartOptionsGeochart;
  datasources: GeoChartDatasource[];
  title?: string;
  query?: GeoChartQuery;
  category?: GeoChartCategory;
  ui?: GeoChartOptionsUI;
  chartjsOptions?: ChartOptions<TType>;
};

/**
 * Definition of query parameters used to fetch further information to build the Datasources
 */
export const GeoChartQueryTypesConst = ['esriRegular', 'ogcAPIFeatures', 'json'] as const;
export type GeoChartQueryTypes = (typeof GeoChartQueryTypesConst)[number];
export type GeoChartQuery = {
  type: GeoChartQueryTypes;
  url: string;
  queryOptions?: GeoChartQueryOption;
};

/**
 * The Options to query a layer
 */
export type GeoChartQueryOption = {
  whereClauses: GeoChartQueryOptionClause[];
  orderByField?: string;
};

/**
 * The Options to create a where clause to query a layer
 */
export type GeoChartQueryOptionClause = {
  field: string;
  valueFrom?: string;
  valueIs?: string;
  prefix?: string;
  suffix?: string;
};

/**
 * The Configuration about using Category (aka Classification) on the Datasources.
 */
export type GeoChartCategory = {
  property: string;
  usePalette?: boolean;
  // In the case of a line or bar chart, the palette is always specified. For a pie or doughnut, this might be unspecified for UI looks reasons.
  paletteBackgrounds?: string[];
  // In the case of a line or bar chart, the palette is always specified. For a pie or doughnut, this might be unspecified for UI looks reasons.
  paletteBorders?: string[];
};

/**
 * The steps possibilities explicitely typed.
 */
export const StepsPossibilitiesConst = ['before', 'after', 'middle', false] as const;
export type StepsPossibilities = (typeof StepsPossibilitiesConst)[number];

/**
 * The Configuration about using GeoChart specific parameters.
 */
export type GeoChartOptionsGeochart = {
  xAxis: GeoChartOptionsAxis;
  yAxis: GeoChartOptionsAxis;
  borderWidth?: number;
  useSteps?: StepsPossibilities;
  tension?: number;
};

/**
 * The Configuration about using UI specific parameters.
 */
export type GeoChartOptionsUI = {
  xSlider?: GeoChartOptionsSlider;
  ySlider?: GeoChartOptionsSlider;
  stepsSwitcher?: boolean;
  resetStates?: boolean;
  description?: string;
  download?: boolean;
};

/**
 * The Datasource object to hold the data, as supported by GeoChart.
 */
export type GeoChartDatasource = {
  display: string;
  sourceItem?: TypeJsonObject; // Associated source item linking back to the source of the data
  value?: string;
  items?: TypeJsonObject[];
};

/**
 * The Categories when loading the Datasources.
 */
export type GeoChartCategoriesGroup<TData> = {
  [catValue: string]: GeoChartCategoryGroup<TData>;
};

/**
 * The Category when loading the Datasources.
 */
export type GeoChartCategoryGroup<TData> = {
  index: number;
  data: TData;
};

/**
 * The default colors to assign to the chart.
 */
export type GeoChartDefaultColors = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

/**
 * Options for the Slider Axis component
 */
export type GeoChartOptionsAxis = {
  property: string;
  type?: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries';
  label?: string;
  usePalette?: boolean;
  paletteBackgrounds?: string[];
  paletteBorders?: string[];
  tooltipSuffix?: string;
};

/**
 * Options for the Slider component
 */
export type GeoChartOptionsSlider = {
  display?: boolean;
  step?: number;
  min?: number;
  max?: number;
};

/**
 * An X, Y pair to be used in the Chart Data. Not redirecting to the DefaultDataPoint type, because the latter
 * points to a ScatterDataPoint which is only supporting x: number and y: number, which isn't try for us with the Date support on the x property.
 */
export type GeoChartXYData = {
  x: string | number | Date | unknown;
  y: number;
};

/**
 * Extending the DefaultDataPoint, because we support more than just x:number, y:number. Notably with the dates.
 */
export type GeoDefaultDataPoint<TType extends ChartType> = DistributiveArray<ChartTypeRegistry[TType]['defaultDataPoint'] | GeoChartXYData>;
// TODO: Refactor - Low priority - Try to push down the support of the Dates into the ChartJS ChartTypeRegistry thing, instead of bypassing the support by extending with a GeoChartXYPair type

/**
 * Indicates an action to be performed by the Chart.
 * Special type that allows the child component a accept a 'todo action' via props and reset the prop value without the parent being notified.
 * This is essentially to simplify the setTimeout handling to be managed inside the Chart component instead of higher in the application.
 */
export type GeoChartAction = {
  shouldRedraw?: boolean;
};

/**
 * Helper type to work with the Datasets and their states.
 */
export type GeoChartDatasetOption = {
  visible: boolean;
  checked: boolean;
  borderColor: string;
  backgroundColor: string;
};

/**
 * Helper type to work with the Datasets.
 */
export type GeoChartSelectedDataset = {
  [label: string]: GeoChartDatasetOption;
};

/**
 * The default color palette that ChartJS uses (I couldn't easily find out where that const is stored within ChartJS)
 */
export const DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT: string[] = [
  'rgba(54, 162, 235, 0.5)', // light blue
  'rgba(255, 99, 132, 0.5)', // light red
  'rgba(75, 192, 192, 0.5)', // light green
  'rgba(255, 159, 64, 0.5)', // light orange
  'rgba(153, 102, 255, 0.5)', // light purple
  'rgba(255, 205, 86, 0.5)', // light yellow
  'rgba(201, 203, 207, 0.5)', // light gray
  'rgba(0, 0, 255, 0.5)', // blue
  'rgba(0, 255, 0, 0.5)', // green
  'rgba(255, 0, 0, 0.5)', // red
  'rgba(255, 150, 0, 0.5)', // orange
  'rgba(255, 0, 255, 0.5)', // pink
  'rgba(30, 219, 34, 0.5)', // lime green
  'rgba(190, 0, 190, 0.5)', // purple
  'rgba(132, 255, 255, 0.5)', // cyan
  'rgba(255, 250, 0, 0.5)', // yellow
  'rgba(128, 0, 128, 0.5)', // maroon
  'rgba(0, 128, 128, 0.5)', // teal
  'rgba(128, 128, 0, 0.5)', // olive
  'rgba(128, 128, 128, 0.5)', // gray
];

/**
 * The default color palette that ChartJS uses (I couldn't easily find out where that const is stored within ChartJS)
 */
export const DEFAULT_COLOR_PALETTE_CHARTJS_OPAQUE: string[] = DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT.map((color: string) => {
  // Extract the alpha-less color code for better output
  return extractColor(color)!;
});

/**
 * The default color palette to be used for backgrounds when no color palette is specified
 */
export const DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT: string[] = [
  'rgba(0, 0, 255, 0.5)', // blue
  'rgba(0, 255, 0, 0.5)', // green
  'rgba(255, 0, 0, 0.5)', // red
  'rgba(255, 150, 0, 0.5)', // orange
  'rgba(255, 0, 255, 0.5)', // pink
  'rgba(30, 219, 34, 0.5)', // lime green
  'rgba(190, 0, 190, 0.5)', // purple
  'rgba(132, 255, 255, 0.5)', // cyan
  'rgba(255, 250, 0, 0.5)', // yellow
];

/**
 * The default color palette to be used when no color palette is specified
 */
export const DEFAULT_COLOR_PALETTE_CUSTOM_OPAQUE: string[] = DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT.map((color: string) => {
  // Extract the alpha-less color code for better output
  return extractColor(color)!;
});

/**
 * The alternate color palette to be used when no alternate color palette is specified, used for pie and doughnut charts
 */
export const DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT: string[] = [
  'rgba(30, 219, 34, 0.5)', // lime green
  'rgba(190, 0, 190, 0.5)', // purple
  'rgba(255, 150, 0, 0.5)', // orange
  'rgba(0, 0, 255, 0.5)', // blue
  'rgba(132, 255, 255, 0.5)', // cyan
  'rgba(255, 0, 255, 0.5)', // pink
  'rgba(0, 255, 0, 0.5)', // green
  'rgba(255, 150, 75, 0.5)', // bisque
];

/**
 * The alternate color palette to be used when no alternate color palette is specified, used for pie and doughnut charts
 */
export const DEFAULT_COLOR_PALETTE_CUSTOM_ALT_OPAQUE: string[] = DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT.map((color: string) => {
  // Extract the alpha-less color code for better output
  return extractColor(color)!;
});

/**
 * The date formatting to show the dates on the Axis.
 */
export const DATE_OPTIONS_AXIS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
};

/**
 * The date formatting to show the dates on Slider.
 */
export const DATE_OPTIONS_LONG: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};
