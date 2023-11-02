import { GeoChart } from './chart';
import { ChartType, ChartData, ChartOptions } from './chart-types';
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
  const { useEffect, useState } = react;
  const { schemaValidator } = props;

  // Wire handler
  const [inputs, setInputs] = useState();
  const [chart, setChart] = useState();
  const [data, setData] = useState();
  const [options, setOptions] = useState();
  const [action, setAction] = useState();
  const [isLoadingChart, setIsLoadingChart] = useState();
  const [isLoadingDatasource, setIsLoadingDatasource] = useState();

  /**
   * Handles when the Chart has to be loaded with data or options.
   */
  const handleChartLoad = (e: Event): void => {
    const ev = e as CustomEvent;

    // If inputs provided
    if (ev.detail.inputs) {
      setInputs(ev.detail.inputs);
    } else {
      setInputs(null); // Clear
      if (ev.detail.options) {
        setOptions(ev.detail.options);
      }
      if (ev.detail.chart) {
        setChart(ev.detail.chart);
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
   * Handles when the Chart has parsed inputs.
   */
  const handleParsed = (theChart: ChartType, theOptions: ChartOptions, theData: ChartData): void => {
    // Raise event higher
    window.dispatchEvent(new CustomEvent('chart/parsed', { detail: { chart: theChart, options: theOptions, data: theData } }));
  };

  const handleChartLoading = (e: Event): void => {
    const ev = e as CustomEvent;

    setIsLoadingChart(false);
    setIsLoadingDatasource(false);
    if (ev.detail.state === 1) setIsLoadingChart(true);
    if (ev.detail.state === 2) setIsLoadingDatasource(true);
  };

  /**
   * Handles an error that happened in the Chart component.
   * @param dataErrors The data errors that happened (if any)
   * @param optionsErrors The options errors that happened (if any)
   */
  const handleError = (
    inputErrors: ValidatorResult | undefined,
    optionsErrors: ValidatorResult | undefined,
    dataErrors: ValidatorResult | undefined
  ): void => {
    // Gather all error messages
    const msgs = [];
    if (inputErrors) msgs.push(inputErrors);
    if (optionsErrors) msgs.push(optionsErrors);
    if (dataErrors) msgs.push(dataErrors);
    const msgAll = SchemaValidator.parseValidatorResultsMessages(msgs);

    // Show the error using an alert. We can't use the cgpv SnackBar as that component is attached to
    // a map and we're not even running a cgpv.init() at all here.
    // eslint-disable-next-line no-alert
    alert(`There was an error parsing the Chart inputs.\n\n${msgAll}\n\nView console for details.`);
  };

  // Effect hook to add and remove event listeners.
  // Using window.addEventListener is unconventional here, but this is strictly for the 'app' logic with the index.html.
  // It's not something to be used by the developers when using the Chart component in their projects.
  useEffect(() => {
    window.addEventListener('chart/load', handleChartLoad);
    window.addEventListener('chart/redraw', handleChartRedraw);
    window.addEventListener('chart/isLoading', handleChartLoading);
    return () => {
      window.removeEventListener('chart/load', handleChartLoad);
      window.removeEventListener('chart/redraw', handleChartRedraw);
      window.removeEventListener('chart/isLoading', handleChartLoading);
    };
  }, [chart, inputs, data, options]);

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
}

export default App;
