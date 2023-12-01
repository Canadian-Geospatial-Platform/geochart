import { GeoChart } from './chart';
import { GeoChartConfig, ChartType, ChartOptions, ChartData, GeoChartAction, DefaultDataPoint } from './chart-types';
import { SchemaValidator } from './chart-schema-validator';

/**
 * Main props for the Application
 */
export interface TypeAppProps {
  schemaValidator: SchemaValidator;
}

/**
 * Create a container to visualize a GeoChart in a standalone manner.
 *
 * @returns {JSX.Element} the element that has the GeoChart
 */
export function App(props: TypeAppProps): JSX.Element {
  // Can't type the window object to a 'TypeWindow', because we don't have access to the cgpv library when this line runs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  // Fetch the cgpv module
  const { cgpv } = w;
  const { react, useTranslation } = cgpv;
  const { useEffect, useState, useCallback } = react;
  const { schemaValidator } = props;

  // Translation
  const { i18n } = useTranslation();

  // #region USE STATE SECTION ****************************************************************************************

  const [inputs, setInputs] = useState() as [
    GeoChartConfig<ChartType> | undefined,
    React.Dispatch<React.SetStateAction<GeoChartConfig<ChartType> | undefined>>
  ];
  const [chart, setChart] = useState() as [ChartType, React.Dispatch<React.SetStateAction<ChartType>>];
  const [data, setData] = useState() as [
    ChartData<ChartType, DefaultDataPoint<ChartType>, string> | undefined,
    React.Dispatch<React.SetStateAction<ChartData<ChartType, DefaultDataPoint<ChartType>, string> | undefined>>
  ];
  const [options, setOptions] = useState() as [ChartOptions | undefined, React.Dispatch<React.SetStateAction<ChartOptions> | undefined>];
  const [action, setAction] = useState() as [GeoChartAction, React.Dispatch<React.SetStateAction<GeoChartAction>>];
  const [isLoadingChart, setIsLoadingChart] = useState() as [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  const [isLoadingDatasource, setIsLoadingDatasource] = useState() as [boolean, React.Dispatch<React.SetStateAction<boolean>>];

  // #endregion

  // #region EVENT HANDLERS SECTION ***********************************************************************************

  /**
   * Handles when the Chart has to be loaded with data or options.
   */
  const handleChartLoad = (e: Event): void => {
    const ev = e as CustomEvent;

    // If inputs provided
    if (ev.detail.inputs) {
      setInputs(ev.detail.inputs);
    } else {
      setInputs(undefined); // Clear
      if (ev.detail.chart) {
        setChart(ev.detail.chart);
      }
      if (ev.detail.options) {
        setOptions(ev.detail.options);
      }
      if (ev.detail.data) {
        setData(ev.detail.data);
      }
      setAction({ shouldRedraw: true });
    }
  };

  /**
   * Handles when the Chart has to be redrawn.
   */
  const handleChartRedraw = (): void => {
    setAction({ shouldRedraw: true });
  };

  /**
   * Handles when the Chart has to show a loading state.
   */
  const handleChartLoading = (e: Event): void => {
    const ev = e as CustomEvent;

    setIsLoadingChart(false);
    setIsLoadingDatasource(false);
    if (ev.detail.state === 1) setIsLoadingChart(true);
    if (ev.detail.state === 2) setIsLoadingDatasource(true);
  };

  // #endregion

  // #region HOOKS SECTION ********************************************************************************************

  /**
   * Handles when the Chart has parsed inputs.
   * @param theChart ChartType The chart type
   * @param theOptions ChartOptions The chart options
   * @param theData ChartData The chart data
   */
  const handleParsed = useCallback((theChart: ChartType, theOptions: ChartOptions, theData: ChartData): void => {
    // Raise event higher
    window.dispatchEvent(new CustomEvent('chart/parsed', { detail: { chart: theChart, options: theOptions, data: theData } }));
  }, []);

  /**
   * Handles a generic error that happened in the Chart component.
   * @param error The error message
   * @param exception The exception that happened (if any)
   */
  const handleError = useCallback((error: string, exception: unknown): void => {
    // Show the error using an alert. We can't use the cgpv SnackBar as that component is attached to
    // a map and we're not even running a cgpv.init() at all here.
    // eslint-disable-next-line no-console
    console.error(error, exception);
    // eslint-disable-next-line no-alert
    alert(error);
  }, []);

  /**
   * Handles when the Chart language is changed.
   */
  const handleChartLanguage = useCallback(
    (e: Event): void => {
      const ev = e as CustomEvent;
      i18n.changeLanguage(ev.detail.language);
    },
    [i18n]
  );

  // Effect hook to add and remove event listeners.
  // Using window.addEventListener is unconventional here, but this is strictly for the 'app' logic with the index.html.
  // It's not something to be used by the developers when using the Chart component in their projects.
  useEffect(() => {
    window.addEventListener('chart/load', handleChartLoad);
    window.addEventListener('chart/redraw', handleChartRedraw);
    window.addEventListener('chart/language', handleChartLanguage);
    window.addEventListener('chart/isLoading', handleChartLoading);
    return () => {
      window.removeEventListener('chart/load', handleChartLoad);
      window.removeEventListener('chart/redraw', handleChartRedraw);
      window.removeEventListener('chart/language', handleChartLanguage);
      window.removeEventListener('chart/isLoading', handleChartLoading);
    };
  }, [handleChartLanguage]);

  // #endregion

  // #region RENDER SECTION START *************************************************************************************

  // Render the Chart
  return (
    <GeoChart
      inputs={inputs}
      schemaValidator={schemaValidator}
      chart={chart}
      data={data}
      options={options}
      action={action}
      isLoadingChart={isLoadingChart}
      isLoadingDatasource={isLoadingDatasource}
      onParsed={handleParsed}
      onError={handleError}
    />
  );

  // #endregion
}

export default App;
