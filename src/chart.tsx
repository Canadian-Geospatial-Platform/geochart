import { Chart as ChartJS, ChartType, ChartOptions, ChartData, ChartDataset, registerables, ChartConfiguration, Plugin } from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
// Keeping the import line commented, until we decide to use it or code an equivalent.
// So that a dev can locally install it to work. This package is pretty useful to track this GeoChart Component.
// import { useWhatChanged, setUseWhatChange } from '@simbathesailor/use-what-changed';
import {
  GeoChartConfig,
  GeoChartAction,
  GeoChartDefaultColors,
  GeoDefaultDataPoint,
  GeoChartOptionsGeochart,
  GeoChartOptionsUI,
  GeoChartQuery,
  GeoChartDatasource,
  GeoChartSelectedDataset,
  TypeJsonObject,
  StepsPossibilitiesConst,
  StepsPossibilities,
  DATE_OPTIONS_LONG,
  GeoChartDatasetOption,
} from './chart-types';
import { SchemaValidator, ValidatorResult } from './chart-schema-validator';
import { createChartJSOptions, createChartJSData, fetchItemsViaQueryForDatasource, setColorPalettes } from './chart-parsing';
import { isNumber, downloadJson, getColorFromPalette } from './chart-util';
import { sxClasses } from './chart-style';
import { logHigh, logUseEffectMount, logUseEffectUnmount } from './logger';
import T_EN from '../locales/en/translation.json';
import T_FR from '../locales/fr/translation.json';

// Activate useWhatChanged in development (leaving the code commented, see header of file for reason)
// setUseWhatChange(process.env.NODE_ENV === 'development');

/**
 * Main props for the Chart.
 * There are 2 main ways to create a chart:
 * (1) Using the 'inputs' parameter which configures an elaborated GeoChart or;
 * (2) Using the 'chart'+'options'+'data' parameters which creates a basic GeoChart with essential ChartJS parameters.
 */
export interface TypeChartChartProps<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string
> {
  // The schemas validator object
  schemaValidator: SchemaValidator;

  // Will be casted as CSSProperties later via the imported cgpv react
  sx?: unknown;

  // The official way to work with all GeoChart features
  inputs?: GeoChartConfig<TType>;

  // The selected datasource (the selected value in the dropdown on top left corner of the ui)
  datasource?: GeoChartDatasource;

  // When no inputs is specified, the GeoChart will use this chart props to work directly with ChartJS
  chart?: TType;
  // When no inputs is specified, the GeoChart will use this options props to work directly with ChartJS
  options?: ChartOptions<TType>;
  // When no inputs is specified, the GeoChart will use this data props to work directly with ChartJS
  data?: ChartData<TType, TData, TLabel>;

  // Indicate an action, user interface related, to be performed by the component
  action?: GeoChartAction;

  // The default colors to apply to the Chart look (essentially redirected to ChartJS)
  defaultColors?: GeoChartDefaultColors;

  // State indicating that the GeoChart is in 'loading' state
  isLoadingChart?: boolean;

  // State indicating that the GeoChart is in 'loading datasource' state
  isLoadingDatasource?: boolean;

  // Callback executed when the data source changes (the selected value in the dropdown on top left corner of the ui)
  onDatasourceChanged?: (value: GeoChartDatasource | undefined, language: string) => void;

  // Callback executed when the checked dataset (legend) changes
  onDatasetChanged?: (datasetIndex: number, datasetLabel: string | undefined, checked: boolean) => void;

  // Callback executed, for the pie/doughnut chart only, when the checked data changes
  onDataChanged?: (dataIndex: number, dataLabel: string, checked: boolean) => void;

  // Callback executed when user has changed the value on the slider on X axis
  onSliderXChanged?: (value: number | number[]) => void;

  // Callback executed when the value display for the X axis wants to show up
  onSliderXValueDisplaying?: (value: number) => string;

  // Callback executed when user has changed the value on the slider on Y axis
  onSliderYChanged?: (value: number | number[]) => void;

  // Callback executed when the value display for the Y axis wants to show up
  onSliderYValueDisplaying?: (value: number) => string;

  // Callback executed when the use has clicked the download button
  onDownloadClicked?: (value: GeoChartDatasource, index: number) => string;

  // Callback executed when user has selected another steps value from the ui (top right corner in the ui at the time of writing)
  onStepSwitcherChanged?: (value: string) => void;

  // Callback executed when user has clicked the reset states button (top right corner in the ui at the time of writing)
  onResetStates?: () => void;

  // Callback executed when the data coming from the inputs parameters have been parsed and is ready to redirect to ChartJS for rendering
  onParsed?: (chart: TType, options: ChartOptions<TType>, data: ChartData<TType, TData>) => void;

  // Callback executed when an error has happened
  onError?: (error: string, exception: unknown | undefined) => void;
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
    onDatasourceChanged,
    onDataChanged,
    onDatasetChanged,
    onSliderXChanged,
    onSliderXValueDisplaying,
    onSliderYChanged,
    onSliderYValueDisplaying,
    onDownloadClicked,
    onStepSwitcherChanged,
    onResetStates,
    onParsed,
    onError,
  } = props;

  // Translation
  const { t, i18n } = useTranslation();

  // Cast the style
  const sx = elStyle as typeof CSSProperties;

  // #region USE STATE SECTION ****************************************************************************************

  // TODO: Refactor - Check why the useState and useCallback coming from cgpv lose their generic capabilities.
  // TO.DO.CONT: This is rather problematic. It forces the devs to explicitely use some "not so pretty" type assertions
  // so that things remain typed instead of becoming 'any' when using functions such as 'useState', 'useCallback', 'useRef', etc.

  // Inner component states attached to the parent component
  const [inputs, setInputs] = useState(parentInputs) as [
    GeoChartConfig<TType> | undefined,
    React.Dispatch<GeoChartConfig<TType> | undefined>
  ];
  const [chartType, setChartType] = useState(parentChart!) as [TType, React.Dispatch<TType>];
  const [chartData, setChartData] = useState(parentData!) as [
    ChartData<TType, TData, TLabel>,
    React.Dispatch<ChartData<TType, TData, TLabel>>
  ];
  const [chartOptions, setChartOptions] = useState(parentOptions!) as [
    ChartOptions<TType> | undefined,
    React.Dispatch<ChartOptions<TType> | undefined>
  ];
  const [selectedDatasource, setSelectedDatasource] = useState(parentDatasource) as [
    GeoChartDatasource | undefined,
    React.Dispatch<GeoChartDatasource | undefined>
  ];
  const [redraw, setRedraw] = useState(parentAction?.shouldRedraw) as [boolean | undefined, React.Dispatch<boolean | undefined>];
  const [isLoadingDatasource, setIsLoadingDatasource] = useState(parentLoadingDatasource) as [boolean, React.Dispatch<boolean>];

  // Inner component states unrelated to the parent component
  const [action, setAction] = useState() as [GeoChartAction, React.Dispatch<GeoChartAction>];
  const [datasetRegistry, setDatasetRegistry] = useState({}) as [GeoChartSelectedDataset, React.Dispatch<GeoChartSelectedDataset>];
  const [datasRegistry, setDatasRegistry] = useState({}) as [GeoChartSelectedDataset, React.Dispatch<GeoChartSelectedDataset>];
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
  const [selectedSteps, setSelectedSteps] = useState(inputs?.geochart.useSteps || false) as [
    StepsPossibilities,
    React.Dispatch<StepsPossibilities>
  ];
  const [plugins, setPlugins] = useState() as [Plugin<TType, unknown>[] | undefined, React.Dispatch<Plugin<TType, unknown>[] | undefined>];
  const [colorPaletteCategoryBackgroundIndex, setColorPaletteCategoryBackgroundIndex] = useState(0) as [number, React.Dispatch<number>];
  const [colorPaletteCategoryBorderIndex, setColorPaletteCategoryBorderIndex] = useState(0) as [number, React.Dispatch<number>];
  const [colorPaletteAxisBackgroundIndex, setColorPaletteAxisBackgroundIndex] = useState(0) as [number, React.Dispatch<number>];
  const [colorPaletteAxisBorderIndex, setColorPaletteAxisBorderIndex] = useState(0) as [number, React.Dispatch<number>];

  const chartRef = useRef() as React.MutableRefObject<ChartJS<TType, TData, TLabel>>;

  // #endregion

  // #region DEFAULTS SECTION *****************************************************************************************

  // Attribute the ChartJS default colors
  if (defaultColors?.backgroundColor) ChartJS.defaults.backgroundColor = defaultColors?.backgroundColor;
  if (defaultColors?.borderColor) ChartJS.defaults.borderColor = defaultColors?.borderColor;
  if (defaultColors?.color) ChartJS.defaults.color = defaultColors?.color;

  // Attribute the color palettes
  setColorPalettes(inputs);

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
    datasourceItems: TypeJsonObject[] | undefined
  ): (number | undefined)[] => {
    // If has a xSlider and property and numbers as property
    let xMinVal = uiOptions?.xSlider?.min;
    let xMaxVal = uiOptions?.xSlider?.max;
    if (uiOptions?.xSlider?.display) {
      // If using numbers as data value
      if (datasourceItems && datasourceItems.length > 0) {
        // If either min or max isn't preset
        if (xMinVal === undefined || xMaxVal === undefined) {
          // Dynamically calculate them
          const values = datasourceItems!.map((x: TypeJsonObject) => {
            // If date
            if (geochart.xAxis.type === 'time' || geochart.xAxis.type === 'timeseries') {
              return new Date(x[geochart.xAxis.property] as string).getTime();
            }
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
    uiOptions: GeoChartOptionsUI | undefined,
    xMinVal: number | undefined,
    xMaxVal: number | undefined,
    yMinVal: number | undefined,
    yMaxVal: number | undefined,
    theXSliderValues: number[] | undefined,
    theYSliderValues: number[] | undefined
  ): [boolean, (number | undefined)[]] => {
    // If still not set
    let valuesComeFromState: boolean = false;
    if (uiOptions?.xSlider?.display) {
      if (xMaxVal && !theXSliderValues) {
        // Set the values for x axis to min/max
        setXSliderValues([xMinVal!, xMaxVal!]);
      } else if (theXSliderValues) {
        // eslint-disable-next-line no-param-reassign
        [xMinVal, xMaxVal] = theXSliderValues;
        valuesComeFromState = true;
      }
    }
    // If still not set
    if (uiOptions?.ySlider?.display) {
      if (yMaxVal && !theYSliderValues) {
        // Set the state
        setYSliderValues([yMinVal!, yMaxVal!]);
      } else if (theYSliderValues) {
        // eslint-disable-next-line no-param-reassign
        [yMinVal, yMaxVal] = theYSliderValues;
        valuesComeFromState = true;
      }
    }

    // Return if the values were set
    return [valuesComeFromState, [xMinVal, xMaxVal, yMinVal, yMaxVal]];
  };

  /**
   * Fetches the items to associated to the given Datasource and then sets the Datasource in GeoChart
   * @param chartConfig GeoViewGeoChartConfig The chart configuration being used
   * @param ds GeoChartDatasource The Datasource to fetch the items for
   */
  const fetchDatasourceItems = async (
    chartQuery: GeoChartQuery,
    language: string,
    sourceItem: TypeJsonObject | undefined,
    errorCallback: ((error: string, exception: unknown | undefined) => void) | undefined
  ): Promise<TypeJsonObject[]> => {
    try {
      // Loading
      setIsLoadingDatasource(true);

      // Fetch the items for the data source in question
      return await fetchItemsViaQueryForDatasource(chartQuery, language, sourceItem);
    } catch (ex) {
      // Error
      errorCallback?.('Failed to fetch the data', ex);
      return Promise.resolve([]);
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

  // #region HOOKS USE CALLBACK GEOCHART SECTION **********************************************************************

  /**
   * Updates the selected datasets object in synch with the actual datasets read from the data.
   * @param theChartData ChartData<TType, TData, TLabel>
   */
  const processDatasets = useCallback(
    (
      items: TypeJsonObject[] | undefined,
      catPropertyName: string | undefined,
      paletteBackgrounds: string[] | undefined,
      paletteBorders: string[] | undefined
    ): void => {
      // Check
      if (!items || !catPropertyName) return;

      // Loop on the items
      let oneSelectedDatasetUpdated = false;
      const catNames: string[] = [];
      let backgroundIndex = colorPaletteCategoryBackgroundIndex;
      let borderIndex = colorPaletteCategoryBorderIndex;
      items?.forEach((item: TypeJsonObject) => {
        // Read the category as a string
        const catName = item[catPropertyName] as string;

        // Build list
        if (!catNames.includes(catName)) catNames.push(catName);

        // If not set
        if (datasetRegistry[catName] === undefined) {
          // eslint-disable-next-line no-param-reassign
          datasetRegistry[catName] = {
            visible: true,
            checked: true,
            backgroundColor: getColorFromPalette(paletteBackgrounds, backgroundIndex, ChartJS.defaults.color as string),
            borderColor: getColorFromPalette(paletteBorders, borderIndex, ChartJS.defaults.color as string),
          };
          backgroundIndex++;
          borderIndex++;
          oneSelectedDatasetUpdated = true;
        }

        // If not visible, make sure it's visible
        if (!datasetRegistry[catName].visible) {
          // eslint-disable-next-line no-param-reassign
          datasetRegistry[catName].visible = true;
          oneSelectedDatasetUpdated = true;
        }
      });
      setColorPaletteCategoryBackgroundIndex(backgroundIndex);
      setColorPaletteCategoryBorderIndex(borderIndex);

      // For any categories that weren't found, make sure they're invisible
      Object.keys(datasetRegistry).forEach((catName: string) => {
        if (!catNames.includes(catName) && datasetRegistry[catName].visible) {
          // eslint-disable-next-line no-param-reassign
          datasetRegistry[catName].visible = false;
          oneSelectedDatasetUpdated = true;
        }
      });

      // If at least one dataset was updated (prevents loopback)
      if (oneSelectedDatasetUpdated) {
        setDatasetRegistry({ ...datasetRegistry });
      }
    },
    [datasetRegistry, colorPaletteCategoryBackgroundIndex, colorPaletteCategoryBorderIndex]
  ) as (
    items: TypeJsonObject[] | undefined,
    catPropertyName: string | undefined,
    paletteBackgrounds: string[] | undefined,
    paletteBorders: string[] | undefined
  ) => void;

  /**
   * Updates the selected data object in synch with the actual labels read from the data.
   * @param theChartData ChartData<TType, TData, TLabel>
   */
  const processLabels = useCallback(
    (
      theChartType: string,
      items: TypeJsonObject[] | undefined,
      labelPropertyName: string | undefined,
      paletteBackgrounds: string[] | undefined,
      paletteBorders: string[] | undefined
    ): void => {
      // Check
      if (!items || !labelPropertyName) return;

      // Only working on pie or doughnut
      if (theChartType === 'pie' || theChartType === 'doughnut') {
        // Loop on the items
        let oneSelectedDataUpdated = false;
        const labelNames: string[] = [];
        let backgroundIndex = colorPaletteAxisBackgroundIndex;
        let borderIndex = colorPaletteAxisBorderIndex;
        items?.forEach((item: TypeJsonObject) => {
          // Read the label as a string
          const labelName = item[labelPropertyName] as string;

          // Build list
          if (!labelNames.includes(labelName)) labelNames.push(labelName);

          // If not set
          if (datasRegistry[labelName] === undefined) {
            // eslint-disable-next-line no-param-reassign
            datasRegistry[labelName] = {
              visible: true,
              checked: true,
              backgroundColor: getColorFromPalette(paletteBackgrounds, backgroundIndex, ChartJS.defaults.color as string),
              borderColor: getColorFromPalette(paletteBorders, borderIndex, ChartJS.defaults.color as string),
            };
            backgroundIndex++;
            borderIndex++;
            oneSelectedDataUpdated = true;
          }

          // If not visible, make sure it's visible
          if (!datasRegistry[labelName].visible) {
            // eslint-disable-next-line no-param-reassign
            datasRegistry[labelName].visible = true;
            oneSelectedDataUpdated = true;
          }
        });

        // For any categories that weren't found, make sure they're invisible
        Object.keys(datasRegistry).forEach((labelName: string) => {
          if (!labelNames.includes(labelName) && datasRegistry[labelName].visible) {
            // eslint-disable-next-line no-param-reassign
            datasRegistry[labelName].visible = false;
            oneSelectedDataUpdated = true;
          }
        });

        // If at least one dataset was updated (prevents loopback)
        if (oneSelectedDataUpdated) {
          setDatasRegistry({ ...datasRegistry });
        }
        setColorPaletteAxisBackgroundIndex(backgroundIndex);
        setColorPaletteAxisBorderIndex(borderIndex);
      }
    },
    [datasRegistry, colorPaletteAxisBackgroundIndex, colorPaletteAxisBorderIndex]
  ) as (
    theChartType: string,
    items: TypeJsonObject[] | undefined,
    labelPropertyName: string | undefined,
    paletteBackgrounds: string[] | undefined,
    paletteBorders: string[] | undefined
  ) => void;

  /**
   * Updates the chart dataset visibility based on the currently selected datasets.
   * @param theChartData ChartData<TType, TData, TLabel>
   * @param theSelectedDatasets GeoChartSelectedDatasets
   */
  const updateDatasetVisibilityUsingState = useCallback(
    (theChartRef: ChartJS<TType, TData, TLabel>, theDatasetRegistry: GeoChartSelectedDataset): void => {
      if (!theChartRef) return;

      // Get the current dataset labels
      const dsLabels = theChartRef.data.datasets.map((x: ChartDataset<TType, TData>) => {
        return x.label!;
      });

      // Make sure the datasets visibility follow the state
      Object.keys(theDatasetRegistry).forEach((value: string) => {
        const idx = dsLabels.indexOf(value);
        if (idx >= 0) theChartRef.setDatasetVisibility(idx, theDatasetRegistry[value]?.checked);
      });

      // Update visibility
      theChartRef.update();
    },
    []
  ) as (theChartRef: ChartJS<TType, TData, TLabel>, theDatasetRegistry: GeoChartSelectedDataset) => void;

  /**
   * Updates the chart data visibility based on the currently selected data.
   * @param theChartData ChartData<TType, TData, TLabel>
   * @param theSelectedData GeoChartSelectedDatasets
   */
  const updateDataVisibilityUsingState = useCallback(
    (theChartRef: ChartJS<TType, TData, TLabel>, theDatasRegistry: GeoChartSelectedDataset): void => {
      // Check
      if (!theChartRef) return;

      // The Config
      const chartConf = theChartRef.config as ChartConfiguration<TType, TData, TLabel>;

      // Only working on pie or doughnut
      if (chartConf.type === 'pie' || chartConf.type === 'doughnut') {
        // Make sure the datas visibility follow the state
        theChartRef.data.labels?.forEach((value: TLabel) => {
          const idx = theChartRef.data.labels!.indexOf(value);
          const currVis = theChartRef.getDataVisibility(idx);
          if (theDatasRegistry[value]?.checked !== currVis) {
            theChartRef.toggleDataVisibility(idx);
          }
        });

        // Update visibility
        theChartRef.update();
      }
    },
    []
  ) as (theChartRef: ChartJS<TType, TData, TLabel>, theDatasRegistry: GeoChartSelectedDataset) => void;

  /**
   * Essential function to load the records in the Chart.
   * @param datasource GeoChartDatasource The Datasource on which the records were grabbed
   * @param records TypeJsonObject[] The actual records to load in the Chart.
   */
  const processLoadingRecords = useCallback(
    (
      theInputs: GeoChartConfig<TType>,
      theDatasetRegistry: GeoChartSelectedDataset,
      theDatasRegistry: GeoChartSelectedDataset,
      theLanguage: string,
      theSteps: StepsPossibilities,
      records: TypeJsonObject[] | undefined
    ): void => {
      // Parse the data
      const parsedOptions = createChartJSOptions<TType>(theInputs, parentOptions!, theLanguage);
      const parsedData = createChartJSData<TType, TData, TLabel>(
        theInputs,
        theDatasetRegistry,
        theDatasRegistry,
        theSteps,
        records,
        parentData!
      );

      // Callback
      onParsed?.(theInputs!.chart, parsedOptions, parsedData);

      // Override
      setChartType(theInputs!.chart);
      setChartOptions(parsedOptions);
      setChartData(parsedData);

      // If the resulting datasets array is empty, force a redraw action, otherwise ChartJS hangs on the last shown graphic
      if (parsedData.datasets?.length === 0) setAction({ shouldRedraw: true });
    },
    // NO REACT for 'onParsed' (explicitely excluding it here instead of relying on
    // the parent component to have used useCallback as they should have)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentOptions, parentData]
  ) as (
    theInputs: GeoChartConfig<TType>,
    theDatasetRegistry: GeoChartSelectedDataset,
    theDatasRegistry: GeoChartSelectedDataset,
    theLanguage: string,
    theSteps: StepsPossibilities,
    records: TypeJsonObject[] | undefined
  ) => void;

  /**
   * Helper function to filter datasource items based on 2 possible and independent axis.
   * For performance reasons, the code cumulates the filtered data instead of treating the axes individually.
   * @param datasourceItems TypeJsonObject[] The Datasource items
   * @param xValues number | number[] The values in X to filter on
   * @param yValues number | number[] The values in Y to filter on
   */
  const processLoadingRecordsFilteringFirst = useCallback(
    (
      theInputs: GeoChartConfig<TType>,
      theDatasetRegistry: GeoChartSelectedDataset,
      theDatasRegistry: GeoChartSelectedDataset,
      theLanguage: string,
      theSteps: StepsPossibilities,
      records: TypeJsonObject[] | undefined,
      xValues: number | number[],
      yValues: number | number[]
    ): void => {
      // If chart type is line
      let resItemsFinal: TypeJsonObject[] = records ? [...records] : [];
      if (theInputs?.chart === 'line') {
        // If filterings on x supported
        if (Array.isArray(xValues) && xValues.length === 2) {
          // If filtering on time values
          if (theInputs?.geochart?.xAxis.type === 'time' || theInputs?.geochart?.xAxis.type === 'timeseries') {
            // Grab the filters
            const theDateFrom = new Date(xValues[0]);
            const theDateTo = new Date(xValues[1]);

            // Filter the datasourceItems
            resItemsFinal = records!.filter((item: TypeJsonObject) => {
              const d = new Date(item[theInputs.geochart.xAxis.property] as string);
              return theDateFrom <= d && d <= theDateTo;
            });
          } else {
            // Default filtering on number values
            const from = xValues[0];
            const to = xValues[1];

            // Filter the datasourceItems
            resItemsFinal = records!.filter((item: TypeJsonObject) => {
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

      // Filter
      processLoadingRecords(theInputs, theDatasetRegistry, theDatasRegistry, theLanguage, theSteps, resItemsFinal);

      // Set new filtered inputs
      setFilteredRecords(resItemsFinal);
    },
    [processLoadingRecords]
  ) as (
    theInputs: GeoChartConfig<TType>,
    theDatasetRegistry: GeoChartSelectedDataset,
    theDatasRegistry: GeoChartSelectedDataset,
    theLanguage: string,
    theSteps: StepsPossibilities,
    records: TypeJsonObject[] | undefined,
    xValues: number | number[],
    yValues: number | number[]
  ) => void;

  // #endregion

  // #region HOOKS USE CALLBACK CHARTJS SECTION ***********************************************************************

  /**
   * Handles when the ChartJS has finished initializing and before it started drawing data.
   * @param chart ChartJS<TType, TData, TLabel> The ChartJS reference.
   */
  const handleChartJSAfterInit = useCallback(
    (chart: ChartJS<TType, TData, TLabel>): void => {
      // Log
      logHigh('CHARTJS AFTER INIT', chart, datasetRegistry);

      // Make sure the UI fits with the registry state before the first render is made. Mostly useful for pie/doughnut charts.
      updateDatasetVisibilityUsingState(chart, datasetRegistry);
      updateDataVisibilityUsingState(chart, datasRegistry);
    },
    [datasRegistry, datasetRegistry, updateDataVisibilityUsingState, updateDatasetVisibilityUsingState]
  );

  // #endregion

  // #region HOOKS USE EFFECT PARENT COMP SECTION *********************************************************************************

  // Effect hook when the inputs change - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - PARENT - INPUTS';
    logUseEffectMount(USE_EFFECT_FUNC, parentInputs);

    // Refresh the inputs in this component
    setInputs(parentInputs);

    // Clear dependency states because we're cleaning house and until the selected datasource is
    // property reset, inputs might be unrelated to the selected datasource in the other useEffects.
    setSelectedDatasource(undefined);
    setChartData(GeoChart.defaultProps.data as ChartData<TType, TData, TLabel>);
    setChartOptions(GeoChart.defaultProps.options as ChartOptions<TType>);

    // If parentInputs is specified
    if (parentInputs) {
      // Validate the schema of the received inputs
      setValidatorInputs(schemaValidator.validateInputs(parentInputs));
    }

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC, parentInputs);
    };
  }, [parentInputs, schemaValidator]);

  // Effect hook when the main props about charttype, options and data change - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - PARENT - CHARTJS INPUTS';
    logUseEffectMount(USE_EFFECT_FUNC);

    // Override
    setChartType(parentChart!);
    setChartOptions(parentOptions!);
    setChartData(parentData!);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [parentChart, parentOptions, parentData]);

  // Effect hook when the selected datasource changes - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - PARENT - DATASOURCE';
    logUseEffectMount(USE_EFFECT_FUNC, parentDatasource);

    // Set the datasource as provided
    setSelectedDatasource(parentDatasource);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC, parentDatasource);
    };
  }, [parentDatasource]);

  // Effect hook to be executed with loading datasource - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - PARENT - LOADING DATASOURCE';
    logUseEffectMount(USE_EFFECT_FUNC, parentLoadingDatasource);

    // If defined, update the state
    if (parentLoadingDatasource !== undefined) setIsLoadingDatasource(parentLoadingDatasource);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [parentLoadingDatasource]);

  // Effect hook when an action needs to happen - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - PARENT - ACTION';
    logUseEffectMount(USE_EFFECT_FUNC, parentAction);

    // Set action for the component
    if (parentAction) setAction(parentAction);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [parentAction]);

  // #endregion

  // #region HOOKS USE EFFECT CURRENT COMP SECTION *********************************************************************************

  // Effect hook ran once when initializing
  useEffect(() => {
    const plugin = {
      id: 'geochart-chartjs-plugin',
      afterInit: (chartEvent: unknown): void => handleChartJSAfterInit(chartEvent as ChartJS<TType, TData, TLabel>),
    };

    // Register
    setPlugins([plugin]);
  }, [handleChartJSAfterInit]);

  // Effect hook when the inputs change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - INPUTS';
    logUseEffectMount(USE_EFFECT_FUNC, inputs);

    // Async function to fetch data from within a sync useEffect :|
    const fetchAndSetSelectedDatasource = async (query: GeoChartQuery, language: string, datasource: GeoChartDatasource): Promise<void> => {
      // Perform the fetch
      // eslint-disable-next-line no-param-reassign
      datasource.items = await fetchDatasourceItems(query, language, datasource.sourceItem, onError);

      // Set the datasource
      setSelectedDatasource(datasource);
    };

    // If no steps switcher, reset the state of the useSteps to the config, we don't want to be stuck on a setting set by a ui which may not exist anymore
    if (!inputs?.ui?.stepsSwitcher) setSelectedSteps(inputs?.geochart.useSteps || false);

    // If no datasources on the inputs, create a default one
    if (inputs && inputs.datasources && inputs.datasources.length > 0) {
      // The datasource to load on start
      const ds = inputs.datasources[0];

      // Init the datasource items for the first record and sets it
      if (!ds.items && inputs.query) {
        // Must fetch straight away
        fetchAndSetSelectedDatasource(inputs.query, i18n.language, ds);
      } else setSelectedDatasource(ds);
    } else setSelectedDatasource(undefined);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC, inputs);
    };
    // NO REACT for 'onError' (explicitely excluding it here instead of relying on
    // the parent component to have used useCallback as they should have)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, i18n.language]);

  // Effect hook when the selected datasource changes - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - PROCESS DATA - REGISTRY';
    logUseEffectMount(USE_EFFECT_FUNC, inputs, selectedDatasource);

    // If selectedDatasource is specified
    if (inputs && selectedDatasource) {
      // Update the Datasets Registry based on the chart information
      processDatasets(
        selectedDatasource.items,
        inputs.category?.property,
        inputs.category?.paletteBackgrounds,
        inputs.category?.paletteBorders
      );

      // Update the Datas/Labels Registry based on the chart information
      processLabels(
        inputs.chart,
        selectedDatasource.items,
        inputs.geochart.xAxis.property,
        inputs.geochart.xAxis.paletteBackgrounds,
        inputs.geochart.xAxis.paletteBorders
      );
    }

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC, selectedDatasource);
    };
  }, [inputs, selectedDatasource, processDatasets, processLabels]);

  // Effect hook when the selected datasource changes - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - PROCESS DATA - DATA';
    logUseEffectMount(USE_EFFECT_FUNC, inputs, selectedDatasource);

    // If selectedDatasource is specified
    if (inputs && selectedDatasource) {
      // Process the axes
      let [xMinVal, xMaxVal, yMinVal, yMaxVal] = processAxes(inputs.geochart, inputs.ui, selectedDatasource.items);

      // Process the axes values
      let valuesComeFromState = false;
      [valuesComeFromState, [xMinVal, xMaxVal, yMinVal, yMaxVal]] = processAxesValues(
        inputs!.ui,
        xMinVal,
        xMaxVal,
        yMinVal,
        yMaxVal,
        xSliderValues as number[],
        ySliderValues as number[]
      );

      // If using the state, filter right away
      if (valuesComeFromState) {
        // Load records with filtering
        processLoadingRecordsFilteringFirst(
          inputs,
          datasetRegistry,
          datasRegistry,
          i18n.language,
          selectedSteps,
          selectedDatasource.items,
          [xMinVal!, xMaxVal!],
          [yMinVal!, yMaxVal!]
        );
      } else {
        // Load records without filtering for nothing
        processLoadingRecords(inputs, datasetRegistry, datasRegistry, i18n.language, selectedSteps, selectedDatasource.items);
      }
    }

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC, selectedDatasource);
    };
  }, [
    inputs,
    selectedDatasource,
    datasRegistry,
    datasetRegistry,
    i18n.language,
    selectedSteps,
    xSliderValues,
    ySliderValues,
    processLoadingRecordsFilteringFirst,
    processLoadingRecords,
  ]);

  // Effect hook when the chartOptions, chartData change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - CHARTJS OPTIONS+DATA';
    logUseEffectMount(USE_EFFECT_FUNC, chartOptions, chartData);

    // If chart options. Validate the parsing we did do follow ChartJS options schema validating
    if (chartOptions) setValidatorOptions(schemaValidator.validateOptions(chartOptions));

    // If chart data. Validate the parsing we did do follow ChartJS data schema validating
    if (chartData) setValidatorData(schemaValidator.validateData(chartData));

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [chartOptions, chartData, schemaValidator]);

  // Effect hook when the datasetRegistry change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - SELECTED DATASETS';
    logUseEffectMount(USE_EFFECT_FUNC);

    // Make sure the visibility of the chart aligns with the selected datasets
    updateDatasetVisibilityUsingState(chartRef.current, datasetRegistry);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [datasetRegistry, updateDatasetVisibilityUsingState]);

  // Effect hook when the datasRegistry change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - SELECTED DATAS';
    logUseEffectMount(USE_EFFECT_FUNC);

    // Make sure the visibility of the chart aligns with the selected datas
    updateDataVisibilityUsingState(chartRef.current, datasRegistry);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [datasRegistry, updateDataVisibilityUsingState]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - VALIDATORS - INPUTS';
    logUseEffectMount(USE_EFFECT_FUNC, hasValidSchemas([validatorInputs]));

    // If any error
    if (!hasValidSchemas([validatorInputs])) {
      // Gather error messages
      const error = SchemaValidator.parseValidatorResultsMessages([validatorInputs]);
      // If a callback is defined
      onError?.(`${t('geochart.parsingError')}\n\n${error}`, undefined);
    }

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
    // NO REACT for 'onError' (explicitely excluding it here instead of relying on
    // the parent component to have used useCallback as they should have)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatorInputs, t]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - VALIDATORS - OPTIONS+DATA';
    logUseEffectMount(USE_EFFECT_FUNC, hasValidSchemas([validatorOptions, validatorData]));

    // If any error
    if (!hasValidSchemas([validatorOptions, validatorData])) {
      // Gather error messages
      const error = SchemaValidator.parseValidatorResultsMessages([validatorOptions, validatorData]);
      // If a callback is defined
      onError?.(`${t('geochart.parsingError')}\n\n${error}`, undefined);
    }

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
    // NO REACT for 'onError' (explicitely excluding it here instead of relying on
    // the parent component to have used useCallback as they should have)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validatorOptions, validatorData, t]);

  // Effect hook when an action needs to happen - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - ACTION';
    logUseEffectMount(USE_EFFECT_FUNC, action);

    // If redraw is true, reset the property in the action, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
    // A bit funky, but only way I could find without having code the logic within the Parent Component.
    if (action?.shouldRedraw) {
      action!.shouldRedraw = false;
      // Redraw
      performRedraw();
    }

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [action]);

  // Effect hook to be executed with i18n
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - USE EFFECT - CURRENT - i18n';
    logUseEffectMount(USE_EFFECT_FUNC);

    // Add GeoChart translations file
    i18n.addResourceBundle('en', 'translation', T_EN);
    i18n.addResourceBundle('fr', 'translation', T_FR);

    return () => {
      // Log
      logUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [i18n]);

  // #endregion

  // #region EVENT HANDLERS SECTION ***********************************************************************************

  /**
   * Handles when the Datasource changes
   * @param e Event The Select change event
   * @param item MenuItem The selected MenuItem
   */
  const handleDatasourceChanged = async (e: Event, item: typeof MenuItem): Promise<void> => {
    // Find the selected datasource reference based on the MenuItem
    const ds: GeoChartDatasource | undefined = inputs!.datasources.find((datasource: GeoChartDatasource) => {
      return (datasource.value || datasource.display) === item.props.value;
    });
    if (!ds) return;

    // If the data source has no items
    if (!ds.items) {
      ds.items = await fetchDatasourceItems(inputs!.query!, i18n.language, ds.sourceItem, onError);
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
    datasetRegistry[datasetLabel!].checked = checked;

    // Update the registry
    setDatasetRegistry({ ...datasetRegistry });

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
    datasRegistry[dataLabel].checked = checked;

    // Update the registry
    setDatasRegistry({ ...datasRegistry });

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
    Object.keys(datasetRegistry).forEach((dataset: string) => {
      datasetRegistry[dataset].checked = true;
    });

    // Reset all selected datasets to true
    Object.keys(datasRegistry).forEach((data: string) => {
      datasRegistry[data].checked = true;
    });

    // Clear all states
    setDatasetRegistry({ ...datasetRegistry });
    setDatasRegistry({ ...datasRegistry });
    setSelectedSteps(inputs?.geochart.useSteps || false);
    setXSliderValues([xSliderMin, xSliderMax]);
    setYSliderValues([ySliderMin, ySliderMax]);

    // Callback
    onResetStates?.();
  };

  /**
   * Handles the display of the label on the X Slider
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderXValueDisplay = (value: number): string => {
    // Callback in case we're overriding this behavior
    const val = onSliderXValueDisplaying?.(value);
    if (val) return val;

    // Default behavior
    // If current chart has time as xAxis
    if (inputs?.geochart?.xAxis.type === 'time' || inputs?.geochart?.xAxis.type === 'timeseries') {
      return new Date(value).toLocaleDateString(i18n.language, DATE_OPTIONS_LONG);
    }

    // Default value as is
    return value.toString();
  };

  /**
   * Handles the display of the label on the Y Slider
   * @param value number | number[] Indicates the slider value
   */
  const handleSliderYValueDisplay = (value: number): string => {
    // Callback in case we're overriding this behavior
    const val = onSliderYValueDisplaying?.(value);
    if (val) return val;

    // Default value as is
    return value.toString();
  };

  /**
   * Handles when the download button is clicked
   * @param value number Indicates the button drop down selection index when it was clicked
   */
  const handleDownloadClick = (index: number): void => {
    // Get the data
    const data = { ...selectedDatasource! } as GeoChartDatasource;

    // If only the filtered information
    if (index === 0) {
      // Get either the actually filtered records (via the sliders) or the data.items
      data.items = filteredRecords || data.items;

      // If using categories
      if (inputs?.category) {
        // The checked datasets strings
        const checkedDatasetsStrings = Object.keys(datasetRegistry).filter((ds) => {
          return datasetRegistry[ds].checked;
        });

        // Also filter on the selected datasets
        data.items = data.items?.filter((value: TypeJsonObject) => {
          return checkedDatasetsStrings.includes(value[inputs.category!.property] as string);
        });

        // In case of pie/doughnut
        if (chartType === 'pie' || chartType === 'doughnut') {
          // The checked datas strings
          const checkedDatasStrings = Object.keys(datasRegistry).filter((ds) => {
            return datasRegistry[ds].checked;
          });

          // Also filter on selected datas
          data.items = data.items?.filter((value: TypeJsonObject) => {
            return checkedDatasStrings.includes(value[inputs.geochart.xAxis.property] as string);
          });
        }
      }
    }

    // Callback
    let fileName = onDownloadClicked?.(data, index);
    if (!fileName) fileName = 'chart-data.json';

    // Download the data as json
    downloadJson(data, fileName);
  };

  // #endregion

  // #region RENDER SECTION *******************************************************************************************

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    return <ChartReact ref={chartRef} type={chartType!} data={chartData} options={chartOptions} plugins={plugins} redraw={redraw} />;
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
      inputs.datasources.forEach((s: GeoChartDatasource) => {
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
    if (inputs && inputs.title) {
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
    if (inputs && chartData && inputs.category) {
      if (Object.keys(datasetRegistry).length > 1) {
        const label = chartType === 'pie' || chartType === 'doughnut' ? `${t('geochart.category')}:` : '';
        return (
          <Box>
            <Typography sx={sxClasses.checkDatasetWrapperLabel}>{label}</Typography>
            {Object.entries(datasetRegistry)
              .filter(([, dsOption]: [string, GeoChartDatasetOption]) => {
                return dsOption.visible;
              })
              .map(([dsLabel, dsOption]: [string, GeoChartDatasetOption], idx: number) => {
                let color;
                if (chartType === 'line' || chartType === 'bar') color = dsOption.borderColor as string;

                return (
                  <Box sx={sxClasses.checkDatasetWrapper} key={dsLabel || idx}>
                    <Checkbox
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        handleDatasetChecked(idx, dsLabel, e.target?.checked);
                      }}
                      checked={datasetRegistry[dsLabel].checked !== undefined ? datasetRegistry[dsLabel].checked : true}
                    />
                    <Typography sx={{ ...sxClasses.checkDatasetLabel, ...{ color } }} noWrap>
                      {dsLabel}
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
    if (inputs && chartData) {
      if (chartType === 'pie' || chartType === 'doughnut') {
        if (Object.keys(datasRegistry).length > 1) {
          return (
            <Box>
              {Object.entries(datasRegistry)
                .filter(([, dsOption]: [string, GeoChartDatasetOption]) => {
                  return dsOption.visible;
                })
                .map(([dsLabel, dsOption]: [string, GeoChartDatasetOption], idx: number) => {
                  const color = dsOption.borderColor;

                  return (
                    <Box sx={sxClasses.checkDatasetWrapper} key={dsLabel || idx}>
                      <Checkbox
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                          handleDataChecked(idx, dsLabel, e.target?.checked);
                        }}
                        checked={datasRegistry[dsLabel].checked !== undefined ? datasRegistry[dsLabel].checked : true}
                      />
                      <Typography sx={{ ...sxClasses.checkDatasetLabel, ...{ color } }} noWrap>
                        {dsLabel}
                      </Typography>
                    </Box>
                  );
                })}
            </Box>
          );
        }
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

  // TODO: Add a check if there's a 'current error', not just a 'valid schemas' error
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
};
