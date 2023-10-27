import { ChartType, ChartOptions, ChartTypeRegistry } from 'chart.js';
import { DistributiveArray } from 'chart.js/dist/types/utils';

// Export all types higher
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
  category: string;
  datasources: GeoChartDatasource[];
  geochart: {
    color_palette?: string[];
    featuresUsePalette?: boolean;
    labelsAreColors?: boolean;
    useSteps?: 'before' | 'after' | 'middle' | boolean;
    xSlider?: GeoChartOptionsSlider;
    ySlider?: GeoChartOptionsSlider;
    xAxis?: GeoChartOptionsAxis;
    yAxis?: GeoChartOptionsAxis;
  };
};

/**
 * The Datasource object to hold the data, as supported by GeoChart.
 */
export type GeoChartDatasource = {
  display: string;
  value?: string;
  format?: 'compressed'; // Support other formats here eventually
  items: TypeJsonObject[];
};

/**
 * The Categories when loading the Datasources.
 */
export type GeoChartCategories<TData> = {
  [k: string]: GeoChartCategory<TData>;
};

/**
 * The Category when loading the Datasources.
 */
export type GeoChartCategory<TData> = {
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
// TODO: Refactor - Try to push down the support of the Dates into the ChartJS ChartTypeRegistry thing, instead of bypassing the support by extending with a GeoChartXYPair type

/**
 * Indicates an action to be performed by the Chart.
 * Special type that allows the child component a accept a 'todo action' via props and reset the prop value without the parent being notified.
 * This is essentially to simplify the setTimeout handling to be managed inside the Chart component instead of higher in the application.
 */
export type GeoChartAction = {
  shouldRedraw?: boolean;
};

/**
 * The default color palette to be used when no color palette is specified
 */
export const DEFAULT_COLOR_PALETTE: string[] = ['orange', 'lightblue', 'green', 'pink', 'bisque', 'limegreen', 'hotpink', 'purple'];
