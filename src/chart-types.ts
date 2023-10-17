import { ChartType, ChartData, ChartDataset, ChartOptions, DefaultDataPoint } from 'chart.js';

export type GeoChartType = ChartType;

/**
 * Extends the ChartData used by Chart.js and represents the whole Data to be displayed in the Chart
 */
export interface GeoChartData<TType extends GeoChartType = GeoChartType, TData = DefaultDataPoint<TType>, TLabel = string>
  extends ChartData<TType, TData, TLabel> {}

/**
 * Represents a Dataset to be shown in the Chart
 */
export type GeoChartDataset<TType extends GeoChartType = GeoChartType, TData = DefaultDataPoint<TType>> = ChartDataset<TType, TData>;

/**
 * Indicates an action to be performed by the Chart.
 * Special type that allows the child component a accept a 'todo action' via props and reset the prop value without the parent being notified.
 * This is essentially to simplify the setTimeout handling to be managed inside the Chart component instead of higher in the application.
 */
export type GeoChartAction = {
  shouldRedraw?: boolean;
};

/**
 * Extends the ChartOptions used by Chart.js with more 'GeoChart' options
 */
export interface GeoChartOptions extends ChartOptions<GeoChartType> {
  geochart: {
    chart: GeoChartType;
    xSlider?: GeoChartOptionsSlider;
    ySlider?: GeoChartOptionsSlider;
    xAxis?: GeoChartOptionsAxis;
    yAxis?: GeoChartOptionsAxis;
  };
}

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
  display: boolean;
  min: number;
  max: number;
  value: number;
  track: 'normal' | 'inverted' | false;
};

/**
 * Options for the Slider Axis component
 */
export type GeoChartOptionsAxis = {
  type: string;
};
