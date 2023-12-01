import { Chart as ChartJS, ChartType, ChartOptions, ChartData, ChartDataset, registerables } from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
import {
  GeoChartConfig,
  GeoChartAction,
  GeoChartDefaultColors,
  GeoDefaultDataPoint,
  GeoChartOptionsGeochart,
  GeoChartOptionsUI,
  GeoChartQuery,
  GeoChartDatasource,
  GeoChartSelectedDatasets,
  TypeJsonObject,
  StepsPossibilitiesConst,
  StepsPossibilities,
  DATE_OPTIONS_LONG,
} from './chart-types';
import { SchemaValidator, ValidatorResult } from './chart-schema-validator';
import { createChartJSOptions, createChartJSData, fetchItemsViaQueryForDatasource } from './chart-parsing';
import { isNumber, extractColor, downloadJson } from './chart-util';
import { sxClasses } from './chart-style';
import { log, LOG_LEVEL_MAXIMUM, LOG_LEVEL_HIGH, LOG_LEVEL_MEDIUM, LOG_LEVEL_LOW } from './logger';
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
  onDatasourceChanged?: (value: GeoChartDatasource | undefined, language: string) => void;
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
  const {
    Box,
    Grid,
    Button,
    ButtonDropDown,
    Checkbox,
    Select,
    MenuItem,
    TypeMenuItemProps,
    Typography,
    SliderBase: Slider,
    CircularProgress,
  } = cgpv.ui.elements;
  const {
    sx: elStyle,
    schemaValidator,
    inputs: parentInputs,
    datasource: parentDatasource,
    chart: parentChart,
    options: parentOptions,
    data: parentData,
    action: parentAction,
    defaultColors,
    isLoadingChart,
    isLoadingDatasource: parentLoadingDatasource,
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

  // #region USE STATE SECTION ****************************************************************************************

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
  const [action, setAction] = useState() as [GeoChartAction, React.Dispatch<GeoChartAction>];
  const [selectedDatasets, setSelectedDatasets] = useState({}) as [GeoChartSelectedDatasets, React.Dispatch<GeoChartSelectedDatasets>];
  const [selectedDatas, setSelectedDatas] = useState({}) as [GeoChartSelectedDatasets, React.Dispatch<GeoChartSelectedDatasets>];
  const [redraw, setRedraw] = useState(parentAction?.shouldRedraw) as [boolean | undefined, React.Dispatch<boolean | undefined>];
  const [filteredRecords, setFilteredRecords] = useState() as [TypeJsonObject[] | undefined, React.Dispatch<TypeJsonObject[] | undefined>];
  const [xSliderMin, setXSliderMin] = useState(0) as [number, React.Dispatch<number>];
  const [xSliderMax, setXSliderMax] = useState(0) as [number, React.Dispatch<number>];
  const [xSliderSteps, setXSliderSteps] = useState(1) as [number, React.Dispatch<number>];
  const [xSliderValues, setXSliderValues] = useState() as [number | number[], React.Dispatch<number | number[]>];
  const [ySliderMin, setYSliderMin] = useState(0) as [number, React.Dispatch<number>];
  const [ySliderMax, setYSliderMax] = useState(0) as [number, React.Dispatch<number>];
  const [ySliderSteps, setYSliderSteps] = useState(1) as [number, React.Dispatch<number>];
  const [ySliderValues, setYSliderValues] = useState() as [number | number[], React.Dispatch<number | number[]>];
  const [validatorInputs, setValidatorInputs] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [validatorOptions, setValidatorOptions] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];
  const [validatorData, setValidatorData] = useState() as [ValidatorResult | undefined, React.Dispatch<ValidatorResult | undefined>];

  let stepsSwitcher: StepsPossibilities = false; // False by default
  if (inputs && inputs!.geochart.useSteps) stepsSwitcher = inputs!.geochart.useSteps;
  const [selectedSteps, setSelectedSteps] = useState(stepsSwitcher) as [
    StepsPossibilities | undefined,
    React.Dispatch<StepsPossibilities | undefined>
  ];

  const [isLoadingDatasource, setIsLoadingDatasource] = useState(parentLoadingDatasource) as [boolean, React.Dispatch<boolean>];

  const chartRef = useRef() as React.MutableRefObject<ChartJS<TType, TData>>;

  // #endregion

  // #region CORE FUNCTIONS *******************************************************************************************

  /**
   * Helper function to set the x and y axes based on the inputs and values.
   * @param geochart GeoChartOptionsGeochart The Geochart options
   * @param datasourceItems TypeJsonObject[] The Datasource items
   */
  const processAxes = (
    geochart: GeoChartOptionsGeochart,
    uiOptions: GeoChartOptionsUI | undefined,
    datasourceItems: TypeJsonObject[]
  ): (number | undefined)[] => {
    // If has a xSlider and property and numbers as property
    let xMinVal = uiOptions?.xSlider?.min;
    let xMaxVal = uiOptions?.xSlider?.max;
    if (uiOptions?.xSlider?.display) {
      // If using numbers as data value
      if (datasourceItems && datasourceItems.length > 0 && isNumber(datasourceItems![0][geochart.xAxis.property])) {
        // If either min or max isn't preset
        if (xMinVal === undefined || xMaxVal === undefined) {
          // Dynamically calculate them
          const values = datasourceItems!.map((x: TypeJsonObject) => {
            return x[geochart.xAxis.property] as number;
          });
          xMinVal = xMinVal !== undefined ? xMinVal : Math.floor(Math.min(...values));
          xMaxVal = xMaxVal !== undefined ? xMaxVal : Math.ceil(Math.max(...values));
        }
        setXSliderMin(xMinVal);
        setXSliderMax(xMaxVal);

        // If steps are determined by config
        if (uiOptions?.xSlider!.step) setXSliderSteps(uiOptions?.xSlider!.step);
      }
    }

    // If has a ySlider and property
    let yMinVal = uiOptions?.ySlider?.min;
    let yMaxVal = uiOptions?.ySlider?.max;
    if (uiOptions?.ySlider?.display) {
      // If using numbers as data value
      if (datasourceItems && datasourceItems.length > 0 && isNumber(datasourceItems![0][geochart.yAxis.property])) {
        // If either min or max isn't preset
        if (yMinVal === undefined || yMaxVal === undefined) {
          // Dynamically calculate them
          const values = datasourceItems!.map((x: TypeJsonObject) => {
            return x[geochart.yAxis.property] as number;
          });
          yMinVal = yMinVal !== undefined ? yMinVal : Math.floor(Math.min(...values));
          yMaxVal = yMaxVal !== undefined ? yMaxVal : Math.ceil(Math.max(...values));
        }
        setYSliderMin(yMinVal);
        setYSliderMax(yMaxVal);

        // If steps are determined by config
        if (uiOptions?.ySlider!.step) setYSliderSteps(uiOptions?.ySlider!.step);
      }
    }

    return [xMinVal, xMaxVal, yMinVal, yMaxVal];
  };

  /**
   * Helper function to set the x and y axes values based on the min and max of the data or if the values were already set in state.
   * @param xMinVal number | undefined
   * @param xMaxVal number | undefined
   * @param yMinVal number | undefined
   * @param yMaxVal number | undefined
   * @param theXSliderValues number[] | undefinedd
   * @param theYSliderValues number[] | undefined
   */
  const processAxesValues = (
    xMinVal: number | undefined,
    xMaxVal: number | undefined,
    yMinVal: number | undefined,
    yMaxVal: number | undefined,
    theXSliderValues: number[] | undefined,
    theYSliderValues: number[] | undefined
  ): [boolean, number[]] => {
    // If still not set
    let valuesComeFromState: boolean = false;
    if (xMaxVal && !theXSliderValues) {
      // Set the values for x axis to min/max
      setXSliderValues([xMinVal!, xMaxVal!]);
    } else if (theXSliderValues) {
      // eslint-disable-next-line no-param-reassign
      [xMinVal, xMaxVal] = theXSliderValues;
      valuesComeFromState = true;
    }
    // If still not set
    if (yMaxVal && !theYSliderValues) {
      // Set the state
      setYSliderValues([yMinVal!, yMaxVal!]);
    } else if (theYSliderValues) {
      // eslint-disable-next-line no-param-reassign
      [yMinVal, yMaxVal] = theYSliderValues;
      valuesComeFromState = true;
    }

    // Return if the values were set
    return [valuesComeFromState, [xMinVal!, xMaxVal!, yMinVal!, yMaxVal!]];
  };

  /**
   * Fetches the items to associated to the given Datasource and then sets the Datasource in GeoChart
   * @param chartConfig GeoViewGeoChartConfig The chart configuration being used
   * @param ds GeoChartDatasource The Datasource to fetch the items for
   */
  const fetchDatasourceItems = async (
    chartQuery: GeoChartQuery,
    sourceItem: TypeJsonObject,
    language: string
  ): Promise<TypeJsonObject[]> => {
    try {
      // Loading
      setIsLoadingDatasource(true);

      // Fetch the items for the data source in question
      return await fetchItemsViaQueryForDatasource(chartQuery, sourceItem, language);
    } finally {
      // Done
      setIsLoadingDatasource(false);
    }
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
  const performRedraw = (): Promise<void> => {
    return new Promise<void>((resolve) => {
      setRedraw(true);
      setTimeout(() => {
        setRedraw(false);
        resolve();
      }, 200);
    });
  };

  // #endregion

  // #region EVENT HANDLERS SECTION ***********************************************************************************

  /**
   * Handles when the Datasource changes
   * @param e Event The Select change event
   * @param item MenuItem The selected MenuItem
   */
  const handleDatasourceChanged = async (e: Event, item: typeof MenuItem): Promise<void> => {
    // Find the selected datasource reference based on the MenuItem
    const ds: GeoChartDatasource | undefined = inputs!.datasources.find((x) => {
      return (x.value || x.display) === item.props.value;
    });
    if (!ds) return;

    // If the data source has no items
    if (!ds.items) {
      ds.items = await fetchDatasourceItems(inputs!.query!, ds.sourceItem, i18n.language);
    }

    // Set the selected datasource
    setSelectedDatasource(ds);

    // Callback
    onDatasourceChanged?.(ds, i18n.language);
  };

  /**
   * Handles when a dataset was checked/unchecked (via the legend)
   * @param datasetIndex number Indicates the dataset index that was checked/unchecked
   * @param datasetLabel string | undefined Indicates the dataset label that was checked/unchecked
   * @param checked boolean Indicates the checked state
   */
  const handleDatasetChecked = (datasetIndex: number, datasetLabel: string | undefined, checked: boolean): void => {
    // Keep track
    selectedDatasets[datasetLabel!] = checked;

    // Update
    setSelectedDatasets({ ...selectedDatasets });

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
    // Keep track
    selectedDatas[dataLabel] = checked;

    // Update
    setSelectedDatas({ ...selectedDatas });

    // Callback
    onDataChanged?.(dataIndex, dataLabel, checked);
  };

  /**
   * Handles when the X Slider changes
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXChange = (newValue: number | number[]): void => {
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
    // Set the Y State
    setYSliderValues(newValue);

    // Callback
    onSliderYChanged?.(newValue);
  };

  /**
   * Handles when the Steps Switcher changes
   * @param value string Indicates the steps value
   */
  const handleStepsSwitcherChanged = (e: unknown, item: typeof MenuItem): void => {
    // Set the step switcher
    setSelectedSteps(item.props.value);

    // Callback
    onStepSwitcherChanged?.(item.props.value);
  };

  /**
   * Handles when the States must be cleared
   */
  const handleResetStates = (): void => {
    // Reset all selected datasets to true
    Object.keys(selectedDatasets).forEach((dataset: string) => {
      selectedDatasets[dataset] = true;
    });

    // Reset all selected datasets to true
    Object.keys(selectedDatas).forEach((data: string) => {
      selectedDatas[data] = true;
    });

    // Clear all states
    setSelectedDatasets({ ...selectedDatasets });
    setSelectedDatas({ ...selectedDatas });
    setSelectedSteps(false);
    setXSliderValues([xSliderMin, xSliderMax]);
    setYSliderValues([ySliderMin, ySliderMax]);
  };

  /**
   * Handles the display of the label on the X Slider
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXValueDisplay = (value: number): string => {
    // If current chart has time as xAxis
    if (inputs?.geochart?.xAxis.type === 'time' || inputs?.geochart?.xAxis.type === 'timeseries') {
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
   * Handles when the download button is clicked
   * @param value number Indicates the button drop down selection when it was clicked
   */
  const handleDownloadClick = (index: number): void => {
    // Get the data
    const data = { ...selectedDatasource! };

    // If only the filtered information
    if (index === 0) {
      data.items = filteredRecords;

      // If using categories
      if (inputs?.category) {
        // The selected datasets strings
        const selDatasetsStrings = Object.keys(selectedDatasets).filter((ds) => {
          return selectedDatasets[ds];
        });

        // Also filter on the selected datasets
        data.items = data.items?.filter((value: TypeJsonObject) => {
          return selDatasetsStrings.includes(value[inputs!.category!.property] as string);
        });

        // In case of pie/doughnut
        if (chartType === 'pie' || chartType === 'doughnut') {
          // The selected datas strings
          const selDatasStrings = Object.keys(selectedDatas).filter((ds) => {
            return selectedDatas[ds];
          });

          // Also filter on selected datas
          data.items = data.items?.filter((value: TypeJsonObject) => {
            return selDatasStrings.includes(value[inputs!.geochart.xAxis.property] as string);
          });
        }
      }
    }

    // Download the data as json
    downloadJson(data, 'chart-data.json');
  };

  // #endregion

  // #region HOOKS SECTION ********************************************************************************************

  /**
   * Helper function to filter datasource items based on 2 possible and independent axis.
   * For performance reasons, the code cumulates the filtered data instead of treating the axes individually.
   * @param datasourceItems TypeJsonObject[] The Datasource items
   * @param xValues number | number[] The values in X to filter on
   * @param yValues number | number[] The values in Y to filter on
   */
  const processFiltering = useCallback(
    (theInputs: GeoChartConfig<TType>, datasourceItems: TypeJsonObject[], xValues: number | number[], yValues: number | number[]): void => {
      // If chart type is line
      let resItemsFinal: TypeJsonObject[] = [...datasourceItems!];
      if (theInputs?.chart === 'line') {
        // If filterings on x supported
        if (Array.isArray(xValues) && xValues.length === 2) {
          // If filtering on time values
          if (theInputs?.geochart?.xAxis.type === 'time' || theInputs?.geochart?.xAxis.type === 'timeseries') {
            // Grab the filters
            const theDateFrom = new Date(xValues[0]);
            const theDateTo = new Date(xValues[1]);

            // Filter the datasourceItems
            resItemsFinal = datasourceItems!.filter((item: TypeJsonObject) => {
              const d = new Date(item[theInputs.geochart.xAxis.property] as string);
              return theDateFrom <= d && d <= theDateTo;
            });
          } else {
            // Default filtering on number values
            const from = xValues[0];
            const to = xValues[1];

            // Filter the datasourceItems
            resItemsFinal = datasourceItems!.filter((item: TypeJsonObject) => {
              return (
                from <= (item[theInputs.geochart.xAxis.property] as number) && (item[theInputs.geochart.xAxis.property] as number) <= to
              );
            });
          }
        }

        // If more filterings on y, cumulate it
        if (Array.isArray(yValues) && yValues.length === 2) {
          const from = yValues[0];
          const to = yValues[1];

          // Filter the rest of the items using the reminding items
          resItemsFinal = resItemsFinal.filter((item: TypeJsonObject) => {
            return from <= (item[theInputs.geochart.yAxis.property] as number) && (item[theInputs.geochart.yAxis.property] as number) <= to;
          });
        }
      }

      // Set new filtered inputs
      setFilteredRecords(resItemsFinal);
    },
    []
  ) as (
    theInputs: GeoChartConfig<TType>,
    datasourceItems: TypeJsonObject[],
    xValues: number | number[],
    yValues: number | number[]
  ) => void;

  /**
   * Updates the selected datasets object in synch with the actual datasets read from the data.
   * @param theChartData ChartData<TType, TData, TLabel>
   */
  const processLoadingRecordsUpdateDatasets = useCallback((theChartData: ChartData<TType, TData, TLabel>): void => {
    // Get the dataset labels for the new data
    let oneSelectedDatasetNew = false;
    theChartData.datasets
      .map((x: ChartDataset<TType, TData>) => {
        return x.label!;
      })
      .forEach((label: string) => {
        // If not set
        if (selectedDatasets[label] === undefined) {
          selectedDatasets[label] = true;
          oneSelectedDatasetNew = true;
        }
      });

    // If at least one dataset was new
    if (oneSelectedDatasetNew) setSelectedDatasets({ ...selectedDatasets });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) as (theChartData: ChartData<TType, TData, TLabel>) => void; // No need for the selectedDatasets dependency (for performance)

  /**
   * Updates the selected data object in synch with the actual labels read from the data.
   * @param theChartData ChartData<TType, TData, TLabel>
   */
  const processLoadingRecordsUpdateLabels = useCallback((theChartData: ChartData<TType, TData, TLabel>): void => {
    // Get the labels for the new data
    let oneSelectedDataNew = false;
    theChartData.labels?.forEach((label: string) => {
      // If not set
      if (selectedDatas[label] === undefined) {
        selectedDatas[label] = true;
        oneSelectedDataNew = true;
      }
    });

    // If at least one dataset was new
    if (oneSelectedDataNew) setSelectedDatas({ ...selectedDatas });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) as (theChartData: ChartData<TType, TData, TLabel>) => void; // No need for the selectedDatas dependency (for performance)

  /**
   * Updates the chart dataset visibility based on the currently selected datasets.
   * @param theChartData ChartData<TType, TData, TLabel>
   * @param theSelectedDatasets GeoChartSelectedDatasets
   */
  const updateDatasetVisibilityUsingState = useCallback(
    (theChartData: ChartData<TType, TData, TLabel>, theSelectedDatasets: GeoChartSelectedDatasets): void => {
      // Log
      if (!chartRef.current) return;

      // Get the current dataset labels
      const dsLabels = theChartData.datasets.map((x: ChartDataset<TType, TData>) => {
        return x.label!;
      });

      // Make sure the datasets visibility follow the state
      Object.keys(theSelectedDatasets).forEach((value: string) => {
        chartRef.current.setDatasetVisibility(dsLabels.indexOf(value), theSelectedDatasets[value]);
      });

      // Update visibility
      chartRef.current.update();
    },
    []
  ) as (theChartData: ChartData<TType, TData, TLabel>, theSelectedDatasets: GeoChartSelectedDatasets) => void;

  /**
   * Updates the chart data visibility based on the currently selected data.
   * @param theChartData ChartData<TType, TData, TLabel>
   * @param theSelectedData GeoChartSelectedDatasets
   */
  const updateDataVisibilityUsingState = useCallback(
    (theChartType: TType, theChartData: ChartData<TType, TData, TLabel>, theSelectedDatas: GeoChartSelectedDatasets): void => {
      // Log
      if (!chartRef.current) return;
      if (theChartType !== 'pie' && theChartType !== 'doughnut') return;

      // Make sure the datas visibility follow the state
      theChartData.labels?.forEach((value: TLabel) => {
        const idx = theChartData.labels!.indexOf(value);
        const currVis = chartRef.current.getDataVisibility(idx);
        if (theSelectedDatas[value] !== currVis) {
          chartRef.current.toggleDataVisibility(idx);
        }
      });

      // Update visibility
      chartRef.current.update();
    },
    []
  ) as (theChartType: TType, theChartData: ChartData<TType, TData, TLabel>, theSelectedDatas: GeoChartSelectedDatasets) => void;

  /**
   * Essential function to load the records in the Chart.
   * @param datasource GeoChartDatasource The Datasource on which the records were grabbed
   * @param records TypeJsonObject[] The actual records to load in the Chart.
   */
  const processLoadingRecords = useCallback(
    (theInputs: GeoChartConfig<TType>, theLanguage: string, theSteps: StepsPossibilities, records: TypeJsonObject[] | undefined): void => {
      // Parse the data
      const parsedOptions = createChartJSOptions<TType>(theInputs, parentOptions!, theLanguage);
      const parsedData = createChartJSData<TType, TData, TLabel>(theInputs, theSteps, records, parentData!);

      // Callback
      onParsed?.(theInputs!.chart, parsedOptions, parsedData);

      // Override
      setChartType(theInputs!.chart);
      setChartOptions(parsedOptions);
      setChartData(parsedData);

      // Update the selected datasets
      processLoadingRecordsUpdateDatasets(parsedData);
      processLoadingRecordsUpdateLabels(parsedData);

      // If the resulting datasets array is empty, force a redraw action, otherwise ChartJS hands on the last shown graphic
      if (parsedData.datasets?.length === 0) setAction({ shouldRedraw: true });
    },
    [parentData, parentOptions, onParsed, processLoadingRecordsUpdateDatasets, processLoadingRecordsUpdateLabels]
  ) as (theInputs: GeoChartConfig<TType>, theLanguage: string, theSteps: StepsPossibilities, records: TypeJsonObject[] | undefined) => void;

  /**
   * Makes sure the datasource items are initialized correctly for the first load of the Chart.
   * @param datasource GeoChartDatasource The Datasource on which the records were grabbed
   * @param records TypeJsonObject[] The actual records to load in the Chart.
   */
  const initDatasourceItems = useCallback(
    async (chartQuery: GeoChartQuery | undefined, ds: GeoChartDatasource, language: string): Promise<void> => {
      // If no items
      const datasourceToLoad = ds;
      if (!ds.items) {
        // Must fetch straight away
        datasourceToLoad.items = await fetchDatasourceItems(chartQuery!, ds.sourceItem, language);
      }

      // Set the datasource
      setSelectedDatasource(datasourceToLoad);
    },
    []
  ) as (chartQuery: GeoChartQuery | undefined, ds: GeoChartDatasource, language: string) => Promise<void>;

  // Effect hook when the inputs change - coming from parent component.
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

    // Reset selected datasets (leave the code there, tentatively for now)
    // setSelectedDatasets({});

    // If no datasources on the inputs, create a default one
    if (inputs) {
      // Init the datasource items for the first record and sets it
      initDatasourceItems(inputs!.query, inputs!.datasources[0], i18n.language);
    } else setSelectedDatasource(undefined);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT INPUTS - UNMOUNT', inputs);
    };
  }, [inputs, i18n.language, initDatasourceItems]);

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
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT PROCESS DATA', inputs, selectedDatasource);

    // Clear any record filters
    setFilteredRecords(undefined);

    // If selectedDatasource is specified
    if (selectedDatasource) {
      // Process the axes
      let [xMinVal, xMaxVal, yMinVal, yMaxVal] = processAxes(inputs!.geochart, inputs!.ui, selectedDatasource!.items!);

      // If any sliders
      let valuesComeFromState = false;
      [valuesComeFromState, [xMinVal, xMaxVal, yMinVal, yMaxVal]] = processAxesValues(
        xMinVal,
        xMaxVal,
        yMinVal,
        yMaxVal,
        xSliderValues as number[],
        ySliderValues as number[]
      );

      // If using the state, filter right away
      if (valuesComeFromState) {
        // Load data with filters
        processFiltering(inputs!, selectedDatasource!.items!, [xMinVal!, xMaxVal!], [yMinVal!, yMaxVal!]);
      } else {
        // Load records without filtering for nothing
        processLoadingRecords(inputs!, i18n.language, selectedSteps!, selectedDatasource!.items);
      }
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PROCESS DATA - UNMOUNT', selectedDatasource);
    };
  }, [inputs, i18n.language, selectedDatasource, selectedSteps, xSliderValues, ySliderValues, processLoadingRecords, processFiltering]);

  // Effect hook when the filtered records change - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT PROCESS DATA FILTERED RECORDS', selectedDatasource, filteredRecords, selectedSteps);

    // Process loading records
    if (selectedDatasource) processLoadingRecords(inputs!, i18n.language, selectedSteps!, filteredRecords || selectedDatasource!.items);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PROCESS DATA FILTERED RECORDS - UNMOUNT', selectedDatasource);
    };
  }, [inputs, i18n.language, selectedDatasource, filteredRecords, selectedSteps, processLoadingRecords]);

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

    // If chart options. Validate the parsing we did do follow ChartJS options schema validating
    if (chartOptions) setValidatorOptions(schemaValidator.validateOptions(chartOptions));

    // If chart data. Validate the parsing we did do follow ChartJS data schema validating
    if (chartData) setValidatorData(schemaValidator.validateData(chartData));

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT CHARTJS OPTIONS+DATA - UNMOUNT');
    };
  }, [chartOptions, chartData, schemaValidator]);

  // Effect hook when the selectedDatasets change - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT SELECTED DATASETS', selectedDatasets);

    // Make sure the visibility of the chart aligns with the selected datasets
    updateDatasetVisibilityUsingState(chartData, selectedDatasets);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT SELECTED DATASETS - UNMOUNT');
    };
  }, [chartData, selectedDatasets, updateDatasetVisibilityUsingState]);

  // Effect hook when the selectedDatas change - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT SELECTED DATAS', selectedDatas);

    // Make sure the visibility of the chart aligns with the selected datas
    updateDataVisibilityUsingState(chartType, chartData, selectedDatas);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT SELECTED DATAS - UNMOUNT');
    };
  }, [chartType, chartData, selectedDatas, updateDataVisibilityUsingState]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_HIGH, 'USE EFFECT VALIDATORS INPUTS', hasValidSchemas([validatorInputs]));

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
    log(LOG_LEVEL_HIGH, 'USE EFFECT VALIDATORS OPTIONS+DATA', hasValidSchemas([validatorOptions, validatorData]));

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

  // Effect hook when an action needs to happen - coming from parent component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT PARENT ACTION', parentAction);

    // Set action for the component
    if (parentAction) setAction(parentAction);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PARENT ACTION - UNMOUNT');
    };
  }, [parentAction]);

  // Effect hook when an action needs to happen - coming from this component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT ACTION', action);

    // If redraw is true, reset the property in the action, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
    // A bit funky, but only way I could find without having code in the Parent Component.
    if (action?.shouldRedraw) {
      action!.shouldRedraw = false;
      // Redraw
      performRedraw().then(() => {
        // Readjust visibility, because redraw resets all datasets visibility to true
        updateDatasetVisibilityUsingState(chartData, selectedDatasets);
        updateDataVisibilityUsingState(chartType, chartData, selectedDatas);
      });
    }

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT ACTION - UNMOUNT');
    };
  }, [chartType, chartData, action, selectedDatasets, selectedDatas, updateDatasetVisibilityUsingState, updateDataVisibilityUsingState]);

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

  // Effect hook to be executed with loading datasource - coming from parent component.
  useEffect(() => {
    // Log
    log(LOG_LEVEL_MEDIUM, 'USE EFFECT PARENT LOADING DATASOURCE', parentLoadingDatasource);

    // If defined, update the state
    if (parentLoadingDatasource !== undefined) setIsLoadingDatasource(parentLoadingDatasource);

    return () => {
      // Log
      log(LOG_LEVEL_MAXIMUM, 'USE EFFECT PARENT LOADING DATASOURCE - UNMOUNT');
    };
  }, [parentLoadingDatasource]);

  // #endregion

  // #region RENDER SECTION *******************************************************************************************

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    return <ChartReact ref={chartRef} type={chartType!} data={chartData} options={chartOptions} redraw={redraw} />;
  };

  /**
   * Renders the X Axis label
   * @returns The Chart JSX.Element representing the X Axis label or an empty Box if no label
   */
  const renderXAxisLabel = (): JSX.Element => {
    if (chartType === 'line' || chartType === 'bar')
      return <Box sx={sxClasses.xAxisLabel}>{inputs?.geochart.xAxis.label || inputs?.geochart.xAxis.property}</Box>;
    return <Box />;
  };

  /**
   * Renders the Y Axis label
   * @returns The Chart JSX.Element representing the Y Axis label or an empty Box if no label
   */
  const renderYAxisLabel = (): JSX.Element => {
    // If line or bar chart
    if (chartType === 'line' || chartType === 'bar')
      return <Box sx={sxClasses.yAxisLabel}>{inputs?.geochart.yAxis.label || inputs?.geochart.yAxis.property}</Box>;
    return <Box />;
  };

  /**
   * Renders the X Chart Slider JSX.Element or an empty box
   * @returns The X Chart Slider JSX.Element or an empty box
   */
  const renderXSlider = (): JSX.Element => {
    // If inputs
    if (inputs && selectedDatasource) {
      if (inputs.chart === 'line' && inputs.ui?.xSlider?.display) {
        return (
          <Box sx={sxClasses.xSliderWrapper}>
            <Slider
              min={xSliderMin}
              max={xSliderMax}
              step={xSliderSteps}
              value={xSliderValues || 0}
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
      if (inputs.chart === 'line' && inputs.ui?.ySlider?.display) {
        return (
          <Box sx={sxClasses.ySliderWrapper}>
            <Slider
              min={ySliderMin}
              max={ySliderMax}
              step={ySliderSteps}
              value={ySliderValues || 0}
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
   * Renders a description text
   * @returns The Description text in a Box element
   */
  const renderDescription = (): JSX.Element => {
    // If an y description
    if (inputs?.ui?.description) {
      return <Box>{inputs.ui.description}</Box>;
    }
    return <Box />;
  };

  /**
   * Renders the download data button
   * @returns The Download data button if wanted in the UI
   */
  const renderDownload = (): JSX.Element => {
    if (inputs?.ui?.download) {
      return <ButtonDropDown onButtonClick={handleDownloadClick} options={[t('geochart.downloadFiltered'), t('geochart.downloadAll')]} />;
    }
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

  const renderUIOptionsStepsSwitcher = (): JSX.Element => {
    if (inputs?.ui?.stepsSwitcher) {
      // Create the menu items
      const menuItems: (typeof TypeMenuItemProps)[] = [];
      StepsPossibilitiesConst.forEach((stepOption: string | boolean) => {
        menuItems.push({ key: stepOption, item: { value: stepOption, children: stepOption.toString() } });
      });

      return (
        <Select
          sx={sxClasses.uiOptionsStepsSelector}
          label={t('geochart.steps')}
          onChange={handleStepsSwitcherChanged}
          menuItems={menuItems}
          value={selectedSteps || false}
        />
      );
    }
    return <Box />;
  };

  const renderUIOptionsResetStates = (): JSX.Element => {
    if (inputs?.ui?.resetStates) {
      return (
        <Button sx={sxClasses.uiOptionsResetStates} onClick={handleResetStates}>
          {t('reset states')}
        </Button>
      );
    }
    return <Box />;
  };

  /**
   * Renders the UI Options
   * @returns The UI Options Element
   */
  const renderUIOptions = (): JSX.Element => {
    return (
      <Box sx={sxClasses.uiOptions}>
        {renderUIOptionsStepsSwitcher()}
        {renderUIOptionsResetStates()}
      </Box>
    );
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      handleDatasetChecked(idx, ds.label, e.target?.checked);
                    }}
                    checked={selectedDatasets[ds.label!] !== undefined ? selectedDatasets[ds.label!] : true}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                      handleDataChecked(idx, lbl, e.target?.checked);
                    }}
                    checked={selectedDatas[lbl] !== undefined ? selectedDatas[lbl] : true}
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
            <Grid item xs={1}>
              {renderYAxisLabel()}
            </Grid>
            <Grid item sx={sxClasses.chartContent} xs={10}>
              {isLoadingDatasource && <CircularProgress sx={sxClasses.loadingDatasource} />}
              {renderChart()}
            </Grid>
            <Grid item xs={1}>
              {renderYSlider()}
            </Grid>
            <Grid item xs={1} />
            <Grid item xs={10}>
              {renderXAxisLabel()}
              {renderXSlider()}
            </Grid>
            <Grid item xs={12}>
              {renderDescription()}
              {renderDownload()}
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

  // #endregion

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
