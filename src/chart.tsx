/* eslint-disable no-console */
// TODO: Remove the disable above
import { Box } from '@mui/material';
import { Chart as ChartJS, ChartDataset, registerables } from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import { GeoChartOptions, GeoChartType, GeoChartData, GeoChartAction, GeoChartDefaultColors } from './chart-types';
import { SchemaValidator, ValidatorResult } from './schema-validator';

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
  // Prep ChartJS
  ChartJS.register(...registerables);

  // Fetch cgpv
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { useEffect, useState, useRef, CSSProperties } = cgpv.react;
  const { Grid, Checkbox, Slider, Typography } = cgpv.ui.elements;
  const {
    style: elStyle,
    data,
    options: elOptions,
    action: elAction,
    defaultColors,
    handleSliderXChanged,
    handleSliderYChanged,
    handleError,
  } = props;

  // Cast the style
  const style = elStyle as typeof CSSProperties;

  // Attribute the ChartJS default colors
  if (defaultColors?.backgroundColor) ChartJS.defaults.backgroundColor = defaultColors?.backgroundColor;
  if (defaultColors?.borderColor) ChartJS.defaults.borderColor = defaultColors?.borderColor;
  if (defaultColors?.color) ChartJS.defaults.color = defaultColors?.color;

  // Merge default options
  const options: GeoChartOptions = { ...Chart.defaultProps.options, ...elOptions } as GeoChartOptions;
  if (!options?.geochart?.chart) {
    // Deep assign, in case geochart was specified in elOptions, but geochart wasn't (losing the default for 'chart' by accident)
    options.geochart.chart = Chart.defaultProps.options.geochart.chart as GeoChartType;
  }

  // STATE / REF SECTION *******
  const [redraw, setRedraw] = useState(elAction?.shouldRedraw);
  const chartRef = useRef(null);

  /**
   * Handles when the X Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXChange = (value: number | number[]): void => {
    // Callback
    handleSliderXChanged?.(value);
  };

  /**
   * Handles when the Y Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderYChange = (value: number | number[]): void => {
    // Callback
    handleSliderYChanged?.(value);
  };

  /**
   * Handles when a dataset was checked/unchecked (via the legend)
   * @param datasetIndex number Indicates the dataset index that was checked/unchecked
   * @param checked boolean Indicates the checked state
   */
  const handleDatasetChecked = (datasetIndex: number, checked: boolean): void => {
    // Toggle visibility of the dataset
    chartRef.current.setDatasetVisibility(datasetIndex, checked);
    chartRef.current.update();
  };

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    // Create the Chart React
    return <ChartReact ref={chartRef} type={options.geochart.chart} style={style} data={data!} options={options} redraw={redraw} />;
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
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

  /**
   * Renders the whole Chart container JSX.Element or an empty div
   * @returns The whole Chart container JSX.Element or an empty div
   */
  const renderChartContainerFailed = (): JSX.Element => {
    return <div style={{ fontStyle: 'italic', color: 'red' }}>Error rendering the Chart. Check console for details.</div>;
  };

  //
  // PROCEED WITH LOGIC HERE!
  //

  // If options and data are specified
  let resOptions: ValidatorResult | undefined;
  let resData: ValidatorResult | undefined;
  if (options && data) {
    // Validate the data and options as received
    const validator = new SchemaValidator();
    resOptions = validator.validateOptions(options) || undefined;
    resData = validator.validateData(data);
  }

  // Effect hook to raise the error on the correct React state.
  // This is because it's quite probable the handling of the error will want to modify the state of another
  // component (e.g. Snackbar) and React will throw a warning if this is not done in the useEffect().
  useEffect(() => {
    // If the options or data schemas were checked and had errors
    if (resData && resOptions && (!resData.valid || !resOptions.valid)) {
      // If a callback is defined
      handleError?.(resData, resOptions);
      console.error(resData, resOptions);
    }
  }, [handleError, resData, resOptions]);

  // If options and data are specified
  if (options && data) {
    // If no errors
    if (resOptions?.valid && resData?.valid) {
      // If redraw is true, reset the property, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
      // A bit funky, but as documented online.
      if (elAction?.shouldRedraw) {
        elAction!.shouldRedraw = false;
        setRedraw(true);
        setTimeout(() => {
          setRedraw(false);
        }, 200);
      }

      // Render the chart
      return renderChartContainer();
    }

    // Failed to render
    return renderChartContainerFailed();
  }

  // Nothing to render, no errors either
  return <div />;
}

/**
 * React's default properties for the GeoChart
 */
Chart.defaultProps = {
  style: null,
  defaultColors: null,
  data: null,
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
  action: null,
  handleSliderXChanged: null,
  handleSliderYChanged: null,
  handleError: null,
};
