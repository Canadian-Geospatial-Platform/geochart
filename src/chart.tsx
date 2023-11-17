import { Chart as ChartJS, ChartType, ChartOptions, ChartData, ChartDataset, registerables } from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
import {
  GeoChartConfig,
  GeoChartAction,
  GeoChartDefaultColors,
  GeoDefaultDataPoint,
  GeoChartOptionsGeochart,
  GeoChartDatasource,
  TypeJsonObject,
  StepsPossibilitiesConst,
  DATE_OPTIONS_LONG,
} from './chart-types';
import { SchemaValidator, ValidatorResult } from './chart-schema-validator';
import { createChartJSOptions, createChartJSData } from './chart-parsing';
import { isNumber, extractColor } from './chart-util';
import { sxClasses } from './chart-style';
import { log, LOG_LEVEL_MAXIMUM, LOG_LEVEL_MEDIUM, LOG_LEVEL_LOW } from './logger';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';

/**
 * Main props for the Chart
 */
export interface TypeChartChartProps<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string
> {
  sx?: unknown; // Will be casted as CSSProperties later via the imported cgpv react
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
  onStepSwitcherChanged?: (value: string) => void;
  onError?: (validators: (ValidatorResult | undefined)[]) => void;
}

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
  const { useTranslation } = cgpv;
  const { useEffect, useState, useRef, useCallback, CSSProperties } = cgpv.react;
  const { Box, Grid, Checkbox, Select, MenuItem, TypeMenuItemProps, Typography, SliderBase: Slider, CircularProgress } = cgpv.ui.elements;
  const {
    sx: elStyle,
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
    onStepSwitcherChanged,
    onError,
  } = props;

  // Translation
  const { t, i18n } = useTranslation();

  // Cast the style
  const sx = elStyle as typeof CSSProperties;

  // Attribute the ChartJS default colors
  if (defaultColors?.backgroundColor) ChartJS.defaults.backgroundColor = defaultColors?.backgroundColor;
  if (defaultColors?.borderColor) ChartJS.defaults.borderColor = defaultColors?.borderColor;
  if (defaultColors?.color) ChartJS.defaults.color = defaultColors?.color;

  /** ****************************************** USE STATE SECTION START ************************************************ */

  // TODO: Refactor - Check why the useState and useCallback coming from cgpv lose their generic capabilities.
  // TO.DO.CONT: This is rather problematic. It forces the devs to explicitely use some "not so pretty" type assertions
  // so that things remain typed instead of becoming 'any' when using functions such as 'useState', 'useCallback', 'useRef', etc.

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
  const [xSliderSteps, setXSliderSteps] = useState(1) as [number, React.Dispatch<number>];
  const [xSliderValues, setXSliderValues] = useState(0) as [number | number[], React.Dispatch<number | number[]>];
  const [ySliderMin, setYSliderMin] = useState(0) as [number, React.Dispatch<number>];
  const [ySliderMax, setYSliderMax] = useState(0) as [number, React.Dispatch<number>];
  const [ySliderSteps, setYSliderSteps] = useState(1) as [number, React.Dispatch<number>];
  const [ySliderValues, setYSliderValues] = useState(0) as [number | number[], React.Dispatch<number | number[]>];
  const [validatorInputs, setValidatorInputs] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [validatorOptions, setValidatorOptions] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [validatorData, setValidatorData] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [selectedStepSwitcher, setStepSwitcher] = useState() as [string | false, React.Dispatch<string | false>];
  const chartRef = useRef() as React.MutableRefObject<ChartJS<TType, TData>>;

  /** ****************************************** USE STATE SECTION END ************************************************** */
  /** ******************************************* CORE FUNCTIONS START ************************************************** */

  /**
   * Helper function to set the x and y axes based on the inputs and values.
   * @param geochart GeoChartOptionsGeochart The Geochart options
   * @param datasourceItems TypeJsonObject[] The Datasource items
   */
  const processAxes = (geochart: GeoChartOptionsGeochart, datasourceItems: TypeJsonObject[]): void => {
    // If has a xSlider and property and numbers as property
    if (geochart.xSlider?.display && geochart.xAxis?.property) {
      // If using numbers as data value
      if (datasourceItems && datasourceItems.length > 0 && isNumber(datasourceItems![0][geochart.xAxis?.property])) {
        // If either min or max isn't preset
        let minVal = geochart.xSlider!.min;
        let maxVal = geochart.xSlider!.max;
        if (minVal === undefined || maxVal === undefined) {
          // Dynamically calculate them
          const values = datasourceItems!.map((x: TypeJsonObject) => {
            return x[geochart.xAxis!.property] as number;
          });
          minVal = minVal !== undefined ? minVal : Math.floor(Math.min(...values));
          maxVal = maxVal !== undefined ? maxVal : Math.ceil(Math.max(...values));
        }
        setXSliderMin(minVal);
        setXSliderMax(maxVal);

        // If steps are determined by config
        if (geochart.xSlider!.step) setXSliderSteps(geochart.xSlider!.step);
        setXSliderValues([minVal, maxVal]);
      }
    }

    // If has a ySlider and property
    if (geochart.ySlider?.display && geochart.yAxis?.property) {
      // If using numbers as data value
      if (datasourceItems && datasourceItems.length > 0 && isNumber(datasourceItems![0][geochart.yAxis?.property])) {
        // If either min or max isn't preset
        let minVal = geochart.ySlider!.min;
        let maxVal = geochart.ySlider!.max;
        if (minVal === undefined || maxVal === undefined) {
          // Dynamically calculate them
          const values = datasourceItems!.map((x: TypeJsonObject) => {
            return x[geochart.yAxis!.property] as number;
          });
          minVal = minVal !== undefined ? minVal : Math.floor(Math.min(...values));
          maxVal = maxVal !== undefined ? maxVal : Math.ceil(Math.max(...values));
        }
        setYSliderMin(minVal);
        setYSliderMax(maxVal);

        // If steps are determined by config
        if (geochart.ySlider!.step) setYSliderSteps(geochart.ySlider!.step);
        setYSliderValues([minVal, maxVal]);
      }
    }
  };

  /**
   * Helper function to filter datasource items based on 2 possible and independent axis.
   * For performance reasons, the code cumulates the filtered data instead of treating the axes individually.
   * @param datasourceItems TypeJsonObject[] The Datasource items
   * @param xValues number | number[] The values in X to filter on
   * @param yValues number | number[] The values in Y to filter on
   */
  const processFiltering = (datasourceItems: TypeJsonObject[], xValues: number | number[], yValues: number | number[]): void => {
    // If chart type is line
    let resItemsFinal: TypeJsonObject[] = [...datasourceItems!];
    if (inputs?.chart === 'line') {
      // If filterings on x supported
      if (Array.isArray(xValues) && xValues.length === 2) {
        // If filtering on time values
        if (inputs?.geochart?.xAxis?.type === 'time' || inputs?.geochart?.xAxis?.type === 'timeseries') {
          // Grab the filters
          const theDateFrom = new Date(xValues[0]);
          const theDateTo = new Date(xValues[1]);

          // Filter the datasourceItems
          resItemsFinal = datasourceItems!.filter((item: TypeJsonObject) => {
            const d = new Date(item[inputs.geochart.xAxis!.property] as string);
            return theDateFrom <= d && d <= theDateTo;
          });
        } else {
          // Default filtering on number values
          const from = xValues[0];
          const to = xValues[1];

          // Filter the datasourceItems
          resItemsFinal = datasourceItems!.filter((item: TypeJsonObject) => {
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
   * Helper function checking for the valid states of a list of ValidatorResults. Returns true if there were no errors found.
   * @param validators (ValidatorResult | undefined)[] The list of validator results to check for their valid states
   * @returns true if there were no errors in the schema validations
   */
  const hasValidSchemas = (validators: (ValidatorResult | undefined)[]): boolean => {
    const validatorsInvalid = validators.filter((valResult: ValidatorResult | undefined) => {
      return valResult && !valResult.valid;
    });
    return validatorsInvalid.length === 0;
  };

  /**
   * Performs a redraw by changing the 'redraw' property and changing it back after.
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
   * @param e Event The Select change event
   * @param item MenuItem The selected MenuItem
   */
  const handleDatasourceChanged = (e: Event, item: typeof MenuItem): void => {
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
   * @param datasetLabel string Indicates the dataset label that was checked/unchecked
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
   * Handles when a data was checked/unchecked (via the legend). This is only used by Pie and Doughnut Charts.
   * @param dataIndex number Indicates the data index that was checked/unchecked
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
   * Handles when the X Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXChange = (newValue: number | number[]): void => {
    // Calculate filterings
    processFiltering(selectedDatasource!.items!, newValue, ySliderValues);

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
    processFiltering(selectedDatasource!.items!, xSliderValues, newValue);

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
    if (inputs?.geochart?.xAxis?.type === 'time' || inputs?.geochart?.xAxis?.type === 'timeseries') {
      return new Date(value).toLocaleDateString(i18n.language, DATE_OPTIONS_LONG);
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

  /**
   * Handles when the Steps Switcher changes
   * @param value string Indicates the steps value
   */
  const handleStepsSwitcherChanged = (e: unknown, item: typeof MenuItem): void => {
    // Set the step switcher
    setStepSwitcher(item.props.value);

    // Adjust the configuration, live, for the next render
    if (inputs) inputs.geochart.useSteps = item.props.value;

    // Adjust the configuration, for the current render too
    if (chartType === 'line' && chartData) {
      chartData.datasets.forEach((ds: ChartDataset<TType, TData>) => {
        // eslint-disable-next-line no-param-reassign
        (ds as ChartDataset<'line', TData>).stepped = item.props.value;
      });

      // Update
      setChartData({ ...chartData });
    }

    // Callback
    onStepSwitcherChanged?.(item.props.value);
  };

  /** **************************************** EVENT HANDLERS SECTION END *********************************************** */
  /** ******************************************* HOOKS SECTION START *************************************************** */

  /**
   * Essential function to load the records in the Chart.
   * @param datasource GeoChartDatasource The Datasource on which the records were grabbed
   * @param records TypeJsonObject[] The actual records to load in the Chart.
   */
  const processLoadingRecords = useCallback(
    (theInputs: GeoChartConfig<TType>, theLanguage: string, records: TypeJsonObject[] | undefined): void => {
      // Parse the data
      const parsedOptions = createChartJSOptions<TType>(theInputs, parentOptions!, theLanguage);
      const parsedData = createChartJSData<TType, TData, TLabel>(theInputs, records, parentData!);

      // Callback
      onParsed?.(theInputs!.chart, parsedOptions, parsedData);

      // Override
      setChartType(theInputs!.chart);
      setChartOptions(parsedOptions);
      setChartData(parsedData);
    },
    [parentData, parentOptions, onParsed]
  ) as (theInputs: GeoChartConfig<TType>, theLanguage: string, records: TypeJsonObject[] | undefined) => void;

  // Effect hook when the inputs change - coming from the parent component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_LOW, 'USE EFFECT PARENT INPUTS', parentInputs);

    // Refresh the inputs in this component
    setInputs(parentInputs);

    // Clear the selected datasource, because we're cleaning house
    setSelectedDatasource(undefined);

    // If parentInputs is specified
    if (parentInputs) {
      // Validate the schema of the received inputs
      setValidatorInputs(schemaValidator.validateInputs(parentInputs));
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PARENT INPUTS - UNMOUNT', parentInputs);
    };
  }, [parentInputs, schemaValidator]);

  // Effect hook when the inputs change - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT INPUTS', inputs);

    // Set the first datasource by default
    setSelectedDatasource(inputs?.datasources[0]);

    // If using the steps switcher options
    if (inputs?.ui?.stepsSwitcher) {
      // False by default
      let stepsSwitcher: string | false = false;
      if (inputs!.geochart.useSteps) stepsSwitcher = inputs!.geochart.useSteps;
      setStepSwitcher(stepsSwitcher);
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT INPUTS - UNMOUNT', inputs);
    };
  }, [inputs]);

  // Effect hook when the selected datasource changes - coming from parent component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_LOW, 'USE EFFECT PARENT DATASOURCE', parentDatasource);

    // Set the datasource as provided
    setSelectedDatasource(parentDatasource);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PARENT DATASOURCE - UNMOUNT', parentDatasource);
    };
  }, [parentDatasource]);

  // Effect hook when the selected datasource changes - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT SELECTED DATASOURCE', inputs, selectedDatasource);

    // Clear any record filters
    setFilteredRecords(undefined);

    // If selectedDatasource is specified
    if (selectedDatasource) {
      processAxes(inputs!.geochart, selectedDatasource!.items!);
      processLoadingRecords(inputs!, i18n.language, selectedDatasource!.items);
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT SELECTED DATASOURCE - UNMOUNT', selectedDatasource);
    };
  }, [inputs, i18n.language, selectedDatasource, processLoadingRecords]);

  // Effect hook when the filtered records change - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT SELECTED DATASOURCE FILTERED RECORDS', selectedDatasource, filteredRecords);

    // Process loading records
    if (selectedDatasource) processLoadingRecords(inputs!, i18n.language, filteredRecords || selectedDatasource!.items);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT SELECTED DATASOURCE FILTERED RECORDS - UNMOUNT', selectedDatasource);
    };
  }, [inputs, i18n.language, selectedDatasource, processLoadingRecords, filteredRecords]);

  // Effect hook when the main props about charttype, options and data change - coming from parent component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_LOW, 'USE EFFECT PARENT CHARTJS INPUTS');

    // Override
    setChartType(parentChart!);
    setChartOptions(parentOptions!);
    setChartData(parentData!);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PARENT CHARTJS INPUTS - UNMOUNT');
    };
  }, [parentChart, parentOptions, parentData]);

  // Effect hook when the chartOptions, chartData change - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT CHARTJS OPTIONS+DATA', chartOptions, chartData);

    // Validate the parsing we did do follow ChartJS options schema validating
    if (chartOptions) setValidatorOptions(schemaValidator.validateOptions(chartOptions));
    // Validate the parsing we did do follow ChartJS data schema validating
    if (chartData) setValidatorData(schemaValidator.validateData(chartData));

    // Always perform a redraw (fixes some unfortunate ChartJS UI issues)
    performRedraw();

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT CHARTJS OPTIONS+DATA - UNMOUNT');
    };
  }, [chartOptions, chartData, schemaValidator]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT VALIDATORS INPUTS', hasValidSchemas([validatorInputs]));

    // If any error
    if (!hasValidSchemas([validatorInputs])) {
      // If a callback is defined
      onError?.([validatorInputs]);
      // eslint-disable-next-line no-console
      console.error([validatorInputs]);
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT VALIDATORS INPUTS - UNMOUNT');
    };
  }, [validatorInputs, onError]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT VALIDATORS OPTIONS+DATA', hasValidSchemas([validatorOptions, validatorData]));

    // If any error
    if (!hasValidSchemas([validatorOptions, validatorData])) {
      // If a callback is defined
      onError?.([validatorOptions, validatorData]);
      // eslint-disable-next-line no-console
      console.error([validatorOptions, validatorData]);
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT VALIDATORS OPTIONS+DATA - UNMOUNT');
    };
  }, [validatorOptions, validatorData, onError]);

  // Effect hook when an action needs to happen - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT ACTION');

    // If redraw is true, reset the property in the action, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
    // A bit funky, but only way I could find without having code in the Parent Component.
    if (action?.shouldRedraw) {
      action!.shouldRedraw = false;
      // Redraw
      performRedraw();
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT ACTION - UNMOUNT');
    };
  }, [action]);

  // Effect hook to be executed with i18n
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT ADD_RESOURCE_BUNDLE');

    // Add GeoChart translations file
    i18n.addResourceBundle('en', 'translation', T_EN);
    i18n.addResourceBundle('fr', 'translation', T_FR);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT ADD_RESOURCE_BUNDLE - UNMOUNT');
    };
  }, [i18n]);

  /** ********************************************* HOOKS SECTION END *************************************************** */
  /** ******************************************** RENDER SECTION START ************************************************* */

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    return <ChartReact ref={chartRef} type={chartType!} data={chartData} options={chartOptions} redraw={redraw} />;
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
          <Box sx={sxClasses.xSliderWrapper}>
            <Slider
              min={xSliderMin}
              max={xSliderMax}
              step={xSliderSteps}
              value={xSliderValues}
              customOnChange={handleSliderXChange}
              onValueDisplay={handleSliderXValueDisplay}
              onValueDisplayAriaLabel={handleSliderXValueDisplay}
            />
          </Box>
        );
      }
    }

    // Empty
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
        return (
          <Box sx={sxClasses.ySliderWrapper}>
            <Slider
              min={ySliderMin}
              max={ySliderMax}
              step={ySliderSteps}
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

    // Empty
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
        menuItems.push({ key: s.value || s.display, item: { value: s.value || s.display, children: s.display || s.value } });
      });
      return (
        <Box>
          <Select
            sx={sxClasses.datasourceSelector}
            label={t('geochart.feature')}
            onChange={handleDatasourceChanged}
            menuItems={menuItems}
            value={selectedDatasource?.value || selectedDatasource?.display || ''}
          />
        </Box>
      );
    }

    // Empty
    return <Box />;
  };

  /**
   * Renders the Title of the GeoChart
   * @returns The Ttile Element
   */
  const renderTitle = (): JSX.Element => {
    if (inputs) {
      return <Box sx={sxClasses.title}>{inputs.title}</Box>;
    }

    // Empty
    return <Box />;
  };

  /**
   * Renders the UI Options
   * @returns The UI Options Element
   */
  const renderUIOptions = (): JSX.Element => {
    if (inputs?.ui) {
      // If steps switcher
      if (inputs!.ui.stepsSwitcher) {
        // Create the menu items
        const menuItems: (typeof TypeMenuItemProps)[] = [];
        StepsPossibilitiesConst.forEach((stepOption: string | boolean) => {
          menuItems.push({ key: stepOption, item: { value: stepOption, children: stepOption.toString() } });
        });

        return (
          <Box sx={sxClasses.uiOptions}>
            <Select
              sx={sxClasses.uiOptionsStepsSelector}
              label={t('geochart.steps')}
              onChange={handleStepsSwitcherChanged}
              menuItems={menuItems}
              value={selectedStepSwitcher || false}
            />
          </Box>
        );
      }
    }

    // Empty
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
        const label = chartType === 'pie' || chartType === 'doughnut' ? `${t('geochart.category')}:` : '';
        // The 9px padding here is because of alignment issues with the inner-padding used by the checkboxes components
        return (
          <Box>
            <Typography sx={sxClasses.checkDatasetWrapperLabel}>{label}</Typography>
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
                  <Typography sx={{ ...sxClasses.checkDatasetLabel, ...{ color } }} noWrap>
                    {ds.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        );
      }
    }

    // Empty
    return <Box />;
  };

  /**
   * Renders the Data selector for the pie and doughnut charts
   * @returns The Data selector Element
   */
  const renderDataSelector = (): JSX.Element => {
    if (chartData) {
      const { labels, datasets } = chartData;
      if ((chartType === 'pie' || chartType === 'doughnut') && labels && datasets && labels.length > 1 && datasets.length >= 1) {
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
                  <Typography sx={{ ...sxClasses.checkDatasetLabel, ...{ color } }} noWrap>
                    {lbl}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        );
      }
    }

    // Empty
    return <Box />;
  };

  /**
   * Renders the Chart container JSX.Element or an empty box
   * @returns The Chart container JSX.Element or an empty box
   */
  const renderChartContainer = (): JSX.Element => {
    // If not loading
    if (chartOptions) {
      // The xs: 1, 11 and 12 used here are as documented online
      return (
        <Box sx={{ ...sx, ...sxClasses.mainGeoChartContainer }}>
          <Grid container>
            <Grid item xs={12}>
              <Box sx={sxClasses.header}>
                {renderDatasourceSelector()}
                {renderTitle()}
                {renderUIOptions()}
              </Box>
              {renderDataSelector()}
              {renderDatasetSelector()}
            </Grid>
            <Grid item sx={sxClasses.chartContent} xs={11}>
              {isLoadingDatasource && <CircularProgress sx={sxClasses.loadingDatasource} />}
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

    // Empty
    return <Box />;
  };

  /**
   * Renders the complete GeoChart Component including the possible loading circle progress when Component is in loading state.
   * @returns The complete GeoChart Component container JSX.Element
   */
  const renderEverything = (): JSX.Element => {
    return (
      <Box sx={sxClasses.mainContainer}>
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
    return (
      <Box sx={sxClasses.chartError}>
        {t('geochart.parsingError')} {t('geochart.viewConsoleDetails')}
      </Box>
    );
  };

  // If no errors
  if (hasValidSchemas([validatorInputs, validatorOptions, validatorData])) {
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
  sx: null,
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
