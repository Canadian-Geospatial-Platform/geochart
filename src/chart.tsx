import type React from 'react';
import type { JSX } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import ResetIcon from '@mui/icons-material/RestartAlt';
import { Chart as ChartJS, ChartType, ChartOptions, ChartData, ChartDataset, registerables, ChartConfiguration, Plugin } from 'chart.js';
import { Chart as ChartReact } from 'react-chartjs-2';
import 'chartjs-adapter-moment';
import 'chartjs-adapter-luxon';
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
  StepsPossibilitiesConst,
  StepsPossibility,
  GeoChartDatasetOption,
  ScalePossibilitiesConst,
  ScalePossibility,
  isScalePossibilityArray,
  isStepPossibilityArray,
} from './types';
import { SchemaValidator, ValidatorResult } from './chart-schema-validator';
import { ChartCore } from './chart-core';
import { ChartParsing } from './chart-parsing';
import { getSxClasses } from './chart-style';
import { Utils } from './utils';
import { CancelledError } from './exceptions';
import localI18n from './i18n';

/** The i18n namespace to use to bundle geochart locales into */
const NAMESPACE_I18N = 'geochart';

/**
 * Main props for the Chart.
 * There are 2 main ways to create a chart:
 * (1) Using the 'inputs' parameter which configures an elaborated GeoChart or;
 * (2) Using the 'chart'+'options'+'data' parameters which creates a basic GeoChart with essential ChartJS parameters.
 */
export interface TypeChartChartProps<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel = string,
> {
  // Container element, notably used by the 'Select' drop downs
  container?: HTMLElement;

  // Mandatory type of chart
  chart: TType;

  // The schemas validator object
  schemaValidator: SchemaValidator;

  // Will be casted as CSSProperties later via the imported cgpv react
  sx?: unknown;

  // The official way to work with all GeoChart features
  inputs?: GeoChartConfig<TType>;

  // The selected datasource (the selected value in the dropdown on top left corner of the ui)
  datasource?: GeoChartDatasource;

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

  // Language of the GeoChart
  language?: string;

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
  onDownloadClicked?: (value: GeoChartDatasource) => string;

  // Callback executed when user has selected another steps value from the ui (top right corner in the ui)
  onStepSwitcherChanged?: (value: StepsPossibility) => void;

  // Callback executed when user has selected another scale value from the ui (top right corner in the ui)
  onScalesSwitcherChanged?: (value: ScalePossibility) => void;

  // Callback executed when user has clicked the reset states button (top right corner in the ui)
  onResetStates?: () => void;

  // Callback executed when the data coming from the inputs parameters have been parsed and is ready to redirect to ChartJS for rendering
  onParsed?: (chart: TType, options: ChartOptions<TType>, data: ChartData<TType, TData>) => void;

  // Callback executed when an error has happened
  onError?: (error: string, exception: unknown) => void;
}

/** Default Chart type */
const DEFAULT_CHART: ChartType = 'line';

/** Default options */
const DEFAULT_OPTIONS: ChartOptions<ChartType> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
};

/** Default data */
const DEFAULT_DATA: ChartData<ChartType, GeoDefaultDataPoint<ChartType>> = { datasets: [], labels: [] };

/** Default number of markers per slider axis */
const DEFAULT_NUMBER_OF_SLIDER_MARKS_X: number = 10;
const DEFAULT_NUMBER_OF_SLIDER_STEPS_X: number = 100;
const DEFAULT_NUMBER_OF_SLIDER_MARKS_Y: number = 10;

/** Used for debugging purposes of mocking the data */
const DEBUG_MOCKING_RESULT_FILTERING: boolean = false;
const DEFAULT_FAKE_X_MIN: Date = new Date('2024-10-01');
const DEFAULT_FAKE_X_MAX: Date = new Date('2024-10-31');
const DEFAULT_FAKE_Y_MIN: number = 0;
const DEFAULT_FAKE_Y_MAX: number = 1;

/**
 * Create a customized Chart UI
 *
 * @param {TypeChartChartProps} props the properties passed to the Chart element
 * @returns {JSX.Element} the created Chart element
 */
export function GeoChart<
  TType extends ChartType = ChartType,
  TData extends GeoDefaultDataPoint<TType> = GeoDefaultDataPoint<TType>,
  TLabel extends string = string,
>(props: TypeChartChartProps<TType, TData, TLabel>): JSX.Element {
  // Prep ChartJS
  ChartJS.register(...registerables);

  // Can't type the window object to a 'TypeWindow', because we don't have access to the cgpv library when this line runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  // Fetch the cgpv module
  const { cgpv } = w;
  const { logger } = cgpv;
  const { useEffect, useState, useCallback, useMemo, useRef, useId } = cgpv.reactUtilities.react as typeof React;
  // const { useWhatChanged } = cgpv.ui;

  const { Paper, Box, Checkbox, Select, IconButton, DownloadIcon, Menu, MenuItem, Typography, Slider, Tooltip, CircularProgress } =
    cgpv.ui.elements;
  type TypeMenuItemProps = typeof cgpv.ui.elements.TypeMenuItemProps;

  // Cast
  const cgpvTheme = cgpv.ui.elements.cgpvTheme as Theme;

  const {
    sx: elStyle,
    container: containerElement,
    schemaValidator,
    inputs: parentInputs,
    datasource: parentDatasource,
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
    onScalesSwitcherChanged,
    onResetStates,
    onParsed,
    onError,
  } = props;
  const language = props.language ?? 'en';
  const parentChart = props.chart ?? DEFAULT_CHART;
  const parentOptions = (props.options ?? DEFAULT_OPTIONS) as ChartOptions<TType>;
  const parentData = (props.data ?? DEFAULT_DATA) as ChartData<TType, TData, TLabel>;
  const sxClasses = getSxClasses(cgpvTheme);

  // WCAG - Generate unique IDs
  const xAxisLabelId = useId();
  const yAxisLabelId = useId();
  const datasourceLabelId = useId();
  const stepsLabelId = useId();
  const scaleLabelId = useId();
  const datasetCheckboxBaseId = useId();
  const dataCheckboxBaseId = useId();

  // Translation
  const { i18n, t } = useTranslation(NAMESPACE_I18N);

  // Cast the style
  const sx = elStyle as CSSProperties;

  // #region USE STATE SECTION ****************************************************************************************

  // Inner component states attached to the parent component
  const [inputs, setInputs] = useState(parentInputs);
  const [chartType, setChartType] = useState(parentChart);
  const [chartData, setChartData] = useState(parentData);
  const [chartOptions, setChartOptions] = useState(parentOptions);
  const [selectedDatasource, setSelectedDatasource] = useState(parentDatasource);
  const [action, setAction] = useState(parentAction);
  const [redraw, setRedraw] = useState(parentAction?.shouldRedraw);
  const [isLoadingDatasource, setIsLoadingDatasource] = useState(parentLoadingDatasource);

  // Inner component states unrelated to the parent component
  const [datasetRegistry, setDatasetRegistry] = useState<GeoChartSelectedDataset>({});
  const [datasRegistry, setDatasRegistry] = useState<GeoChartSelectedDataset>({});
  const [filteredRecords, setFilteredRecords] = useState<Record<string, unknown>[] | undefined>();
  const [xSliderMin, setXSliderMin] = useState(0);
  const [xSliderMax, setXSliderMax] = useState(0);
  const [xSliderSteps, setXSliderSteps] = useState<number | undefined>();
  const [xSliderValuesActive, setXSliderValuesActive] = useState<number | number[] | undefined>();
  const [xSliderValues, setXSliderValues] = useState<number | number[] | undefined>(xSliderValuesActive);
  const [ySliderMin, setYSliderMin] = useState(0);
  const [ySliderMax, setYSliderMax] = useState(0);
  const [ySliderSteps, setYSliderSteps] = useState<number | undefined>();
  const [ySliderValuesActive, setYSliderValuesActive] = useState<number | number[] | undefined>();
  const [ySliderValues, setYSliderValues] = useState<number | number[] | undefined>(ySliderValuesActive);
  const [validatorInputs, setValidatorInputs] = useState<ValidatorResult | undefined>();
  const [validatorOptions, setValidatorOptions] = useState<ValidatorResult | undefined>();
  const [validatorData, setValidatorData] = useState<ValidatorResult | undefined>();
  const [selectedSteps, setSelectedSteps] = useState<StepsPossibility>(inputs?.geochart.useSteps ?? false);
  const [selectedScale, setSelectedScale] = useState<ScalePossibility>(inputs?.geochart.yAxis?.type ?? 'linear');
  const [plugins, setPlugins] = useState<Plugin<TType, unknown>[] | undefined>();
  const [colorPaletteCategoryBackgroundIndex, setColorPaletteCategoryBackgroundIndex] = useState(0);
  const [colorPaletteCategoryBorderIndex, setColorPaletteCategoryBorderIndex] = useState(0);
  const [colorPaletteAxisBackgroundIndex, setColorPaletteAxisBackgroundIndex] = useState(0);
  const [colorPaletteAxisBorderIndex, setColorPaletteAxisBorderIndex] = useState(0);
  const [lockedUI, setLockedUI] = useState<boolean>(false);
  // WCAG - Live announcement state for screen readers
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const chartRef = useRef<ChartJS<TType, TData, TLabel>>(null);
  const inputsRef = useRef(inputs);
  const hasLoadingStarted = useRef(false);

  // Track the latest request token
  const latestFetchToken = useRef(0);

  /**
   * Memoized array containing the labels for the checked dataset registry items.
   * @returns {string[]} An array containing the labels of the checked dataset registry items.
   */
  const memoDatasetRegistryChecked = useMemo((): string[] => {
    return Object.entries(datasetRegistry)
      .filter(([, obj]) => obj.checked)
      .map(([label]) => label);
  }, [datasetRegistry]);

  /**
   * Memoized array containing the labels for the checked data registry items.
   * @returns {string[]} An array containing the labels of the checked data registry items.
   */
  const memoDatasRegistryChecked = useMemo((): string[] => {
    return Object.entries(datasRegistry)
      .filter(([, obj]) => obj.checked)
      .map(([label]) => label);
  }, [datasRegistry]);

  // #endregion

  // #region DEFAULTS SECTION *****************************************************************************************

  // Attribute the color palettes
  ChartParsing.setColorPalettes(inputs);

  // #endregion

  // #region CORE FUNCTIONS *******************************************************************************************

  /**
   * Helper function to set the x and y axes based on the inputs and values.
   * @param {GeoChartOptionsGeochart} geochart - The Geochart options
   * @param {GeoChartOptionsUI | undefined} uiOptions - The Geochart options
   * @param {Record<string, unknown>[]} datasourceItems - The Datasource items
   */
  const processAxes = (
    geochart: GeoChartOptionsGeochart,
    uiOptions: GeoChartOptionsUI | undefined,
    datasourceItems: Record<string, unknown>[] | undefined
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
          const values = datasourceItems.map((x) => {
            // If date
            if (geochart.xAxis.type === 'time' || geochart.xAxis.type === 'timeseries') {
              // Read the date
              return ChartParsing.readDateValue(x[geochart.xAxis.property]).getTime();
            }
            return x[geochart.xAxis.property] as number;
          });
          xMinVal = xMinVal !== undefined ? xMinVal : Math.floor(Math.min(...values));
          xMaxVal = xMaxVal !== undefined ? xMaxVal : Math.ceil(Math.max(...values));
        }
        setXSliderMin(xMinVal);
        setXSliderMax(xMaxVal);

        // If steps are determined by config
        if (uiOptions?.xSlider.step) {
          setXSliderSteps(uiOptions?.xSlider.step);
        } else {
          // If date axis
          if (geochart.xAxis.type === 'time' || geochart.xAxis.type === 'timeseries') {
            // Get an estimated stepping value
            setXSliderSteps(Utils.guessEstimatedStep(xMinVal, xMaxVal, DEFAULT_NUMBER_OF_SLIDER_STEPS_X));
          }
        }
      }
    }

    // If has a ySlider and property
    let yMinVal = uiOptions?.ySlider?.min;
    let yMaxVal = uiOptions?.ySlider?.max;

    // If using the slider, otherwise no point in setting min/max
    if (uiOptions?.ySlider?.display) {
      // If using numbers as data value
      if (datasourceItems && datasourceItems.length > 0) {
        // If either min or max isn't preset
        if (yMinVal === undefined || yMaxVal === undefined) {
          // Dynamically calculate them only focusing on the values that are numeric (if any)
          const values = datasourceItems
            .map((x) => {
              return x[geochart.yAxis.property] as number;
            })
            .filter((number) => Utils.isNumber(number));
          yMinVal = yMinVal !== undefined ? yMinVal : Math.floor(Math.min(...values));
          yMaxVal = yMaxVal !== undefined ? yMaxVal : Math.ceil(Math.max(...values));
        }
        setYSliderMin(yMinVal);
        setYSliderMax(yMaxVal);

        // If steps are determined by config
        if (uiOptions?.ySlider.step) {
          setYSliderSteps(uiOptions?.ySlider.step);
        }
      }
    }

    return [xMinVal, xMaxVal, yMinVal, yMaxVal];
  };

  /**
   * Helper function to set the x and y axes values based on the min and max of the data or if the values were already set in state.
   * @param {GeoChartOptionsUI | undefined} uiOptions - The ui options
   * @param {number | undefined} xMinVal - The min value for X
   * @param {number | undefined} xMaxVal - The max value for X
   * @param {number | undefined} yMinVal - The min value for Y
   * @param {number | undefined} yMaxVal - The max value for Y
   * @param {number[] | undefined} theXSliderStateValues - The slider values for X
   * @param {number[] | undefined} theYSliderStateValues - The slider values for Y
   */
  const processAxesValues = (
    uiOptions: GeoChartOptionsUI | undefined,
    xMinVal: number | undefined,
    xMaxVal: number | undefined,
    yMinVal: number | undefined,
    yMaxVal: number | undefined,
    theXSliderStateValues: number[] | undefined,
    theYSliderStateValues: number[] | undefined
  ): [boolean, (number | undefined)[]] => {
    // If still not set
    let valuesComeFromState: boolean = false;
    if (uiOptions?.xSlider?.display) {
      if (xMaxVal && !theXSliderStateValues) {
        // Set the values for x axis to min/max on the UI itself
        setXSliderValuesActive([xMinVal!, xMaxVal]);
      } else if (theXSliderStateValues) {
        // eslint-disable-next-line no-param-reassign
        [xMinVal, xMaxVal] = theXSliderStateValues;
        valuesComeFromState = true;
      }
    }

    // If still not set
    if (uiOptions?.ySlider?.display) {
      if (yMaxVal && !theYSliderStateValues) {
        // Set the state
        setYSliderValuesActive([yMinVal!, yMaxVal]);
      } else if (theYSliderStateValues) {
        // eslint-disable-next-line no-param-reassign
        [yMinVal, yMaxVal] = theYSliderStateValues;
        valuesComeFromState = true;
      }
    }

    // Return if the values were set
    return [valuesComeFromState, [xMinVal, xMaxVal, yMinVal, yMaxVal]];
  };

  /**
   * Fetches the items to associated to the given Datasource and then sets the Datasource in GeoChart
   * @param {GeoViewGeoChartConfig} chartQuery - The chart query being used
   * @param {string} theLanguage - The language being used
   * @param {Record<string, unknown>} sourceItem - The source item to fetch for
   */
  const fetchDatasourceItems = async (
    chartQuery: GeoChartQuery,
    theLanguage: string,
    sourceItem: Record<string, unknown> | undefined
  ): Promise<Record<string, unknown>[]> => {
    // Keep in mind the token for this fetch
    const currentToken = ++latestFetchToken.current;

    try {
      // Loading
      setIsLoadingDatasource(true);

      // Fetch the items for the data source in question
      const result = await ChartCore.fetchItemsViaQueryForDatasource(chartQuery, theLanguage, sourceItem);

      // Only return if this is the latest request
      if (currentToken === latestFetchToken.current) {
        return result;
      } else {
        // Cancel
        throw new CancelledError();
      }
    } catch (error: unknown) {
      // Only care if it is the latest request
      if (currentToken === latestFetchToken.current) {
        // Rethrow
        throw error;
      }

      // Cancel
      throw new CancelledError();
    } finally {
      // Only set to done if this is the latest request
      if (currentToken === latestFetchToken.current) {
        setIsLoadingDatasource(false);
      }
    }
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

  /**
   * Returns a new dataset registry where all entries have `checked: true`.
   * If all items are already checked, returns the original object for performance optimization.
   * Otherwise, returns a new object where only unchecked items are updated (immutably).
   * @param {GeoChartSelectedDataset} prevDataRegistry - The current dataset registry with per-label selection states.
   * @returns {GeoChartSelectedDataset} A new dataset registry with all `checked` values set to `true`, or the original if no changes were needed.
   */
  const delegateToTurnCheckedToTrue = (prevDataRegistry: GeoChartSelectedDataset): GeoChartSelectedDataset => {
    const allChecked = Object.values(prevDataRegistry).every((item) => item.checked);
    if (allChecked) return prevDataRegistry;
    return Object.fromEntries(
      Object.entries(prevDataRegistry).map(([label, item]) => [label, item.checked ? item : { ...item, checked: true }])
    );
  };

  // #endregion

  // #region HOOKS USE CALLBACK GEOCHART SECTION **********************************************************************

  /**
   * Memoizes the default colors.
   */
  const memoDefaultColors = useMemo(() => {
    // Log
    logger.logTraceUseMemo('GEOCHART - memoDefaultColors', defaultColors);

    // Reassign colors to ChartJS
    if (defaultColors?.backgroundColor) ChartJS.defaults.backgroundColor = defaultColors?.backgroundColor;
    if (defaultColors?.borderColor) ChartJS.defaults.borderColor = defaultColors?.borderColor;
    if (defaultColors?.color) ChartJS.defaults.color = defaultColors?.color;

    // Force a redraw
    setAction({ shouldRedraw: true });

    // Return the colors to be used by the Chart
    return { backgroundColor: ChartJS.defaults.backgroundColor, borderColor: ChartJS.defaults.borderColor, color: ChartJS.defaults.color };
  }, [defaultColors, logger]);

  /**
   * Updates the selected datasets object in synch with the actual datasets read from the data.
   * @param {Record<string, unknown>[] | undefined} items - The items reprensenting the data
   * @param {string | undefined} catPropertyName - The property name for the categorization
   * @param {string[] | undefined} paletteBackgrounds - The color palette used for the background colors
   * @param {string[] | undefined} paletteBorders - The color palette used for the border colors
   */
  const processDatasets = useCallback(
    (
      items: Record<string, unknown>[] | undefined,
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
      items?.forEach((item) => {
        // Read the category as a string
        const catName = item[catPropertyName] as string;

        // Build list
        if (!catNames.includes(catName)) catNames.push(catName);

        // If not set
        if (datasetRegistry[catName] === undefined) {
          datasetRegistry[catName] = {
            visible: true,
            checked: true,
            backgroundColor: Utils.getColorFromPalette(paletteBackgrounds, backgroundIndex, memoDefaultColors.color as string),
            borderColor: Utils.getColorFromPalette(paletteBorders, borderIndex, memoDefaultColors.color as string),
          };
          backgroundIndex++;
          borderIndex++;
          oneSelectedDatasetUpdated = true;
        }

        // If not visible, make sure it's visible
        if (!datasetRegistry[catName].visible) {
          datasetRegistry[catName].visible = true;
          oneSelectedDatasetUpdated = true;
        }
      });
      setColorPaletteCategoryBackgroundIndex(backgroundIndex);
      setColorPaletteCategoryBorderIndex(borderIndex);

      // For any categories that weren't found, make sure they're invisible
      Object.keys(datasetRegistry).forEach((catName: string) => {
        if (!catNames.includes(catName) && datasetRegistry[catName].visible) {
          datasetRegistry[catName].visible = false;
          oneSelectedDatasetUpdated = true;
        }
      });

      // If at least one dataset was updated (prevents loopback)
      if (oneSelectedDatasetUpdated) {
        setDatasetRegistry({ ...datasetRegistry });
      }
    },
    [logger, colorPaletteCategoryBackgroundIndex, colorPaletteCategoryBorderIndex, datasetRegistry, memoDefaultColors.color]
  );

  /**
   * Updates the selected data object in synch with the actual labels read from the data.
   * @param {string} theChartType - The chart type
   * @param {Record<string, unknown>[] | undefined} items - The items to process the labels for
   * @param {string | undefined} labelPropertyName - The property name to use for labeling
   * @param {string[] | undefined} paletteBackgrounds - The color palette used for the background colors
   * @param {string[] | undefined} paletteBorders - The color palette used for the border colors
   */
  const processLabels = useCallback(
    (
      theChartType: string,
      items: Record<string, unknown>[] | undefined,
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
        items?.forEach((item) => {
          // Read the label as a string
          const labelName = item[labelPropertyName] as string;

          // Build list
          if (!labelNames.includes(labelName)) labelNames.push(labelName);

          // If not set
          if (datasRegistry[labelName] === undefined) {
            datasRegistry[labelName] = {
              visible: true,
              checked: true,
              backgroundColor: Utils.getColorFromPalette(paletteBackgrounds, backgroundIndex, memoDefaultColors.color as string),
              borderColor: Utils.getColorFromPalette(paletteBorders, borderIndex, memoDefaultColors.color as string),
            };
            backgroundIndex++;
            borderIndex++;
            oneSelectedDataUpdated = true;
          }

          // If not visible, make sure it's visible
          if (!datasRegistry[labelName].visible) {
            datasRegistry[labelName].visible = true;
            oneSelectedDataUpdated = true;
          }
        });

        // For any categories that weren't found, make sure they're invisible
        Object.keys(datasRegistry).forEach((labelName: string) => {
          if (!labelNames.includes(labelName) && datasRegistry[labelName].visible) {
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
    [logger, colorPaletteAxisBackgroundIndex, colorPaletteAxisBorderIndex, datasRegistry, memoDefaultColors.color]
  );

  /**
   * Updates the chart dataset visibility based on the currently selected datasets.
   * @param {ChartJS<TType, TData, TLabel>} theChartRef - The ChartJS reference
   * @param {GeoChartSelectedDataset} theDatasetRegistry - The dataset registry used by the chart
   */
  const updateDatasetVisibilityUsingState = useCallback(
    (theChartRef: ChartJS<TType, TData, TLabel> | undefined, theDatasetRegistry: GeoChartSelectedDataset): void => {
      if (!theChartRef) return;

      // Get the current dataset labels
      const dsLabels = theChartRef.data.datasets.map((x: ChartDataset<TType, TData>) => {
        return x.label!;
      });

      // Make sure the datasets visibility follow the state
      Object.keys(theDatasetRegistry).forEach((value: string) => {
        const idx = dsLabels.indexOf(value);
        if (idx >= 0) theChartRef.setDatasetVisibility(idx, theDatasetRegistry[value].checked);
      });

      // Update visibility
      theChartRef.update();
    },
    [logger]
  );

  /**
   * Updates the chart data visibility based on the currently selected data.
   * @param {ChartJS<TType, TData, TLabel>} theChartRef - The ChartJS reference
   * @param {GeoChartSelectedDataset} theDatasRegistry - The datas registry used by the chart
   */
  const updateDataVisibilityUsingState = useCallback(
    (theChartRef: ChartJS<TType, TData, TLabel> | undefined, theDatasRegistry: GeoChartSelectedDataset): void => {
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
    [logger]
  );

  /**
   * Essential function to load the records in the Chart.
   * @param {GeoChartConfig<TType>} theInputs - The inputs configuration
   * @param {GeoChartSelectedDataset} theDatasetRegistry - The dataset registry
   * @param {GeoChartSelectedDataset} theDatasRegistry - The datas registry
   * @param {string} theLanguage - The language
   * @param {StepsPossibility} theSteps - The steps for the graph
   * @param {ScalePossibility} theYScale - The scale for the Y axis
   * @param {Record<string, unknown>[] | undefined} records - The records
   */
  const processLoadingRecords = useCallback(
    (
      theInputs: GeoChartConfig<TType>,
      theDatasetRegistry: GeoChartSelectedDataset,
      theDatasRegistry: GeoChartSelectedDataset,
      theLanguage: string,
      theSteps: StepsPossibility,
      theYScale: ScalePossibility,
      records: Record<string, unknown>[] | undefined
    ): void => {
      // Parse the data
      const parsedOptions = ChartParsing.createChartJSOptions<TType>(theInputs, parentOptions!, theYScale, theLanguage);
      const parsedData = ChartParsing.createChartJSData<TType, TData, TLabel>(
        theInputs,
        theDatasetRegistry,
        theDatasRegistry,
        theSteps,
        records,
        parentData
      );

      // Callback
      onParsed?.(theInputs.chart, parsedOptions, parsedData);

      // Override
      setChartType(theInputs.chart);
      setChartOptions(parsedOptions);
      setChartData(parsedData);

      // If the resulting datasets array is empty, force a redraw action, otherwise ChartJS hangs on the last shown graphic
      if (parsedData.datasets?.length === 0) setAction({ shouldRedraw: true });
    },
    [logger, parentOptions, parentData, onParsed]
  );

  /**
   * Helper function to filter datasource items based on 2 possible and independent axis.
   * For performance reasons, the code cumulates the filtered data instead of treating the axes individually.
   * @param {GeoChartConfig<TType>} theInputs - The inputs configuration
   * @param {GeoChartSelectedDataset} theDatasetRegistry - The dataset registry
   * @param {GeoChartSelectedDataset} theDatasRegistry - The datas registry
   * @param {string} theLanguage - The language
   * @param {StepsPossibility} theSteps - The steps for the graph
   * @param {ScalePossibility} theYScale - The scale for the Y axis
   * @param {Record<string, unknown>[] | undefined} records - The records
   * @param {number | number[]} xValues - The X axis filtering values
   * @param {number | number[]} yValues - The Y axis filtering values
   */
  const processLoadingRecordsFilteringFirst = useCallback(
    (
      theInputs: GeoChartConfig<TType>,
      theDatasetRegistry: GeoChartSelectedDataset,
      theDatasRegistry: GeoChartSelectedDataset,
      theLanguage: string,
      theSteps: StepsPossibility,
      theYScale: ScalePossibility,
      records: Record<string, unknown>[] | undefined,
      xValues: number | number[] | undefined,
      yValues: number | number[] | undefined
    ): void => {
      // If chart type is line
      let resItemsFinal: Record<string, unknown>[] = records ? [...records] : [];
      if (theInputs?.chart === 'line') {
        // If filterings on x supported
        if (Array.isArray(xValues) && xValues.length === 2) {
          // If filtering on time values
          if (theInputs?.geochart?.xAxis.type === 'time' || theInputs?.geochart?.xAxis.type === 'timeseries') {
            // Grab the filters
            const theDateFrom = ChartParsing.readDateValue(xValues[0]);
            const theDateTo = ChartParsing.readDateValue(xValues[1]);

            // Filter the datasourceItems
            resItemsFinal = records!.filter((item) => {
              const d = ChartParsing.readDateValue(item[theInputs.geochart.xAxis.property]);
              return theDateFrom <= d && d <= theDateTo;
            });
          } else {
            // Default filtering on number values
            const from = xValues[0];
            const to = xValues[1];

            // Filter the datasourceItems
            resItemsFinal = records!.filter((item) => {
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
          resItemsFinal = resItemsFinal.filter((item) => {
            return from <= (item[theInputs.geochart.yAxis.property] as number) && (item[theInputs.geochart.yAxis.property] as number) <= to;
          });
        }
      }

      // Filter
      processLoadingRecords(theInputs, theDatasetRegistry, theDatasRegistry, theLanguage, theSteps, theYScale, resItemsFinal);

      // Set new filtered inputs
      setFilteredRecords(resItemsFinal);
    },
    [processLoadingRecords, logger]
  );

  // #region EVENT HANDLERS SECTION ***********************************************************************************

  /**
   * Handles when the ChartJS has finished initializing and before it started drawing data.
   * @param {ChartJS<TType, TData, TLabel>} chart - The ChartJS reference.
   */
  const handleChartJSAfterInit = useCallback(
    (chart: ChartJS<TType, TData, TLabel>): void => {
      // Make sure the UI fits with the registry state before the first render is made. Mostly useful for pie/doughnut charts.
      updateDatasetVisibilityUsingState(chart, datasetRegistry);
      updateDataVisibilityUsingState(chart, datasRegistry);
    },
    [datasRegistry, datasetRegistry, updateDataVisibilityUsingState, updateDatasetVisibilityUsingState, logger]
  );

  /**
   * Handles errors that occur during a data fetch operation.
   * - If the error is a `CancelledError`, logs a warning indicating the fetch was aborted.
   * - Otherwise, invokes the global `onError` handler with a formatted error message and the exception.
   * @param {string} url - The URL that was being fetched when the error occurred.
   * @param {unknown} error - The error object thrown during the fetch operation. Can be of any type.
   */
  const handleFetchErrorHandler = useCallback(
    (url: string, error: unknown): void => {
      // If cancelled
      if (error instanceof CancelledError) {
        // Just log a warning
        logger.logWarning(`Fetching operation aborted for url ${url}`);
      } else {
        // Any error
        onError?.(`Failed to fetch the data for url ${url}`, error);
      }
    },
    [logger, onError]
  );

  /**
   * Handles when the Datasource changes
   * @param {Event} e The Select change event
   * @param {MenuItem} item The selected MenuItem
   */
  const handleDatasourceChanged = useCallback(
    async (e: Event, item: typeof MenuItem): Promise<void> => {
      // If no inputs, return
      if (!inputs) return;

      // Find the selected datasource reference based on the MenuItem
      const ds: GeoChartDatasource | undefined = inputs.datasources.find((datasource: GeoChartDatasource) => {
        return (datasource.value || datasource.display) === item.props.value;
      });

      // If no ds, return
      if (!ds) return;

      try {
        // If the data source has no items
        if (!ds.items && inputs.query) {
          ds.items = await fetchDatasourceItems(inputs.query, language, ds.sourceItem);
        }

        // Set the selected datasource
        setSelectedDatasource(ds);

        // Callback
        onDatasourceChanged?.(ds, language);
      } catch (error: unknown) {
        // Handle fetch error
        handleFetchErrorHandler(inputs.query?.url!, error);
      }
    },
    [language, inputs, onDatasourceChanged, handleFetchErrorHandler, logger]
  );

  /**
   * Handles when a dataset was checked/unchecked (via the legend)
   * @param {number} datasetIndex - Indicates the dataset index that was checked/unchecked
   * @param {string | undefined} datasetLabel - Indicates the dataset label that was checked/unchecked
   * @param {boolean} checked - Indicates the checked state
   */
  const handleDatasetChecked = useCallback(
    (datasetIndex: number, datasetLabel: string | undefined, checked: boolean): void => {
      // If already checked
      const isAlreadyChecked = datasetLabel && memoDatasetRegistryChecked.includes(datasetLabel);

      // Only update if the checked state has changed
      if (checked !== isAlreadyChecked) {
        // Create a shallow copy with updated 'checked' flag
        const updatedRegistry = {
          ...datasetRegistry,
          [datasetLabel!]: {
            ...datasetRegistry[datasetLabel!],
            checked,
          },
        };

        // Set the state
        setDatasetRegistry(updatedRegistry);
        onDatasetChanged?.(datasetIndex, datasetLabel, checked);
      }
    },
    [datasetRegistry, memoDatasetRegistryChecked, onDatasetChanged, logger]
  );

  /**
   * Handles when a data was checked/unchecked (via the legend). This is only used by Pie and Doughnut Charts.
   * @param {number} dataIndex - Indicates the data index that was checked/unchecked
   * @param {string} dataLabel - Indicates the data label that was checked/unchecked
   * @param {boolean} checked - Indicates the checked state
   */
  const handleDataChecked = useCallback(
    (dataIndex: number, dataLabel: string, checked: boolean): void => {
      // If already checked
      const isAlreadyChecked = memoDatasRegistryChecked.includes(dataLabel);

      // Only update if the checked state has changed
      if (checked !== isAlreadyChecked) {
        // Create a shallow copy with updated 'checked' flag
        const updatedRegistry = {
          ...datasRegistry,
          [dataLabel]: {
            ...datasRegistry[dataLabel],
            checked,
          },
        };

        // Set the state
        setDatasRegistry(updatedRegistry);
        onDataChanged?.(dataIndex, dataLabel, checked);
      }
    },
    [datasRegistry, memoDatasRegistryChecked, onDataChanged, logger]
  );

  /**
   * Handles when the X Slider changes
   * @param {number | number[]} newValue - Indicates the slider value
   */
  const handleSliderXChange = useCallback(
    (newValue: number | number[]): void => {
      // Set the X State for the slider UI itself
      setXSliderValues(newValue);
    },
    [logger]
  );

  /**
   * Handles when the X Slider changes
   * @param {number | number[]} newValue - Indicates the slider value
   */
  const handleSliderXChangeCommitted = useCallback(
    (newValue: number | number[]): void => {
      // Set the X values active
      setXSliderValuesActive(newValue);

      // Callback
      onSliderXChanged?.(newValue);
    },
    [onSliderXChanged, logger]
  );

  /**
   * Handles when the Y Slider changes
   * @param {number | number[]} newValue - Indicates the slider value
   */
  const handleSliderYChange = useCallback(
    (newValue: number | number[]): void => {
      // Set the Y State for the slider UI itself
      setYSliderValues(newValue);
    },
    [logger]
  );

  /**
   * Handles when the Y Slider changes
   * @param {number | number[]} newValue - Indicates the slider value
   */
  const handleSliderYChangeCommitted = useCallback(
    (newValue: number | number[]): void => {
      // Set the Y values active
      setYSliderValuesActive(newValue);

      // Callback
      onSliderYChanged?.(newValue);
    },
    [onSliderYChanged, logger]
  );

  /**
   * Handles when the Steps Switcher changes
   * @param {unknown} e
   * @param {MenuItem} item
   */
  const handleStepsSwitcherChanged = useCallback(
    (e: unknown, item: typeof MenuItem): void => {
      // Set the step switcher
      setSelectedSteps(item.props.value as StepsPossibility);

      // Callback
      onStepSwitcherChanged?.(item.props.value as StepsPossibility);
    },
    [onStepSwitcherChanged, logger]
  );

  /**
   * Handles when the Scale Switcher changes
   * @param {unknown} e
   * @param {MenuItem} item
   */
  const handleScalesSwitcherChanged = useCallback(
    (e: unknown, item: typeof MenuItem): void => {
      // Set the scale switcher
      setSelectedScale(item.props.value as ScalePossibility);

      // Callback
      onScalesSwitcherChanged?.(item.props.value as ScalePossibility);
    },
    [onScalesSwitcherChanged, logger]
  );

  /**
   * Handles when the States must be cleared
   */
  const handleResetStates = useCallback((): void => {
    // Clear all states
    setDatasetRegistry(delegateToTurnCheckedToTrue);
    setDatasRegistry(delegateToTurnCheckedToTrue);
    setSelectedSteps(inputs?.geochart.useSteps ?? false);
    setXSliderValuesActive(undefined);
    setYSliderValuesActive(undefined);

    // Callback
    onResetStates?.();
  }, [inputs?.geochart.useSteps, onResetStates, logger]);

  /**
   * Handles the display of the label on the X Slider
   * @param {number} value - Indicates the slider value
   */
  const handleSliderXValueFormat = useCallback(
    (value: number): string => {
      // Callback in case we're overriding this behavior
      const val = onSliderXValueDisplaying?.(value);
      if (val) return val;

      // Default behavior
      // If current chart has time as xAxis
      if (inputs?.geochart?.xAxis.type === 'time' || inputs?.geochart?.xAxis.type === 'timeseries') {
        const d = ChartParsing.readDateValue(value);
        return ChartParsing.writeDateValue(
          d,
          language,
          inputs.geochart.xAxis.timeIANA,
          ChartParsing.calculateTimeFormat(inputs.geochart.xAxis.timeFormat, language)
        );
      }

      // Default value as is
      return value.toString();
    },
    [
      language,
      inputs?.geochart.xAxis.timeFormat,
      inputs?.geochart.xAxis.timeIANA,
      inputs?.geochart.xAxis.type,
      onSliderXValueDisplaying,
      logger,
    ]
  );

  /**
   * Handles the display of the label on the Y Slider
   * @param {number} value - Indicates the slider value
   */
  const handleSliderYValueFormat = useCallback(
    (value: number): string => {
      // Callback in case we're overriding this behavior
      const val = onSliderYValueDisplaying?.(value);
      if (val) return val;

      // Default value as is
      return value.toString();
    },
    [onSliderYValueDisplaying, logger]
  );

  /**
   * Show export menu.
   */
  const handleExportClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    },
    [logger]
  );

  /**
   * Close export menu.
   */
  const handleExportClose = useCallback(() => {
    setAnchorEl(null);
  }, [logger]);

  /**
   * Handles when the download filtered button is clicked
   */
  const handleDownloadFiltered = useCallback((): void => {
    // Get the data
    const data = { ...selectedDatasource! } as GeoChartDatasource;

    // Get either the actually filtered records (via the sliders) or the data.items
    data.items = filteredRecords || data.items;

    // If using categories
    if (inputs?.category) {
      // Filter on the selected datasets
      data.items = data.items?.filter((value) => {
        return memoDatasetRegistryChecked.includes(value[inputs.category!.property] as string);
      });

      // In case of pie/doughnut
      if (chartType === 'pie' || chartType === 'doughnut') {
        // Also filter on selected datas
        data.items = data.items?.filter((value) => {
          return memoDatasRegistryChecked.includes(value[inputs.geochart.xAxis.property] as string);
        });
      }
    }

    // Callback
    let fileName = onDownloadClicked?.(data);
    if (!fileName) fileName = 'chart-data.json';

    // Download the data as json
    Utils.downloadJson(data, fileName);
  }, [
    chartType,
    memoDatasetRegistryChecked,
    memoDatasRegistryChecked,
    filteredRecords,
    inputs?.category,
    inputs?.geochart.xAxis.property,
    onDownloadClicked,
    selectedDatasource,
    logger,
  ]);

  /**
   * Handles when the download all button is clicked
   */
  const handleDownloadAll = useCallback((): void => {
    // Get the data
    const data = { ...selectedDatasource! } as GeoChartDatasource;

    // Callback
    let fileName = onDownloadClicked?.(data);
    if (!fileName) fileName = 'chart-data.json';

    // Download the data as json
    Utils.downloadJson(data, fileName);
  }, [onDownloadClicked, selectedDatasource, logger]);

  /**
   * Handles when the user wants to lock the states
   */
  const handleLockStates = useCallback(() => {
    // Switch the lock
    setLockedUI(!lockedUI);
  }, [lockedUI]);

  // #endregion

  // #region HOOKS USE EFFECT PARENT COMP SECTION *********************************************************************************

  // Effect hook when the inputs change - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - PARENT - INPUTS';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, parentInputs);

    // Refresh the inputs in this component
    setInputs(parentInputs);

    // Clear dependency states because we're cleaning house and until the selected datasource is
    // property reset, inputs might be unrelated to the selected datasource in the other useEffects.
    setSelectedDatasource(undefined);
    setChartData(DEFAULT_DATA as ChartData<TType, TData, TLabel>);
    setChartOptions(DEFAULT_OPTIONS as ChartOptions<TType>);

    // If parentInputs is specified
    if (parentInputs) {
      // Validate the schema of the received inputs
      setValidatorInputs(schemaValidator.validateInputs(parentInputs));
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC, parentInputs);
    };
  }, [parentInputs, schemaValidator, logger]);

  // Effect hook when the main props about charttype, options and data change - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - PARENT - CHARTJS INPUTS';
    logger.logTraceUseEffect(USE_EFFECT_FUNC);

    // Override
    setChartType(parentChart);
    setChartOptions(parentOptions!);
    setChartData(parentData);

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [parentChart, parentOptions, parentData, logger]);

  // Effect hook when the selected datasource changes - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - PARENT - DATASOURCE';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, parentDatasource);

    // Set the datasource as provided
    setSelectedDatasource(parentDatasource);

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC, parentDatasource);
    };
  }, [parentDatasource, logger]);

  // Effect hook to be executed with loading datasource - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - PARENT - LOADING DATASOURCE';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, parentLoadingDatasource);

    // If defined, update the state
    if (parentLoadingDatasource !== undefined) {
      setIsLoadingDatasource(parentLoadingDatasource);
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [parentLoadingDatasource, logger]);

  // Effect hook when an action needs to happen - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - PARENT - ACTION';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, parentAction);

    // Set action for the component
    if (parentAction) setAction(parentAction);

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [parentAction, logger]);

  // Effect hook when i18n changes - coming from parent component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - language';
    logger.logTraceUseEffect(USE_EFFECT_FUNC);

    // Dynamically inject translations if not already loaded
    if (!i18n.hasResourceBundle(language, NAMESPACE_I18N)) {
      // Add the local resource bundle to the provided i18n
      i18n.addResourceBundle(language, NAMESPACE_I18N, localI18n.getResourceBundle(language, NAMESPACE_I18N), true, true);
    }

    // If different language
    if (i18n.language !== language) {
      // Change the i18n language
      i18n.changeLanguage(language).catch((error: unknown) => {
        // Failed
        logger.logPromiseFailed('in i18n.changeLanguage in language useEffect', error);
      });
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [i18n, language, logger]);

  // #endregion

  // #region HOOKS USE EFFECT CURRENT COMP SECTION *********************************************************************************

  // Keep the inputs ref synchronized with the latest inputs value
  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  // Effect hook to register ChartJS plugins
  // Uses a ref for inputs to avoid re-registering the plugin when inputs change
  useEffect(() => {
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - PLUGINS';
    logger.logTraceUseEffect(USE_EFFECT_FUNC);

    const plugin = {
      id: 'geochart-chartjs-plugin',
      afterInit: (chartEvent: unknown): void => {
        const chart = chartEvent as ChartJS<TType, TData, TLabel>;

        // WCAG - Set aria-label on canvas element for screen readers
        if (chart.canvas && inputsRef.current) {
          const chartTitle = inputsRef.current.title || `${inputsRef.current.chart} chart`;
          chart.canvas.setAttribute('aria-label', chartTitle);
        }

        handleChartJSAfterInit(chart);
      },
    };

    setPlugins([plugin]);

    return () => {
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [handleChartJSAfterInit, logger]);

  // Effect hook when the inputs change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - INPUTS';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, inputs);

    // Reset the state of the useSteps to the config, we don't want to be stuck on a setting set by a ui which may not exist anymore
    setSelectedSteps(inputs?.geochart.useSteps ?? false);

    // Reset the state of the useScale to the config
    setSelectedScale(inputs?.geochart.yAxis?.type ?? 'linear');

    // If no datasources on the inputs, create a default one
    if (inputs && inputs.datasources && inputs.datasources.length > 0) {
      // The datasource to load on start
      const ds = inputs.datasources[0];

      // Init the datasource items for the first record and sets it
      if (!ds.items && inputs.query) {
        // Must fetch straight away
        fetchDatasourceItems(inputs.query, language, ds.sourceItem)
          .then((result) => {
            // If faking results
            if (DEBUG_MOCKING_RESULT_FILTERING) {
              // eslint-disable-next-line no-param-reassign
              result = result.filter((res) => {
                // Read values
                const xValue = ChartParsing.readDateValue(res[inputs.geochart.xAxis.property]);
                const yValue = Number(res[inputs.geochart.yAxis.property]);

                // If within the range of data we want to mockup
                return (
                  xValue >= DEFAULT_FAKE_X_MIN &&
                  xValue <= DEFAULT_FAKE_X_MAX &&
                  yValue >= DEFAULT_FAKE_Y_MIN &&
                  yValue <= DEFAULT_FAKE_Y_MAX
                );
              });
            }

            // Set the items
            ds.items = result;

            // Set the datasource
            setSelectedDatasource(ds);
          })
          .catch((error: unknown) => {
            // Handle fetch error
            handleFetchErrorHandler(inputs.query?.url!, error);
          });
      } else setSelectedDatasource(ds);
    } else setSelectedDatasource(undefined);

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC, inputs);
    };
  }, [inputs, language, handleFetchErrorHandler, logger]);

  // Effect hook when the inputs and selected datasource changes - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - SELECTED DATASOURCE';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, inputs, selectedDatasource);

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
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC, selectedDatasource);
    };
  }, [inputs, selectedDatasource, processDatasets, processLabels, logger]);

  // Effect hook when the selected datasource changes - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - SELECTED DATASOURCE LOCK';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, selectedDatasource);

    // If UI is not locked, reset the states on datasource change
    if (selectedDatasource && !lockedUI) {
      // Turn all dataset registry values to checked
      setDatasetRegistry(delegateToTurnCheckedToTrue);

      // Turn all datas registry values to checked
      setDatasRegistry(delegateToTurnCheckedToTrue);

      // Resets all x/y slider values
      setXSliderValuesActive(undefined);
      setYSliderValuesActive(undefined);
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC, selectedDatasource);
    };
  }, [selectedDatasource, lockedUI, logger]);

  // Effect hook when the selected datasource changes - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - DATASOURCE STEPS SLIDERS';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, inputs, selectedDatasource);

    // If selectedDatasource is specified
    if (inputs && selectedDatasource) {
      // Process the axes
      let [xMinVal, xMaxVal, yMinVal, yMaxVal] = processAxes(inputs.geochart, inputs.ui, selectedDatasource.items);

      // Process the axes values
      let valuesComeFromState = false;
      [valuesComeFromState, [xMinVal, xMaxVal, yMinVal, yMaxVal]] = processAxesValues(
        inputs.ui,
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
          language,
          selectedSteps,
          selectedScale,
          selectedDatasource.items,
          xMinVal !== undefined && xMaxVal !== undefined ? [xMinVal, xMaxVal] : undefined,
          yMinVal !== undefined && yMaxVal !== undefined ? [yMinVal, yMaxVal] : undefined
        );
      } else {
        // Load records without filtering for nothing
        processLoadingRecords(inputs, datasetRegistry, datasRegistry, language, selectedSteps, selectedScale, selectedDatasource.items);
      }
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC, selectedDatasource);
    };
  }, [
    inputs,
    selectedDatasource,
    datasRegistry,
    datasetRegistry,
    language,
    selectedSteps,
    selectedScale,
    xSliderValues, // Use xSliderValuesActive if you want to update the Chart only when the values from the slider are 'committed'
    ySliderValues, // Use ySliderValuesActive if you want to update the Chart only when the values from the slider are 'committed'
    processLoadingRecordsFilteringFirst,
    processLoadingRecords,
    logger,
  ]);

  /**
   * Keeps the local state values in sync with the store values.
   */
  useEffect(() => {
    // Log
    logger.logTraceUseEffect('GEOCHART - storeValues', xSliderValuesActive);

    // Sync local state
    setXSliderValues(xSliderValuesActive);
  }, [xSliderValuesActive, logger]);

  /**
   * Keeps the local state values in sync with the store values.
   */
  useEffect(() => {
    // Log
    logger.logTraceUseEffect('GEOCHART - storeValues', ySliderValuesActive);

    // Sync local state
    setYSliderValues(ySliderValuesActive);
  }, [ySliderValuesActive, logger]);

  // Effect hook when the chartOptions, chartData change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - CHARTJS OPTIONS+DATA';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, chartOptions, chartData);

    // If chart options. Validate the parsing we did do follow ChartJS options schema validating
    if (chartOptions) {
      // Validate the options inputs
      const validRes = schemaValidator.validateOptions(chartOptions);
      if (!validRes.valid) {
        // Log
        logger.logError('Failed when validating data options for Chart', validRes);
      }
      setValidatorOptions(validRes);
    }

    // If chart data. Validate the parsing we did do follow ChartJS data schema validating
    if (chartData) {
      // Validate the data inputs
      const validRes = schemaValidator.validateData(chartData);
      if (!validRes.valid) {
        // Log
        logger.logError('Failed when validating data inputs for Chart', validRes);
      }
      setValidatorData(validRes);
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [chartOptions, chartData, schemaValidator, logger]);

  // Effect hook when the datasetRegistry change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - DATASETS REGISTRY';
    logger.logTraceUseEffect(USE_EFFECT_FUNC);

    // Make sure the visibility of the chart aligns with the selected datasets
    updateDatasetVisibilityUsingState(chartRef.current!, datasetRegistry);

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [datasetRegistry, updateDatasetVisibilityUsingState, logger]);

  // Effect hook when the datasRegistry change - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - DATAS REGISTRY';
    logger.logTraceUseEffect(USE_EFFECT_FUNC);

    // Make sure the visibility of the chart aligns with the selected datas
    updateDataVisibilityUsingState(chartRef.current!, datasRegistry);

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [datasRegistry, updateDataVisibilityUsingState, logger]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - VALIDATORS - INPUTS';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, ChartCore.hasValidSchemas([validatorInputs]));

    // If any error
    if (!ChartCore.hasValidSchemas([validatorInputs])) {
      // Gather error messages
      const error = SchemaValidator.parseValidatorResultsMessages([validatorInputs]);
      // If a callback is defined
      onError?.(`${t('geochart.parsingError')}\n\n${error}`, undefined);
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [logger, t, validatorInputs, onError]);

  // Effect hook to validate the schemas of inputs - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - VALIDATORS - OPTIONS+DATA';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, ChartCore.hasValidSchemas([validatorOptions, validatorData]));

    // If any error
    if (!ChartCore.hasValidSchemas([validatorOptions, validatorData])) {
      // Gather error messages
      const error = SchemaValidator.parseValidatorResultsMessages([validatorOptions, validatorData]);
      // If a callback is defined
      onError?.(`${t('geochart.parsingError')}\n\n${error}`, undefined);
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [validatorOptions, validatorData, t, logger, onError]);

  // Effect hook when an action needs to happen - coming from this component.
  useEffect(() => {
    // Log
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - ACTION';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, action);

    // If redraw is true, reset the property in the action, set the redraw property to true for the chart, then prep a timer to reset it to false after the redraw has happened.
    // A bit funky, but only way I could find without having code the logic within the Parent Component.
    if (action?.shouldRedraw) {
      action.shouldRedraw = false;
      // Redraw
      performRedraw().catch((error: unknown) => {
        // Log error
        logger.logPromiseFailed('in performRedraw in ACTION useEffect', error);
      });
    }

    return () => {
      // Log
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [action, logger]);

  // Effect hook to announce loading state changes to screen readers
  useEffect(() => {
    const USE_EFFECT_FUNC = 'GEOCHART - CURRENT - LOADING ANNOUNCEMENT';
    logger.logTraceUseEffect(USE_EFFECT_FUNC, isLoadingDatasource);

    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isLoadingDatasource) {
      hasLoadingStarted.current = true;
      setLiveAnnouncement(t('geochart.loadingData'));
    } else if (hasLoadingStarted.current) {
      // Only announce completion if loading had actually started
      setLiveAnnouncement(t('geochart.dataLoaded'));

      timer = setTimeout(() => {
        setLiveAnnouncement('');
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      logger.logTraceUseEffectUnmount(USE_EFFECT_FUNC);
    };
  }, [isLoadingDatasource, t, logger]);

  // #endregion

  // #region RENDER SECTION *******************************************************************************************

  /**
   * Renders the Chart JSX.Element itself using Line as default
   * @returns The Chart JSX.Element itself using Line as default
   */
  const renderChart = (): JSX.Element => {
    return <ChartReact ref={chartRef} type={chartType} data={chartData} options={chartOptions} plugins={plugins} redraw={redraw} />;
  };

  /**
   * Renders the X Axis label
   * @returns The Chart JSX.Element representing the X Axis label, or null for non-line/bar charts
   */
  const renderXAxisLabel = (): JSX.Element | null => {
    if (chartType === 'line' || chartType === 'bar')
      return (
        <Box id={xAxisLabelId} sx={sxClasses.xAxisLabel}>
          {inputs?.geochart.xAxis.label || inputs?.geochart.xAxis.property}
        </Box>
      );
    return null;
  };

  /**
   * Renders the Y Axis label
   * @returns The Chart JSX.Element representing the Y Axis label, or null for non-line/bar charts
   */
  const renderYAxisLabel = (): JSX.Element | null => {
    // If line or bar chart
    if (chartType === 'line' || chartType === 'bar')
      return (
        <Box id={yAxisLabelId} sx={sxClasses.yAxisLabel}>
          {inputs?.geochart.yAxis.label || inputs?.geochart.yAxis.property}
        </Box>
      );
    return null;
  };

  /**
   * Generate marker labels for the slider values
   * @returns The array of slider markers
   */
  const getMarkers = useCallback((min: number, max: number, numberOfMarks: number, handleSliderValueDisplay: (value: number) => string) => {
    // Calculate the range of values we're working with
    const range = max - min;
    // Calculate the steps we're expecting based on the number of marks we want
    const step = range / numberOfMarks;

    // If any range
    if (range) {
      // Generate marks dynamically based on min, max, and step
      return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => {
        const value = ChartParsing.fixDecimals(min + i * step);
        return {
          value,
          label: handleSliderValueDisplay(value),
        };
      });
    }

    // Empty
    return [];
  }, []);

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
              getAriaLabel={(index: number) => {
                const baseLabel = inputs?.geochart.xAxis.label || inputs?.geochart.xAxis.property || t('geochart.xAxis');
                return Array.isArray(xSliderValues) && xSliderValues.length === 2
                  ? `${baseLabel}, ${index === 0 ? t('geochart.start') : t('geochart.end')}`
                  : baseLabel;
              }}
              marks={getMarkers(xSliderMin, xSliderMax, DEFAULT_NUMBER_OF_SLIDER_MARKS_X, handleSliderXValueFormat)}
              min={xSliderMin}
              max={xSliderMax}
              step={xSliderSteps}
              value={xSliderValues || 0}
              onChange={handleSliderXChange}
              onChangeCommitted={handleSliderXChangeCommitted}
              onValueLabelFormat={handleSliderXValueFormat}
              onValueDisplayAriaLabel={handleSliderXValueFormat}
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
              getAriaLabel={(index: number) => {
                const baseLabel = inputs?.geochart.yAxis.label || inputs?.geochart.yAxis.property || t('geochart.yAxis');
                return Array.isArray(ySliderValues) && ySliderValues.length === 2
                  ? `${baseLabel}, ${index === 0 ? t('geochart.start') : t('geochart.end')}`
                  : baseLabel;
              }}
              marks={getMarkers(ySliderMin, ySliderMax, DEFAULT_NUMBER_OF_SLIDER_MARKS_Y, handleSliderYValueFormat)}
              min={ySliderMin}
              max={ySliderMax}
              step={ySliderSteps}
              value={ySliderValues || 0}
              orientation="vertical"
              valueLabelDisplay="auto"
              onChange={handleSliderYChange}
              onChangeCommitted={handleSliderYChangeCommitted}
              onValueLabelFormat={handleSliderYValueFormat}
              onValueDisplayAriaLabel={handleSliderYValueFormat}
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
  const renderDescription = (): JSX.Element | null => {
    // If an y description
    if (inputs?.ui?.description) {
      return <Box>{inputs.ui.description}</Box>;
    }
    return null;
  };

  /**
   * Renders the download data button
   * @returns The Download data button if wanted in the UI
   */
  const renderDownload = (): JSX.Element | null => {
    if (inputs?.ui?.download) {
      return (
        <>
          <IconButton
            onClick={handleExportClick}
            aria-label={t('geochart.exportBtn')}
            tooltip={t('geochart.exportBtn')}
            tooltipPlacement="top"
            className="buttonOutline"
          >
            <DownloadIcon />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleExportClose}>
            <MenuItem onClick={handleDownloadFiltered}>{t('geochart.downloadFiltered')}</MenuItem>
            <MenuItem onClick={handleDownloadAll}>{t('geochart.downloadAll')}</MenuItem>
          </Menu>
        </>
      );
    }
    return null;
  };

  /**
   * Renders the Datasource selector
   * @returns The Datasource selector Element
   */
  const renderDatasourceSelector = (): JSX.Element | null => {
    if (inputs) {
      // Create the menu items
      const menuItems: TypeMenuItemProps[] = [];
      inputs.datasources.forEach((s: GeoChartDatasource) => {
        menuItems.push({ key: s.value || s.display, item: { value: s.value || s.display, children: s.display || s.value } });
      });

      // The feature(s) label
      let featureLabel = t('geochart.feature');
      if (inputs.datasources.length > 1) featureLabel += 's';

      return (
        <Tooltip title={t('geochart.featuresTooltip')} arrow placement="top">
          <Select
            container={containerElement}
            sx={sxClasses.datasourceSelector}
            label={featureLabel}
            labelId={datasourceLabelId}
            onChange={handleDatasourceChanged}
            menuItems={menuItems}
            value={selectedDatasource?.value || selectedDatasource?.display || ''}
          />
        </Tooltip>
      );
    }

    // Empty
    return null;
  };

  /**
   * Renders the Title of the GeoChart
   * @returns The Ttile Element
   */
  const renderTitle = (): JSX.Element | null => {
    if (inputs && inputs.title) {
      return (
        <Typography component="h3" variant="h6" sx={sxClasses.title}>
          {inputs.title}
        </Typography>
      );
    }

    // Empty
    return null;
  };

  const renderUIOptionsStepsSwitcher = (): JSX.Element | null => {
    if (inputs?.ui?.stepsSwitcher) {
      // Default all values
      let stepsOptions: StepsPossibility[] = [...StepsPossibilitiesConst];

      // If the stepsSwitcher is an array
      if (isStepPossibilityArray(inputs.ui.stepsSwitcher)) {
        stepsOptions = inputs.ui.stepsSwitcher;
      }

      // Create the menu items
      const menuItems: TypeMenuItemProps[] = [];
      stepsOptions.forEach((stepOption: string | boolean) => {
        menuItems.push({ key: stepOption, item: { value: stepOption, children: stepOption.toString() } });
      });

      return (
        <Tooltip title={t('geochart.stepsTooltip')} arrow placement="top">
          <Select
            container={containerElement}
            sx={sxClasses.uiOptionsStepsSelector}
            label={t('geochart.steps')}
            labelId={stepsLabelId}
            onChange={handleStepsSwitcherChanged}
            menuItems={menuItems}
            value={selectedSteps ?? inputs?.geochart.useSteps ?? false}
          />
        </Tooltip>
      );
    }
    return null;
  };

  const renderUIOptionsScalesSwitcher = (): JSX.Element | null => {
    if (inputs?.ui?.scalesSwitcher) {
      // Default all values
      let scaleOptions: ScalePossibility[] = [...ScalePossibilitiesConst];

      // If the scalesSwitcher is an array
      if (isScalePossibilityArray(inputs.ui.scalesSwitcher)) {
        scaleOptions = inputs.ui.scalesSwitcher;
      }

      // Create the menu items
      const menuItems: TypeMenuItemProps[] = [];
      scaleOptions.forEach((scaleOption: string) => {
        menuItems.push({ key: scaleOption, item: { value: scaleOption, children: scaleOption.toString() } });
      });

      return (
        <Tooltip title={t('geochart.scaleTooltip')} arrow placement="top">
          <Select
            container={containerElement}
            sx={sxClasses.uiOptionsScaleSelector}
            label={t('geochart.scale')}
            labelId={scaleLabelId}
            onChange={handleScalesSwitcherChanged}
            menuItems={menuItems}
            value={selectedScale || inputs?.geochart.yAxis?.type || 'linear'}
          />
        </Tooltip>
      );
    }
    return null;
  };

  const renderUIOptionsResetStates = (): JSX.Element | null => {
    if (inputs?.ui?.resetStates) {
      return (
        <IconButton
          onClick={handleResetStates}
          aria-label={t('geochart.resetStates')}
          tooltip={t('geochart.resetStates')}
          tooltipPlacement="top"
          className="buttonOutline"
        >
          <ResetIcon />
        </IconButton>
      );
    }
    return null;
  };

  /**
   * Renders the UI Options
   * @returns The UI Options Element
   */
  const renderUIOptions = (): JSX.Element => {
    return (
      <>
        {renderUIOptionsStepsSwitcher()}
        {renderUIOptionsScalesSwitcher()}
      </>
    );
  };

  /**
   * Renders the UI Lock button
   * @returns The UI Lock Element
   */
  const renderLockOptions = (): JSX.Element => {
    // Depending on the locked state, tweak the tooltip
    let tooltip = t('geochart.lockStates');
    if (lockedUI) {
      tooltip = t('geochart.unlockStates');
    }

    return (
      <IconButton
        onClick={handleLockStates}
        aria-label={t('geochart.lockLabel')}
        aria-pressed={lockedUI}
        tooltip={tooltip}
        tooltipPlacement="top"
        className="buttonOutline"
      >
        {lockedUI ? <LockIcon /> : <LockOpenIcon />}
      </IconButton>
    );
  };

  /**
   * Renders the Dataset selector, aka the legend
   * @returns The Dataset selector Element
   */
  const renderDatasetSelector = (): JSX.Element | null => {
    if (inputs && chartData && inputs.category) {
      if (Object.keys(datasetRegistry).length > 1) {
        const label = chartType === 'pie' || chartType === 'doughnut' ? `${t('geochart.categories')}:` : '';
        return (
          <Box sx={sxClasses.checkDatasetContainer} role="group" aria-label={t('geochart.categories')}>
            {label && <Typography sx={sxClasses.checkDatasetWrapperLabel}>{label}</Typography>}
            {Object.entries(datasetRegistry)
              .filter(([, dsOption]: [string, GeoChartDatasetOption]) => {
                return dsOption.visible;
              })
              .map(([dsLabel, dsOption]: [string, GeoChartDatasetOption], idx: number) => {
                let color;
                if (chartType === 'line' || chartType === 'bar') color = dsOption.borderColor;
                const checkboxId = `${datasetCheckboxBaseId}-${idx}`; // Ensure uniqueness if rendering multiple
                return (
                  <Box component="label" htmlFor={checkboxId} sx={sxClasses.checkDatasetWrapper} key={checkboxId}>
                    <Checkbox
                      id={checkboxId}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                        handleDatasetChecked(idx, dsLabel, e.target?.checked);
                      }}
                      checked={memoDatasetRegistryChecked.includes(dsLabel)}
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
    return null;
  };

  /**
   * Renders the Data selector for the pie and doughnut charts
   * @returns The Data selector Element
   */
  const renderDataSelector = (): JSX.Element | null => {
    if (inputs && chartData) {
      if (chartType === 'pie' || chartType === 'doughnut') {
        if (Object.keys(datasRegistry).length > 1) {
          return (
            <Box sx={sxClasses.checkDatasetContainer} role="group" aria-label={t('geochart.dataLabels')}>
              {Object.entries(datasRegistry)
                .filter(([, dsOption]: [string, GeoChartDatasetOption]) => {
                  return dsOption.visible;
                })
                .map(([dsLabel, dsOption]: [string, GeoChartDatasetOption], idx: number) => {
                  const color = dsOption.borderColor;
                  const checkboxId = `${dataCheckboxBaseId}-${idx}`; // Ensure uniqueness if rendering multiple

                  return (
                    <Box component="label" htmlFor={checkboxId} sx={sxClasses.checkDatasetWrapper} key={checkboxId}>
                      <Checkbox
                        id={checkboxId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                          handleDataChecked(idx, dsLabel, e.target?.checked);
                        }}
                        checked={memoDatasRegistryChecked.includes(dsLabel)}
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
    return null;
  };

  /**
   * Renders the Chart container JSX.Element or an empty box
   * @returns The Chart container JSX.Element or an empty box
   */
  const renderChartContainer = (): JSX.Element => {
    // The xs: 1, 11 and 12 used here are as documented online
    return (
      <Paper sx={{ ...sx, ...sxClasses.mainGeoChartContainer }}>
        {/* Header section */}
        <Box sx={sxClasses.headerContainer}>
          <Box sx={sxClasses.header}>
            <Box sx={sxClasses.headerSelections} role="group" aria-label={t('geochart.filters')}>
              {renderDatasourceSelector()}
              {renderUIOptions()}
            </Box>
            <Box sx={sxClasses.headerActions} role="group" aria-label={t('geochart.actions')}>
              {renderUIOptionsResetStates()}
              {renderLockOptions()}
              {renderDownload()}
            </Box>
          </Box>
          <Box sx={sxClasses.dataset}>
            {renderTitle()}
            {renderDataSelector()}
            {renderDatasetSelector()}
          </Box>
        </Box>

        {/* Chart section - Y axis label, chart, Y slider */}
        <Box sx={sxClasses.chartContentContainer}>
          {/* Only render Y-axis container for line/bar charts */}
          {(chartType === 'line' || chartType === 'bar') && <Box sx={sxClasses.yAxisContainer}>{renderYAxisLabel()}</Box>}
          <Box sx={sxClasses.chartContent}>
            {isLoadingDatasource && <CircularProgress aria-label={t('geochart.loadingData')} sx={sxClasses.loadingDatasource} />}
            {renderChart()}
          </Box>
          {inputs?.chart === 'line' && inputs.ui?.ySlider?.display && <Box sx={sxClasses.ySliderContainer}>{renderYSlider()}</Box>}
        </Box>
        {/* X axis section */}
        <Box sx={sxClasses.xAxisContainer}>
          {renderXAxisLabel()}
          {renderXSlider()}
        </Box>

        {/* Description */}
        {renderDescription()}
        {/* WCAG 4.1.3 - ARIA live region for loading state announcements */}
        <Box
          role="status"
          aria-live="polite"
          aria-atomic="true"
          sx={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          {liveAnnouncement}
        </Box>
      </Paper>
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
        {isLoadingChart && <CircularProgress aria-label={t('geochart.loadingChart')} />}
      </Box>
    );
  };

  /**
   * Renders the whole Chart container JSX.Element or an empty box
   * @returns The whole Chart container JSX.Element or an empty box
   */
  const renderChartContainerFailed = (): JSX.Element => {
    return (
      <Box role="alert" sx={sxClasses.chartError}>
        {t('geochart.parsingError')} {t('geochart.viewConsoleDetails')}
      </Box>
    );
  };

  // #endregion

  // TODO: Add a check if there's a 'current error', not just a 'valid schemas' error
  // If no errors
  if (ChartCore.hasValidSchemas([validatorInputs, validatorOptions, validatorData])) {
    // Render the chart
    return renderEverything();
  }

  // Failed to render
  return renderChartContainerFailed();
}
