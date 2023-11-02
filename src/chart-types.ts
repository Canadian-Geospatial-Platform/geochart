import { ChartType, ChartOptions, ChartTypeRegistry } from 'chart.js';
import { DistributiveArray } from 'chart.js/dist/types/utils';
import { extractColor } from './chart-util';

// Export all ChartJS types
export type * from 'chart.js';

// Simulate the types in cgpv
// TODO: Refactor - Think about it, should I fetch cgpv even in ts classes to get the type?
export type TypeJsonValue = null | string | number | boolean | TypeJsonObject[] | { [key: string]: TypeJsonObject };
export type TypeJsonObject = TypeJsonValue & { [key: string]: TypeJsonObject };

/**
 * The Main GeoChart Configuration used by the GeoChart Component
 */
export type GeoChartConfig<TType extends ChartType> = GeoChartOptions<TType> & {
  chartjsOptions: ChartOptions<ChartType>;
};

/**
 * The Main GeoChart Options Configuration used by the GeoChart Component
 */
export type GeoChartOptions<TType extends ChartType> = {
  chart: TType;
  title: string;
  category?: GeoChartCategory;
  datasources: GeoChartDatasource[];
  geochart: {
    borderWidth?: number;
    useSteps?: 'before' | 'after' | 'middle' | boolean;
    tension?: number;
    xSlider?: GeoChartOptionsSlider;
    ySlider?: GeoChartOptionsSlider;
    xAxis?: GeoChartOptionsAxis;
    yAxis?: GeoChartOptionsAxis;
  };
};

/**
 * The Configuration about using Category (aka Classification) on the Datasources.
 */
export type GeoChartCategory = {
  property: string;
  usePalette?: boolean;
  // In the case of a line or bar chart, the palette is always specified. For a pie or doughnut, this might be unspecified for UI looks reasons.
  palette_backgrounds?: string[];
  // In the case of a line or bar chart, the palette is always specified. For a pie or doughnut, this might be unspecified for UI looks reasons.
  palette_borders?: string[];
};

/**
 * The Datasource object to hold the data, as supported by GeoChart.
 */
export type GeoChartDatasource = {
  value?: string;
  display: string;
  sourceItem?: unknown; // Associated source item, mainly useful for lazing loading
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
 * Options for the Slider component
 */
export type GeoChartOptionsSlider = {
  display?: boolean;
  min?: number;
  max?: number;
  value?: number | number[];
  track?: 'normal' | 'inverted' | false;
};

/**
 * Options for the Slider Axis component
 */
export type GeoChartOptionsAxis = {
  type: 'linear' | 'logarithmic' | 'category' | 'time' | 'timeseries' | 'radialLinear' | undefined;
  property: string;
  usePalette?: boolean;
  palette_backgrounds: string[];
  palette_borders: string[];
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
 * The default color palette that ChartJS uses (I couldn't easily find out where that const is stored within ChartJS)
 */
export const DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT: string[] = [
  'rgba(54, 162, 235, 0.5)',
  'rgba(255, 99, 132, 0.5)',
  'rgba(75, 192, 192, 0.5)',
  'rgba(255, 159, 64, 0.5)',
  'rgba(153, 102, 255, 0.5)',
  'rgba(255, 205, 86, 0.5)',
  'rgba(201, 203, 207, 0.5)',
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
