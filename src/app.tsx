import { GeoChart } from './chart';
import { GeoChartConfig, ChartType, ChartOptions, ChartData, GeoChartAction, DefaultDataPoint } from './chart-types';
import { SchemaValidator, ValidatorResult } from './chart-schema-validator';

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
  const { react } = cgpv;
  const { useEffect, useState, useCallback } = react;
  const { schemaValidator } = props;

  /** ****************************************** USE STATE SECTION START ************************************************ */

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
  const [language, setLanguage] = useState() as [string, React.Dispatch<React.SetStateAction<string>>];
  const [isLoadingChart, setIsLoadingChart] = useState() as [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  const [isLoadingDatasource, setIsLoadingDatasource] = useState() as [boolean, React.Dispatch<React.SetStateAction<boolean>>];

  /** ****************************************** USE STATE SECTION END ************************************************** */
  /** *************************************** EVENT HANDLERS SECTION START ********************************************** */

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
   * Handles when the Chart language is changed.
   */
  const handleChartLanguage = (e: Event): void => {
    const ev = e as CustomEvent;
    setLanguage(ev.detail.language);
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

  /** **************************************** EVENT HANDLERS SECTION END *********************************************** */
  /** ******************************************* HOOKS SECTION START *************************************************** */

  /**
   * Handles when the Chart has parsed inputs.
   * We use a 'useCallback' so that any child component with a useEffect dependency on the callback
   * doesn't get triggered everytime this parent component re-renders and re-generates its stub.
   */
  const handleParsed = useCallback((theChart: ChartType, theOptions: ChartOptions, theData: ChartData): void => {
    // Raise event higher
    window.dispatchEvent(new CustomEvent('chart/parsed', { detail: { chart: theChart, options: theOptions, data: theData } }));
  }, []) as (theChart: ChartType, theOptions: ChartOptions, theData: ChartData) => void; // Crazy typing, because can't use the generic version of 'useCallback'

  /**
   * Handles an error that happened in the Chart component.
   * We use a 'useCallback' so that any child component with a useEffect dependency on the callback
   * doesn't get triggered everytime this parent component re-renders and re-generates its stub.
   * @param dataErrors The data errors that happened (if any)
   * @param optionsErrors The options errors that happened (if any)
   */
  const handleError = useCallback((validators: (ValidatorResult | undefined)[]): void => {
    // Gather all error messages
    const msgAll = SchemaValidator.parseValidatorResultsMessages(validators);

    // Show the error using an alert. We can't use the cgpv SnackBar as that component is attached to
    // a map and we're not even running a cgpv.init() at all here.
    // eslint-disable-next-line no-alert
    alert(`There was an error parsing the Chart inputs.\n\n${msgAll}\n\nView console for details.`);
  }, []) as (validators: (ValidatorResult | undefined)[]) => void; // Crazy typing, because can't use the generic version of 'useCallback'

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
  }, []);

  /** ********************************************* HOOKS SECTION END *************************************************** */
  /** ******************************************** RENDER SECTION START ************************************************* */

  // Render the Chart
  return (
    <GeoChart
      inputs={inputs}
      language={language}
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
}

export default App;
