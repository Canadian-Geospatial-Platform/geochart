import { ChartType, ChartOptions, ChartTypeRegistry, GridLineOptions } from 'chart.js';
import { DistributiveArray } from 'chart.js/dist/types/utils';

// Export all ChartJS types
export type * from 'chart.js';

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
  format?: string;
  whereClauses?: GeoChartQueryOptionClause[];
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
  usePalette?: boolean; // TODO: Think about removing this parameter maybe?
  // In the case of a line or bar chart, the palette is always specified. For a pie or doughnut, this might be unspecified for UI looks reasons.
  paletteBackgrounds?: string[];
  // In the case of a line or bar chart, the palette is always specified. For a pie or doughnut, this might be unspecified for UI looks reasons.
  paletteBorders?: string[];
};

/**
 * The steps possibilities explicitely typed.
 */
export const StepsPossibilitiesConst = ['before', 'after', 'middle', false] as const;
export type StepsPossibility = (typeof StepsPossibilitiesConst)[number];

/**
 * Type guard that checks whether a given value is an array of valid `StepsPossibility` values.
 * This is used to validate that a value (typically external input or config) conforms to
 * the list of supported steps types used in charts (e.g., 'before', 'after', etc.).
 * @param {unknown} value - The value to validate.
 * @returns {value is StepsPossibility[]} `true` if the value is an array of valid `StepsPossibility` strings; otherwise `false`.
 */
export const isStepPossibilityArray = (value: unknown): value is StepsPossibility[] => {
  return Array.isArray(value) && value.every((v) => StepsPossibilitiesConst.includes(v as StepsPossibility));
};

/**
 * The scales possibilities explicitely typed.
 */
export const ScalePossibilitiesConst = ['linear', 'logarithmic', 'category', 'time', 'timeseries'] as const;
export type ScalePossibility = (typeof ScalePossibilitiesConst)[number];

/**
 * Type guard that checks whether a given value is an array of valid `ScalePossibility` values.
 * This is used to validate that a value (typically external input or config) conforms to
 * the list of supported scale types used in charts (e.g., 'linear', 'logarithmic', etc.).
 * @param {unknown} value - The value to validate.
 * @returns {value is ScalePossibility[]} `true` if the value is an array of valid `ScalePossibility` strings; otherwise `false`.
 */
export const isScalePossibilityArray = (value: unknown): value is ScalePossibility[] => {
  return Array.isArray(value) && value.every((v) => ScalePossibilitiesConst.includes(v as ScalePossibility));
};

/**
 * The Configuration about using GeoChart specific parameters.
 */
export type GeoChartOptionsGeochart = {
  xAxis: GeoChartOptionsAxis;
  yAxis: GeoChartOptionsAxis;
  borderWidth?: number;
  useSteps?: StepsPossibility;
  tension?: number;
};

/**
 * The Configuration about using UI specific parameters.
 */
export type GeoChartOptionsUI = {
  xSlider?: GeoChartOptionsSlider;
  ySlider?: GeoChartOptionsSlider;
  stepsSwitcher?: boolean | StepsPossibility[];
  scalesSwitcher?: boolean | ScalePossibility[];
  resetStates?: boolean;
  description?: string;
  download?: boolean;
};

/**
 * The Datasource object to hold the data, as supported by GeoChart.
 */
export type GeoChartDatasource = {
  display: string;
  sourceItem?: Record<string, unknown>; // Associated source item linking back to the source of the data
  value?: string;
  items?: Record<string, unknown>[];
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
  ticksRule?: 'data' | 'auto' | 'labels';
  timeFormat?: string | Record<string, string>;
  timeIANA?: string;
  grid?: Partial<GridLineOptions>;
  label?: string;
  usePalette?: boolean; // TODO: Think about removing this parameter maybe?
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
  x: unknown;
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
