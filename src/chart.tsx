import { Chart as ChartJS, ChartType, ChartOptions, ChartData, ChartDataset, registerables } from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
import {
  GeoChartConfig,
  GeoChartAction,
  GeoChartDefaultColors,
  GeoDefaultDataPoint,
  GeoChartDatasource,
  TypeJsonObject,
} from './chart-types';
import { SchemaValidator, ValidatorResult } from './chart-schema-validator';
import { createChartJSOptions, createChartJSData, isNumber } from './chart-parsing';

/**
 * Main props for the Chart
 */
export interface TypeChartChartProps<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string
> {
  style?: unknown; // Will be casted as CSSProperties later via the imported cgpv react
  inputs?: GeoChartConfig<TType>; // The official way to work with all GeoChart features
  schemaValidator: SchemaValidator; // The schemas validator object
  chart?: TType; // When no inputs is specified, the GeoChart will use this chart props to work directly with ChartJS
  options?: ChartOptions<TType>; // When no inputs is specified, the GeoChart will use these options props to work directly with ChartJS
  data?: ChartData<TType, TData, TLabel>; // When no inputs is specified, the GeoChart will use this data props to work directly with ChartJS
  action?: GeoChartAction; // Indicate an action, user interface related, to be performed by the component
  defaultColors?: GeoChartDefaultColors;
  onParsed?: (chart: TType, options: ChartOptions<TType>, data: ChartData<TType, TData>) => void;
  onDatasourceChanged?: (value: GeoChartDatasource | undefined) => void;
  onDatasetChanged?: (datasetIndex: number, datasetLabel: string | undefined, checked: boolean) => void;
  onSliderXChanged?: (value: number | number[]) => void;
  onSliderYChanged?: (value: number | number[]) => void;
  onError?: (
    inputErrors: ValidatorResult | undefined,
    optionsErrors: ValidatorResult | undefined,
    dataErrors: ValidatorResult | undefined
  ) => void;
}

/**
 * SX Classes for the Chart
 */
const sxClasses = {
  chartError: {
    fontStyle: 'italic',
    color: 'red',
  },
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
export function GeoChart<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string
>(props: TypeChartChartProps<TType, TData, TLabel>): JSX.Element {
  // Prep ChartJS
  ChartJS.register(...registerables);

  // Can't type the window object to a 'TypeWindow', because we don't have access to the cgpv library when this code runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  // Fetch the cgpv module
  const { cgpv } = w;
  const { useEffect, useState, useRef, CSSProperties } = cgpv.react;
  const { Box, Grid, Checkbox, Select, MenuItem, TypeMenuItemProps, Typography, SliderBase: Slider } = cgpv.ui.elements;
  const {
    style: elStyle,
    schemaValidator,
    inputs: parentInputs,
    chart: parentChart,
    options: parentOptions,
    data: parentData,
    action,
    defaultColors,
    onParsed,
    onDatasourceChanged,
    onDatasetChanged,
    onSliderXChanged,
    onSliderYChanged,
    onError,
  } = props;

  // Cast the style
  const style = elStyle as typeof CSSProperties;

  // Attribute the ChartJS default colors
  if (defaultColors?.backgroundColor) ChartJS.defaults.backgroundColor = defaultColors?.backgroundColor;
  if (defaultColors?.borderColor) ChartJS.defaults.borderColor = defaultColors?.borderColor;
  if (defaultColors?.color) ChartJS.defaults.color = defaultColors?.color;

  /** ***************************************** USE STATE SECTION START ************************************************ */

  // TODO: Refactor - Check if we can have a 'useState<>' that's generic, because we end up with a lot of untyped variables if not careful like I'm doing below.
  // Since 'useState' coming from cgpv doesn't handle generic types, here's some crazy typing :)
  // Either I use the 'useState' from React (which runs, even from within GeoView Core, but causes some confusion with ESLint and useEffect when combining offical react and cgpv.react)
  // or I have to declare constants using type assertions like below. Discuss.

  const [inputs, setInputs] = useState(parentInputs) as [
    GeoChartConfig<TType> | undefined,
    React.Dispatch<GeoChartConfig<TType> | undefined>
  ];
  const [chartType, setChartType] = useState(parentChart!) as [TType, React.Dispatch<TType>];
  const [selectedDatasource, setSelectedDatasource] = useState() as [
    GeoChartDatasource | undefined,
    React.Dispatch<GeoChartDatasource | undefined>
  ];
  const [chartOptions, setChartOptions] = useState(parentOptions!) as [ChartOptions<TType>, React.Dispatch<ChartOptions<TType>>];
  const [chartData, setChartData] = useState(parentData!) as [
    ChartData<TType, TData, TLabel>,
    React.Dispatch<ChartData<TType, TData, TLabel>>
  ];
  const [redraw, setRedraw] = useState(action?.shouldRedraw) as [boolean | undefined, React.Dispatch<boolean | undefined>];
  const [filteredRecords, setFilteredRecords] = useState() as [TypeJsonObject[] | undefined, React.Dispatch<TypeJsonObject[] | undefined>];
  const [xSliderMin, setXSliderMin] = useState(0) as [number, React.Dispatch<number>];
  const [xSliderMax, setXSliderMax] = useState(0) as [number, React.Dispatch<number>];
  const [xSliderValues, setXSliderValues] = useState(0) as [number | number[] | undefined, React.Dispatch<number | number[] | undefined>];
  const [ySliderMin, setYSliderMin] = useState(0) as [number, React.Dispatch<number>];
  const [ySliderMax, setYSliderMax] = useState(0) as [number, React.Dispatch<number>];
  const [ySliderValues, setYSliderValues] = useState(0) as [number | number[], React.Dispatch<number | number[]>];
  const [validatorInputs, setValidatorInputs] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [validatorOptions, setValidatorOptions] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [validatorData, setValidatorData] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const chartRef = useRef() as React.MutableRefObject<ChartJS<TType, TData>>;

  /** ***************************************** USE STATE SECTION END ************************************************ */
  /** ***************************************** CORE FUNCTIONS START ************************************************* */

  /**
   * Returns true if there were no errors in the schema validations
   * @returns true if there were no errors in the schema validations of 'inputs', 'options' or 'chart'
   */
  const hasValidSchemas = (): boolean => {
    return (
      (!validatorInputs || validatorInputs.valid) &&
      (!validatorOptions || validatorOptions.valid) &&
      (!validatorData || validatorData.valid)
    );
  };

  /**
   * Essential function to load the records in the Chart.
   * @param datasource GeoChartDatasource The Datasource on which the records were grabbed
   * @param records TypeJsonObject[] The actual records to load in the Chart.
   */
  const processLoadingRecords = (datasource: GeoChartDatasource, records: TypeJsonObject[]): void => {
    // Parse the data
    const parsedOptions = createChartJSOptions<TType>(inputs!, parentOptions!);
    const parsedData = createChartJSData<TType, TData, TLabel>(inputs!, datasource, records, parentData!);

    // Callback
    onParsed?.(inputs!.chart, parsedOptions, parsedData);

    // Override
    setChartType(inputs!.chart);
    setChartOptions(parsedOptions);
    setChartData(parsedData);
  };

  /** ******************************************* CORE FUNCTIONS END **************************************************** */
  /** *************************************** EVENT HANDLERS SECTION START ********************************************** */

  /**
   * Handles when the Datasource changes
   * @param item MenuItem The selected MenuItem
   */
  const handleDatasourceChanged = (e: unknown, item: typeof MenuItem): void => {
    // Find the selected datasource reference based on the MenuItem
    const ds: GeoChartDatasource | undefined = inputs!.datasources.find((x) => {
      return (x.value || x.display) === item.props.value;
    });

    // Update the selected datasource
    setSelectedDatasource(ds);

    // Callback
    onDatasourceChanged?.(ds);
  };

  /**
   * Handles when a dataset was checked/unchecked (via the legend)
   * @param datasetIndex number Indicates the dataset index that was checked/unchecked
   * @param checked boolean Indicates the checked state
   */
  const handleDatasetChecked = (datasetIndex: number, datasetLabel: string | undefined, checked: boolean): void => {
    // Toggle visibility of the dataset
    chartRef.current.setDatasetVisibility(datasetIndex, checked);
    chartRef.current.update();

    // Callback
    onDatasetChanged?.(datasetIndex, datasetLabel, checked);
  };

  /**
   * Handles when the X Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXChange = (newValue: number | number[]): void => {
    // If current chart has time as x axis
    if (inputs?.chart === 'line' && inputs?.geochart?.xAxis?.type === 'time' && Array.isArray(newValue) && newValue.length === 2) {
      const theDateFrom = new Date(newValue[0]);
      const theDateTo = new Date(newValue[1]);

      // Filter the datasource.items using datasource.items
      const resItems = selectedDatasource!.items.filter((item: TypeJsonObject) => {
        const d = new Date(item[inputs.geochart.xAxis!.property] as string);
        return theDateFrom <= d && d <= theDateTo;
      });

      // Set new filtered inputs
      setFilteredRecords(resItems);
    }

    // Callback
    onSliderXChanged?.(newValue);
  };

  /**
   * Handles when the Y Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderYChange = (value: number | number[]): void => {
    // Callback
    onSliderYChanged?.(value);
  };

  /**
   * Handles the display of the label on the X Slider
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXValueDisplay = (value: number): string => {
    // If current chart has time as xAxis
    if (inputs?.geochart?.xAxis?.type === 'time') {
      return new Date(value).toDateString();
    }

    // Default
    return value.toString();
  };

  /** **************************************** EVENT HANDLERS SECTION END *********************************************** */
  /** ***************************************** USE EFFECT SECTION START ************************************************ */

  // Effect hook when the inputs change - coming from the parent component.
  useEffect(() => {
    console.log('USE EFFECT PARENT INPUTS', parentInputs);

    // Refresh the inputs in this component
    setInputs(parentInputs);

    // If parentInputs is specified
    if (parentInputs) {
      // Validate the schema of the received inputs
      setValidatorInputs(schemaValidator.validateInputs(parentInputs));
    }
  }, [parentInputs, schemaValidator]);

  // Effect hook when the inputs change - coming from this component.
  useEffect(() => {
    console.log('USE EFFECT INPUTS', inputs);

    // If inputs is specified
    if (inputs) {
      // Set the first datasource by default
      setSelectedDatasource(inputs!.datasources[0]);
    }
  }, [inputs]); // We only want to run effect when inputs and filtered records change. It'll trigger to much.

  // Effect hook when the feature change - coming from this component.
  useEffect(() => {
    console.log('USE EFFECT SELECTED DATASOURCE', selectedDatasource);

    // Clear any record filters
    setFilteredRecords(undefined);

    // If selectedDatasource is specified
    if (selectedDatasource) {
      // If has a xSlider and property and numbers as property
      if (inputs!.geochart.xSlider?.display && inputs!.geochart.xAxis?.property) {
        // If using numbers as data value
        if (selectedDatasource.items?.length > 0 && isNumber(selectedDatasource.items[0][inputs!.geochart.xAxis?.property])) {
          const values = selectedDatasource.items.map((x: TypeJsonObject) => {
            return x[inputs!.geochart.xAxis!.property] as number;
          });
          const minVal = Math.floor(Math.min(...values));
          const maxVal = Math.ceil(Math.max(...values));
          setXSliderMin(minVal);
          setXSliderMax(maxVal);
          setXSliderValues([minVal, maxVal]);
        }
      }

      // If has a ySlider and property
      if (inputs!.geochart.ySlider?.display && inputs!.geochart.yAxis?.property) {
        // If using numbers as data value
        if (selectedDatasource.items?.length > 0 && isNumber(selectedDatasource.items[0][inputs!.geochart.yAxis?.property])) {
          const values = selectedDatasource.items.map((x: TypeJsonObject) => {
            return x[inputs!.geochart.yAxis!.property] as number;
          });
          const minVal = Math.floor(Math.min(...values));
          const maxVal = Math.ceil(Math.max(...values));
          setYSliderMin(minVal);
          setYSliderMax(maxVal);
          setYSliderValues([minVal, maxVal]);
        }
      }

      // Process loading records
      processLoadingRecords(selectedDatasource, selectedDatasource.items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasource]); // We only want to run effect when this changes.

  useEffect(() => {
    // console.log('USE EFFECT SELECTED DATASOURCE FILTERED RECORDS', selectedDatasource);

    // If filteredRecords is specified
    if (filteredRecords) {
      // Process loading records
      processLoadingRecords(selectedDatasource!, filteredRecords);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecords]); // We only want to run effect when this changes.

  // Effect hook when the ChartJS native props change coming from this component.
  useEffect(() => {
    // console.log('USE EFFECT PARENT CHARTJS INPUTS');

    // No need to refresh inputs. It's explicit that inputs should be cleared as they prevail on ChartJS states. So, the parent is clearing it.
    // setInputs(null);

    // Override
    setChartType(parentChart!);
    setChartOptions(parentOptions!);
    setChartData(parentData!);
  }, [parentChart, parentOptions, parentData]);

  // Effect hook when the chartType, chartOptions, chartData change coming from this component.
  useEffect(() => {
    // console.log('USE EFFECT CHARTJS INPUTS', chartOptions, chartData);

    // Validate the parsing we did do follow ChartJS schema validating
    setValidatorOptions(schemaValidator.validateOptions(chartOptions as object));
    setValidatorData(schemaValidator.validateData(chartData as object));
  }, [chartOptions, chartData, schemaValidator]); // We only want to run effect when those change.

  // Effect hook to validate the schemas of inputs
  useEffect(() => {
    // console.log('USE EFFECT VALIDATORS');

    // If any error
    if (!hasValidSchemas()) {
      // If a callback is defined
      onError?.(validatorInputs, validatorOptions, validatorData);
      // eslint-disable-next-line no-console
      console.error(validatorInputs, validatorOptions, validatorData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatorInputs, validatorOptions, validatorData, hasValidSchemas]); // We only want to run effect when those change. Don't add 'onError' as dependency. It'll trigger too much.

  // Effect hook when an action needs to happen on this component.
  useEffect(() => {
    // console.log('USE EFFECT ACTION');

    // If redraw is true, reset the property in the action, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
    // A bit funky, but only way I could find without having code in the Parent Component.
    if (action?.shouldRedraw) {
      action!.shouldRedraw = false;
      setRedraw(true);
      setTimeout(() => {
        setRedraw(false);
      }, 200);
    }
  }, [action]); // We only want to run effect when action changes.

  /** ***************************************** USE EFFECT SECTION END *********************************************** */
  /** ****************************************** RENDER SECTION START ************************************************ */

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    // Create the Chart React
    return <ChartReact ref={chartRef} type={chartType!} style={style} data={chartData} options={chartOptions} redraw={redraw} />;
  };

  /**
   * Renders the X Chart Slider JSX.Element or an empty box
   * @returns The X Chart Slider JSX.Element or an empty box
   */
  const renderXSlider = (): JSX.Element => {
    // If inputs
    if (inputs && selectedDatasource) {
      if (inputs.chart === 'line' && inputs.geochart.xSlider?.display) {
        return (
          <Box>
            <Slider
              min={xSliderMin}
              max={xSliderMax}
              value={xSliderValues}
              customOnChange={handleSliderXChange}
              onValueDisplay={handleSliderXValueDisplay}
              onValueDisplayAriaLabel={handleSliderXValueDisplay}
            />
          </Box>
        );
      }
    }
    // None
    return <Box />;
  };

  /**
   * Renders the Y Chart Slider JSX.Element or an empty box
   * @returns The Y Chart Slider JSX.Element or an empty box
   */
  const renderYSlider = (): JSX.Element => {
    // If inputs
    if (inputs && selectedDatasource) {
      if (inputs.geochart.ySlider?.display) {
        // Need 100% height to occupy some space, otherwise it's crunched.
        return (
          <Box sx={{ height: '100%' }}>
            <Slider min={ySliderMin} max={ySliderMax} value={ySliderValues} orientation="vertical" customOnChange={handleSliderYChange} />
          </Box>
        );
      }
    }
    // None
    return <Box />;
  };

  /**
   * Renders the Datasource selector
   * @returns The Datasource selector Element
   */
  const renderDatasourceSelector = (): JSX.Element => {
    // If there's more than 1 datasource
    // if (inputs && inputs.datasources.length > 1) {
    if (inputs) {
      // Create the menu items
      const menuItems: (typeof TypeMenuItemProps)[] = [];
      inputs!.datasources.forEach((s: GeoChartDatasource) => {
        menuItems.push({ item: { value: s.value || s.display }, content: <Box>{s.display || s.value}</Box> });
      });
      return (
        <Box>
          <Select
            onChange={handleDatasourceChanged}
            menuItems={menuItems}
            value={selectedDatasource?.value || selectedDatasource?.display || ''}
          />
        </Box>
      );
    }
    // None
    return <Box />;
  };

  /**
   * Renders the Title of the GeoChart
   * @returns The Ttile Element
   */
  const renderTitle = (): JSX.Element => {
    if (inputs) {
      // TODO: Remove the marginTop once the Select marginBottom is fixed (there shouldn't be a margin-bottom 16px over there in the Select component)
      const marginTop = '-16px';
      return <Box sx={{ padding: '10px', fontSize: 'larger', marginTop: { marginTop } }}>{inputs.title}</Box>;
    }
    // None
    return <Box />;
  };

  /**
   * Renders the Dataset selector, aka the legend
   * @returns The Dataset selector Element
   */
  const renderDatasetSelector = (): JSX.Element => {
    if (chartData) {
      const { datasets } = chartData;
      if (datasets.length > 1) {
        return (
          <Box>
            {datasets.map((ds: ChartDataset<TType, TData>, idx: number) => {
              let { color } = ChartJS.defaults;
              if (ds.borderColor) color = ds.borderColor! as string;
              else if (ds.backgroundColor) color = ds.backgroundColor! as string;

              return (
                <Box sx={sxClasses.checkDatasetWrapper} key={ds.label || idx}>
                  <Checkbox
                    value={idx}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      handleDatasetChecked(idx, ds.label, e.target?.checked);
                    }}
                    defaultChecked
                  />
                  <Typography sx={{ ...sxClasses.checkDataset, ...{ color } }} noWrap>
                    {ds.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        );
      }
    }
    // None
    return <Box />;
  };

  /**
   * Renders the whole Chart container JSX.Element or an empty box
   * @returns The whole Chart container JSX.Element or an empty box
   */
  const renderChartContainer = (): JSX.Element => {
    if (chartOptions) {
      // The 1, 11 and 12 used here are as documented online
      return (
        <Grid container style={style}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex;', alignItems: 'center;' }}>
              {renderDatasourceSelector()}
              {renderTitle()}
            </Box>
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

    return <Box />;
  };

  /**
   * Renders the whole Chart container JSX.Element or an empty box
   * @returns The whole Chart container JSX.Element or an empty box
   */
  const renderChartContainerFailed = (): JSX.Element => {
    return <Box sx={sxClasses.chartError}>Error rendering the Chart. Check console for details.</Box>;
  };

  // If no errors
  if (hasValidSchemas()) {
    // Render the chart
    return renderChartContainer();
  }

  // Failed to render
  return renderChartContainerFailed();
}

/**
 * React's default properties for the GeoChart
 */
GeoChart.defaultProps = {
  style: null,
  inputs: null,
  chart: 'line',
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  } as ChartOptions<ChartType>,
  data: { datasets: [], labels: [] },
  defaultColors: null,
  action: null,
  onParsed: null,
  onDatasourceChanged: null,
  onDatasetChanged: null,
  onSliderXChanged: null,
  onSliderYChanged: null,
  onError: null,
};
