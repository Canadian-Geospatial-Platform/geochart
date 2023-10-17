import { Box } from '@mui/material';
import { Chart as ChartJS, ChartData, ChartOptions, DefaultDataPoint } from 'chart.js';
import { GeoChartOptions, GeoChartType, GeoChartData, GeoChartDefaultColors } from './chart-types';
import { ChartValidator, ValidatorResult } from './chart-validator';
import { ChartDoughnut } from './charts/chart-doughnut';
import { ChartBarsVertical } from './charts/chart-bars-vertical';
import { ChartPie } from './charts/chart-pie';
import { ChartLine } from './charts/chart-line';
import styles from './chart.module.css';

/**
 * Main props for the Chart
 */
export interface TypeChartChartProps<TType extends GeoChartType> {
  style?: unknown;
  defaultColors?: GeoChartDefaultColors;
  data?: GeoChartData<TType>;
  options?: GeoChartOptions;
  redraw?: boolean;
  handleSliderXChanged?: (value: number | number[]) => void;
  handleSliderYChanged?: (value: number | number[]) => void;
  handleError?: (dataErrors: ValidatorResult, optionsErrors: ValidatorResult) => void;
}

/**
 * Create a customized Chart UI
 *
 * @param {TypeChartChartProps} props the properties passed to the Chart element
 * @returns {JSX.Element} the created Chart element
 */
export function Chart(props: TypeChartChartProps<GeoChartType>): JSX.Element {
  // Fetch cgpv
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { CSSProperties } = cgpv.react;
  const { Slider } = cgpv.ui.elements;
  const { style: elStyle, data, options: elOptions, redraw } = props;

  // Cast the style
  const style = elStyle as typeof CSSProperties;

  // Attribute the default colors
  if (props.defaultColors?.backgroundColor) ChartJS.defaults.backgroundColor = props.defaultColors?.backgroundColor;
  if (props.defaultColors?.borderColor) ChartJS.defaults.borderColor = props.defaultColors?.borderColor;
  if (props.defaultColors?.color) ChartJS.defaults.color = props.defaultColors?.color;

  // Merge default options
  const options: GeoChartOptions = { ...Chart.defaultProps.options, ...elOptions } as GeoChartOptions;

  // If options and data are specified
  if (options && data) {
    // Validate the data and options as received
    const validator = new ChartValidator();
    const resOptions: ValidatorResult = validator.validateOptions(options);
    const resData: ValidatorResult = validator.validateData(data);

    // If any errors
    if (!resOptions.valid || !resData.valid) {
      // If a callback is defined
      if (props.handleError) props.handleError(resData, resOptions);
      else console.error(resData, resOptions);
    }
  }

  const handleSliderXChange = (value: number | number[]) => {
    // If callback set
    if (props.handleSliderXChanged) {
      props.handleSliderXChanged!(value);
    }
  };

  const handleSliderYChange = (value: number | number[]) => {
    // If callback set
    if (props.handleSliderYChanged) {
      props.handleSliderYChanged!(value);
    }
  };

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    // Depending on the type of chart
    switch (options!.geochart.chart) {
      case 'bar':
        // Vertical Bars Chart
        return (
          <ChartBarsVertical
            type="bar"
            data={data as ChartData<'bar', DefaultDataPoint<'bar'>, string>}
            options={options as ChartOptions<'bar'>}
            redraw={redraw}
          />
        );

      case 'pie':
        // Pie Chart
        return (
          <ChartPie
            type="pie"
            data={data as ChartData<'pie', DefaultDataPoint<'pie'>, string>}
            options={options as ChartOptions<'pie'>}
            redraw={redraw}
          />
        );

      case 'doughnut':
        // Doughnut Chart
        return (
          <ChartDoughnut
            type="doughnut"
            data={data as ChartData<'doughnut', number[], string>}
            options={options as ChartOptions<'doughnut'>}
            redraw={redraw}
          />
        );

      default:
        // Line Chart is default
        return (
          <ChartLine
            type="line"
            data={data as ChartData<'line', DefaultDataPoint<'line'>, string>}
            options={options as ChartOptions<'line'>}
            redraw={redraw}
          />
        );
    }
  };

  /**
   * Renders the X Chart Slider JSX.Element or an empty div
   * @returns The X Chart Slider JSX.Element or an empty div
   */
  const renderXSlider = (): JSX.Element => {
    const { xSlider } = options!.geochart;
    if (xSlider?.display) {
      return (
        <Box sx={{ height: '100%' }}>
          <Slider
            sliderId="sliderHorizontal"
            min={xSlider.min || 0}
            max={xSlider.max || 100}
            value={xSlider.value || 0}
            track={xSlider.track || false}
            customOnChange={handleSliderXChange}
          />
        </Box>
      );
    }
    // None
    return <div />;
  };

  /**
   * Renders the Y Chart Slider JSX.Element or an empty div
   * @returns The Y Chart Slider JSX.Element or an empty div
   */
  const renderYSlider = (): JSX.Element => {
    const { ySlider } = options!.geochart;
    if (ySlider?.display) {
      return (
        <Box sx={{ height: '100%' }}>
          <Slider
            sliderId="sliderVertical"
            min={ySlider.min || 0}
            max={ySlider.max || 100}
            value={ySlider.value || 0}
            track={ySlider.track || false}
            orientation="vertical"
            customOnChange={handleSliderYChange}
          />
        </Box>
      );
    }
    return <div />;
  };

  /**
   * Renders the whole Chart container JSX.Element or an empty div
   * @returns The whole Chart container JSX.Element or an empty div
   */
  const renderChartContainer = (): JSX.Element => {
    if (data && options && options.geochart) {
      return (
        <div style={style} className={styles.chartContainer}>
          <div className={styles.chartContainerGrid1}>{renderChart()}</div>
          <div className={styles.chartContainerGrid2}>{renderYSlider()}</div>
          <div className={styles.chartContainerGrid3}>{renderXSlider()}</div>
          <div className={styles.chartContainerGrid4} />
        </div>
      );
    }

    return <div />;
  };

  return renderChartContainer();
}

/**
 * React's default properties for the GeoChart
 */
Chart.defaultProps = {
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    geochart: {
      chart: 'line',
    },
  },
};
