/* eslint-disable no-console */
// TODO: Remove the no-console eslint above when component development stabilizes
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
import { createChartJSOptions, createChartJSData } from './chart-parsing';
import { isNumber, extractColor } from './chart-util';

// TEMPORARY VARIABLE FOR EASE OF DEBUGGING
const LOGGING: number = 1;

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
  datasource?: GeoChartDatasource; // The selected datasource
  schemaValidator: SchemaValidator; // The schemas validator object
  chart?: TType; // When no inputs is specified, the GeoChart will use this chart props to work directly with ChartJS
  options?: ChartOptions<TType>; // When no inputs is specified, the GeoChart will use these options props to work directly with ChartJS
  data?: ChartData<TType, TData, TLabel>; // When no inputs is specified, the GeoChart will use this data props to work directly with ChartJS
  action?: GeoChartAction; // Indicate an action, user interface related, to be performed by the component
  defaultColors?: GeoChartDefaultColors;
  isLoadingChart?: boolean;
  isLoadingDatasource?: boolean;
  onParsed?: (chart: TType, options: ChartOptions<TType>, data: ChartData<TType, TData>) => void;
  onDatasourceChanged?: (value: GeoChartDatasource | undefined) => void;
  onDataChanged?: (dataIndex: number, dataLabel: string, checked: boolean) => void;
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
  TLabel extends string = string
>(props: TypeChartChartProps<TType, TData, TLabel>): JSX.Element {
  // Prep ChartJS
  ChartJS.register(...registerables);

  // Can't type the window object to a 'TypeWindow', because we don't have access to the cgpv library when this line runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  // Fetch the cgpv module
  const { cgpv } = w;
  const { useEffect, useState, useRef, useCallback, CSSProperties } = cgpv.react;
  const { Box, Grid, Checkbox, Select, MenuItem, TypeMenuItemProps, Typography, SliderBase: Slider, CircularProgress } = cgpv.ui.elements;
  const {
    style: elStyle,
    schemaValidator,
    inputs: parentInputs,
    datasource: parentDatasource,
    chart: parentChart,
    options: parentOptions,
    data: parentData,
    action,
    defaultColors,
    isLoadingChart,
    isLoadingDatasource,
    onParsed,
    onDatasourceChanged,
    onDataChanged,
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

  // TODO: Refactor - Check why the useState coming from cgpv loses its generic property.
  // TO.DO.CONT: Here's some crazy typing so that at least things remain typed instead of 'any'.

  const [inputs, setInputs] = useState(parentInputs) as [
    GeoChartConfig<TType> | undefined,
    React.Dispatch<GeoChartConfig<TType> | undefined>
  ];
  const [chartType, setChartType] = useState(parentChart!) as [TType, React.Dispatch<TType>];
  const [selectedDatasource, setSelectedDatasource] = useState(parentDatasource) as [
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
  const [xSliderValues, setXSliderValues] = useState(0) as [number | number[], React.Dispatch<number | number[]>];
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
   * Filters the datasource based on 2 possible and independent axis.
   * Ideally, we'd filter the data on the 2 independent axis individually and then grab the intersecting results,
   * but, for performance reasons, the code cumulates the filtered data instead.
   */
  const calculateFiltering = (datasource: GeoChartDatasource, xValues: number | number[], yValues: number | number[]): void => {
    // If chart type is line
    let resItemsFinal: TypeJsonObject[] = [...datasource.items!];
    if (inputs?.chart === 'line') {
      // If filterings on x supported
      if (Array.isArray(xValues) && xValues.length === 2) {
        // If filtering on time values
        if (inputs?.geochart?.xAxis?.type === 'time') {
          // Grab the filters
          const theDateFrom = new Date(xValues[0]);
          const theDateTo = new Date(xValues[1]);

          // Filter the datasource.items
          resItemsFinal = datasource.items!.filter((item: TypeJsonObject) => {
            const d = new Date(item[inputs.geochart.xAxis!.property] as string);
            return theDateFrom <= d && d <= theDateTo;
          });
        } else {
          // Default filtering on number values
          const from = xValues[0];
          const to = xValues[1];

          // Filter the datasource.items
          resItemsFinal = datasource.items!.filter((item: TypeJsonObject) => {
            return from <= (item[inputs.geochart.xAxis!.property] as number) && (item[inputs.geochart.xAxis!.property] as number) <= to;
          });
        }
      }

      // If more filterings on y, cumulate it
      if (Array.isArray(yValues) && yValues.length === 2) {
        const from = yValues[0];
        const to = yValues[1];

        // Filter the rest of the items using the reminding items
        resItemsFinal = resItemsFinal.filter((item: TypeJsonObject) => {
          return from <= (item[inputs.geochart.yAxis!.property] as number) && (item[inputs.geochart.yAxis!.property] as number) <= to;
        });
      }
    }

    // Set new filtered inputs
    setFilteredRecords(resItemsFinal);
  };

  /**
   * Performs a redraw.
   */
  const performRedraw = (): void => {
    setRedraw(true);
    setTimeout(() => {
      setRedraw(false);
    }, 200);
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
   * Handles when a data was checked/unchecked (via the legend). This is only used by Pie and Doughnut Charts.
   * @param datasetIndex number Indicates the dataset index that was checked/unchecked
   * @param dataLabel string Indicates the data label that was checked/unchecked
   * @param checked boolean Indicates the checked state
   */
  const handleDataChecked = (dataIndex: number, dataLabel: string, checked: boolean): void => {
    // Toggle visibility of the dataset
    chartRef.current.toggleDataVisibility(dataIndex);
    chartRef.current.update();

    // Callback
    onDataChanged?.(dataIndex, dataLabel, checked);
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
    // Calculate filterings
    calculateFiltering(selectedDatasource!, newValue, ySliderValues);

    // Set the X State
    setXSliderValues(newValue);

    // Callback
    onSliderXChanged?.(newValue);
  };

  /**
   * Handles when the Y Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderYChange = (newValue: number | number[]): void => {
    // Calculate filterings
    calculateFiltering(selectedDatasource!, xSliderValues, newValue);

    // Set the Y State
    setYSliderValues(newValue);

    // Callback
    onSliderYChanged?.(newValue);
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

  /**
   * Handles the display of the label on the Y Slider
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderYValueDisplay = (value: number): string => {
    // Default
    return value.toString();
  };

  /** **************************************** EVENT HANDLERS SECTION END *********************************************** */
  /** ***************************************** HOOKS SECTION START ************************************************ */

  /**
   * Returns true if there were no errors in the schema validations
   * @returns true if there were no errors in the schema validations of 'inputs', 'options' or 'chart'
   */
  const hasValidSchemas = useCallback((): boolean => {
    return (
      (!validatorInputs || validatorInputs.valid) &&
      (!validatorOptions || validatorOptions.valid) &&
      (!validatorData || validatorData.valid)
    );
  }, [validatorData, validatorInputs, validatorOptions]);

  /**
   * Essential function to load the records in the Chart.
   * @param datasource GeoChartDatasource The Datasource on which the records were grabbed
   * @param records TypeJsonObject[] The actual records to load in the Chart.
   */
  const processLoadingRecords = useCallback(
    (datasource: GeoChartDatasource, records: TypeJsonObject[] | undefined): void => {
      // Parse the data
      const parsedOptions = createChartJSOptions<TType>(inputs!, parentOptions!);
      const parsedData = createChartJSData<TType, TData, TLabel>(inputs!, datasource, records, parentData!);

      // Callback
      onParsed?.(inputs!.chart, parsedOptions, parsedData);

      if (LOGGING >= 3) console.log('PARSED', inputs, parsedOptions, parsedData);

      // Override
      setChartType(inputs!.chart);
      setChartOptions(parsedOptions);
      setChartData(parsedData);
    },
    [inputs, onParsed, parentData, parentOptions]
  );

  // Effect hook when the inputs change - coming from the parent component.
  useEffect(() => {
    if (LOGGING >= 2) console.log('USE EFFECT PARENT INPUTS', parentInputs);

    // Refresh the inputs in this component
    setInputs(parentInputs);

    // If parentInputs is specified
    if (parentInputs) {
      // Validate the schema of the received inputs
      setValidatorInputs(schemaValidator.validateInputs(parentInputs));
    }

    return () => {
      if (LOGGING >= 5) console.log('USE EFFECT PARENT INPUTS - UNMOUNT', parentInputs);
      setSelectedDatasource(undefined);
    };
  }, [parentInputs, schemaValidator]);

  // Effect hook when the inputs change - coming from this component.
  useEffect(() => {
    if (LOGGING >= 3) console.log('USE EFFECT INPUTS', inputs);

    // Set the first datasource by default
    setSelectedDatasource(inputs?.datasources[0]);

    return () => {
      if (LOGGING >= 5) console.log('USE EFFECT INPUTS - UNMOUNT', inputs);
    };
  }, [inputs]);

  // Effect hook when the selected datasource changes - coming from parent component.
  useEffect(() => {
    if (LOGGING >= 2) console.log('USE EFFECT PARENT DATASOURCE', parentDatasource);

    // Set the first datasource by default
    setSelectedDatasource(parentDatasource);

    return () => {
      if (LOGGING >= 5) console.log('USE EFFECT PARENT DATASOURCE - UNMOUNT', parentDatasource);
    };
  }, [parentDatasource]);

  // Effect hook when the selected datasource changes - coming from this component.
  useEffect(() => {
    if (LOGGING >= 3) console.log('USE EFFECT SELECTED DATASOURCE', selectedDatasource);

    // Clear any record filters
    setFilteredRecords(undefined);

    // If selectedDatasource is specified
    if (selectedDatasource) {
      // If has a xSlider and property and numbers as property
      if (inputs!.geochart.xSlider?.display && inputs!.geochart.xAxis?.property) {
        // If using numbers as data value
        if (
          selectedDatasource.items &&
          selectedDatasource.items.length > 0 &&
          isNumber(selectedDatasource.items![0][inputs!.geochart.xAxis?.property])
        ) {
          const values = selectedDatasource.items!.map((x: TypeJsonObject) => {
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
        if (
          selectedDatasource.items &&
          selectedDatasource.items.length > 0 &&
          isNumber(selectedDatasource.items![0][inputs!.geochart.yAxis?.property])
        ) {
          const values = selectedDatasource.items!.map((x: TypeJsonObject) => {
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

    return () => {
      if (LOGGING >= 5) console.log('USE EFFECT SELECTED DATASOURCE - UNMOUNT', selectedDatasource);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processLoadingRecords, selectedDatasource]); // No need for 'inputs' to be a dependency here, because when 'inputs' change, it will reset the selected datasource anyways

  // Effect hook when the filtered records change - coming from this component.
  useEffect(() => {
    if (LOGGING >= 3) console.log('USE EFFECT SELECTED DATASOURCE FILTERED RECORDS', selectedDatasource);

    // If filteredRecords is specified
    if (filteredRecords) {
      // Process loading records
      processLoadingRecords(selectedDatasource!, filteredRecords);
    }

    return () => {
      if (LOGGING >= 5) console.log('USE EFFECT SELECTED DATASOURCE FILTERED RECORDS - UNMOUNT', selectedDatasource);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processLoadingRecords, filteredRecords]); // No need for 'selectedDatasource' to be a dependency here, because when 'selectedDatasource' changes, it will reset the filters anyways

  // Effect hook when the main props about charttype, options and data change - coming from parent component.
  useEffect(() => {
    if (LOGGING >= 2) console.log('USE EFFECT PARENT CHARTJS INPUTS');

    // Override
    setChartType(parentChart!);
    setChartOptions(parentOptions!);
    setChartData(parentData!);
  }, [parentChart, parentOptions, parentData]);

  // Effect hook when the chartOptions, chartData change - coming from this component.
  useEffect(() => {
    if (LOGGING >= 3) console.log('USE EFFECT CHARTJS OPTIONS+DATA', chartOptions, chartData);

    // Validate the parsing we did do follow ChartJS schema validating
    setValidatorOptions(schemaValidator.validateOptions(chartOptions));
    setValidatorData(schemaValidator.validateData(chartData));

    // Always perform a redraw (fixes some unfortunate ChartJS UI issues)
    performRedraw();
  }, [chartOptions, chartData, schemaValidator]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    if (LOGGING >= 4) console.log('USE EFFECT VALIDATORS');

    // If any error
    if (!hasValidSchemas()) {
      // If a callback is defined
      onError?.(validatorInputs, validatorOptions, validatorData);
      // eslint-disable-next-line no-console
      console.error(validatorInputs, validatorOptions, validatorData);
    }
  }, [validatorInputs, validatorOptions, validatorData, hasValidSchemas, onError]);

  // Effect hook when an action needs to happen - coming from this component.
  useEffect(() => {
    if (LOGGING >= 5) console.log('USE EFFECT ACTION');

    // If redraw is true, reset the property in the action, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
    // A bit funky, but only way I could find without having code in the Parent Component.
    if (action?.shouldRedraw) {
      action!.shouldRedraw = false;
      // Redraw
      performRedraw();
    }
  }, [action]);

  /** ******************************************* HOOKS SECTION END ************************************************** */
  /** ****************************************** RENDER SECTION START ************************************************ */

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
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
      if (inputs.chart === 'line' && inputs.geochart.ySlider?.display) {
        // Need 100% height to occupy some space, otherwise it's crunched.
        return (
          <Box sx={{ height: '85%' }}>
            <Slider
              min={ySliderMin}
              max={ySliderMax}
              value={ySliderValues}
              orientation="vertical"
              customOnChange={handleSliderYChange}
              onValueDisplay={handleSliderYValueDisplay}
              onValueDisplayAriaLabel={handleSliderYValueDisplay}
            />
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
      // TODO: Remove the marginTop once the Select marginBottom is fixed (there shouldn't be a margin-bottom 16px over in the Select component)
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
              else if ((chartType === 'line' || chartType === 'bar') && ds.backgroundColor) color = ds.backgroundColor! as string;

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
   * Renders the Data selector for the pie and doughnut charts
   * @returns The Data selector Element
   */
  const renderDataSelector = (): JSX.Element => {
    if (chartData) {
      const { labels, datasets } = chartData;
      if ((chartType === 'pie' || chartType === 'doughnut') && labels && datasets && labels.length > 1 && datasets.length > 1) {
        return (
          <Box>
            {labels.map((lbl: TLabel, idx: number) => {
              let { color } = ChartJS.defaults;
              if (Array.isArray(datasets[0].backgroundColor)) color = extractColor(datasets[0].backgroundColor[idx])!;

              return (
                <Box sx={sxClasses.checkDatasetWrapper} key={lbl || idx}>
                  <Checkbox
                    value={idx}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      handleDataChecked(idx, lbl, e.target?.checked);
                    }}
                    defaultChecked
                  />
                  <Typography sx={{ ...sxClasses.checkDataset, ...{ color } }} noWrap>
                    {lbl}
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
   * Renders the Chart container JSX.Element or an empty box
   * @returns The Chart container JSX.Element or an empty box
   */
  const renderChartContainer = (): JSX.Element => {
    // If not loading
    if (chartOptions) {
      // The 1, 11 and 12 used here are as documented online
      return (
        <Box>
          <Grid container sx={style}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex;', alignItems: 'center;' }}>
                {renderDatasourceSelector()}
                {renderTitle()}
              </Box>
              {renderDatasetSelector()}
              {renderDataSelector()}
            </Grid>
            <Grid item sx={{ position: 'relative;' }} xs={11}>
              {isLoadingDatasource && <CircularProgress sx={{ backgroundColor: 'transparent', zIndex: 0 }} />}
              {renderChart()}
            </Grid>
            <Grid item xs={1}>
              {renderYSlider()}
            </Grid>
            <Grid item xs={11}>
              {renderXSlider()}
            </Grid>
          </Grid>
        </Box>
      );
    }
    return <Box />;
  };

  /**
   * Renders the complete GeoChart Component including the possible loading circle progress when Component is in loading state.
   * @returns The complete GeoChart Component container JSX.Element
   */
  const renderEverything = (): JSX.Element => {
    return (
      <Box sx={{ minHeight: '400px' }}>
        {!isLoadingChart && renderChartContainer()}
        {isLoadingChart && <CircularProgress />}
      </Box>
    );
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
    return renderEverything();
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
