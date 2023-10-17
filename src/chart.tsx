/* eslint-disable no-console */
// TODO: Remove the disable above
import { Box } from '@mui/material';
import {
  Chart as ChartJS,
  ChartDataset,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  ArcElement,
} from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import { GeoChartOptions, GeoChartType, GeoChartData, GeoChartAction, GeoChartDefaultColors } from './chart-types';
import { ChartValidator, ValidatorResult } from './chart-validator';

/**
 * Main props for the Chart
 */
export interface TypeChartChartProps<TType extends GeoChartType> {
  style?: unknown; // Will be casted as CSSProperties later via the imported cgpv react
  defaultColors?: GeoChartDefaultColors;
  data?: GeoChartData<TType>;
  options?: GeoChartOptions;
  action?: GeoChartAction;
  handleSliderXChanged?: (value: number | number[]) => void;
  handleSliderYChanged?: (value: number | number[]) => void;
  handleError?: (dataErrors: ValidatorResult, optionsErrors: ValidatorResult) => void;
}

/**
 * SX Classes for the Chart
 */
const sxClasses = {
  checkDatasetWrapper: {
    display: 'inline-block',
  },
  checkDataset: {
    display: 'inline-flex',
    verticalAlign: 'middle',
    marginRight: '20px !important',
  },
};

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { useEffect, useState, useRef, CSSProperties } = cgpv.react;
  const { Grid, Checkbox, Slider, Typography } = cgpv.ui.elements;
  const { style: elStyle, data, options: elOptions, action: elAction } = props;

  // Cast the style
  const style = elStyle as typeof CSSProperties;

  // Attribute the ChartJS default colors
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

  // STATE / REF SECTION *******
  const [redraw, setRedraw] = useState(elAction?.shouldRedraw);
  const chartRef = useRef(null);
  // const [selectedDatasets, setSelectedDatasets] = useState();

  // If redraw is true, reset the property, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
  // A bit funky, but as documented online.
  if (elAction?.shouldRedraw) {
    elAction!.shouldRedraw = false;
    setRedraw(true);
    setTimeout(() => {
      setRedraw(false);
    }, 200);
  }

  /**
   * Handles when the X Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXChange = (value: number | number[]) => {
    // If callback set
    if (props.handleSliderXChanged) {
      props.handleSliderXChanged!(value);
    }
  };

  /**
   * Handles when the Y Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderYChange = (value: number | number[]) => {
    // If callback set
    if (props.handleSliderYChanged) {
      props.handleSliderYChanged!(value);
    }
  };

  /**
   * Handles when a dataset was checked/unchecked (via the legend)
   * @param datasetIndex number Indicates the dataset index that was checked/unchecked
   * @param checked boolean Indicates the checked state
   */
  const handleDatasetChecked = (datasetIndex: number, checked: boolean) => {
    // Toggle visibility of the dataset
    chartRef.current.setDatasetVisibility(datasetIndex, checked);
    chartRef.current.update();
  };

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    // Depending on the type of chart
    switch (options.geochart.chart) {
      case 'bar':
        return <ChartReact ref={chartRef} type="bar" style={style} data={data!} options={options} redraw={redraw} />;

      case 'pie':
        return <ChartReact ref={chartRef} type="pie" style={style} data={data!} options={options} redraw={redraw} />;

      case 'doughnut':
        // Doughnut Chart
        return <ChartReact ref={chartRef} type="doughnut" style={style} data={data!} options={options} redraw={redraw} />;

      default:
        // Line Chart is default
        return <ChartReact ref={chartRef} type="line" style={style} data={data!} options={options} redraw={redraw} />;
    }
  };

  /**
   * Renders the X Chart Slider JSX.Element or an empty div
   * @returns The X Chart Slider JSX.Element or an empty div
   */
  const renderXSlider = (): JSX.Element => {
    const { xSlider } = options.geochart;
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
    const { ySlider } = options.geochart;
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
    // None
    return <div />;
  };

  /**
   * Renders the Dataset selector, aka the legend
   * @returns The Dataset selector Element
   */
  const renderDatasetSelector = (): JSX.Element => {
    const { datasets } = data!;
    if (datasets.length > 1) {
      return (
        <div>
          {datasets.map((ds: ChartDataset, idx: number) => {
            // Find a color for the legend based on the dataset info
            let { color } = ChartJS.defaults;
            if (ds.borderColor) color = ds.borderColor! as string;
            else if (ds.backgroundColor) color = ds.backgroundColor! as string;

            // Return the Legend item
            return (
              // eslint-disable-next-line react/no-array-index-key
              <Box sx={sxClasses.checkDatasetWrapper} key={idx}>
                <Checkbox
                  value={idx}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    handleDatasetChecked(idx, e.target?.checked);
                  }}
                  defaultChecked
                />
                <Typography sx={{ ...sxClasses.checkDataset, ...{ color } }} noWrap>
                  {ds.label}
                </Typography>
              </Box>
            );
          })}
        </div>
      );
    }
    // None
    return <div />;
  };

  /**
   * Renders the whole Chart container JSX.Element or an empty div
   * @returns The whole Chart container JSX.Element or an empty div
   */
  const renderChartContainer = (): JSX.Element => {
    if (options.geochart && data?.datasets) {
      return (
        <Grid container style={style}>
          <Grid item xs={12}>
            {renderDatasetSelector()}
          </Grid>
          <Grid item xs={11}>
            {renderChart()}
          </Grid>
          <Grid item xs={1}>
            {renderYSlider()}
          </Grid>
          <Grid item xs={11}>
            {renderXSlider()}
          </Grid>
        </Grid>
      );
    }

    return <div />;
  };

  // Effect hook to add and remove event listeners
  useEffect(() => {
    // Prep ChartJS
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, ArcElement);
  }, []);

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
