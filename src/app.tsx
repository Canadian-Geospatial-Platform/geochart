import { Chart } from './chart';
import { SchemaValidator, ValidatorResult } from './schema-validator';

/**
 * Create a container to visualize a GeoChart in a standalone manner.
 *
 * @returns {JSX.Element} the element that has the GeoChart
 */
export function App(): JSX.Element {
  // Fetch the cgpv module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const { cgpv } = w;
  const { react } = cgpv;
  const { useEffect, useState } = react;

  // Wire handler
  const [data, setData] = useState();
  const [options, setOptions] = useState();

  /**
   * Handles when the Chart has to be loaded with data or options.
   */
  const handleChartLoad = (e: Event): void => {
    const ev = e as CustomEvent;
    if (ev.detail.data) {
      setData(ev.detail.data);
    }
    if (ev.detail.options) {
      setOptions(ev.detail.options);
    }
  };

  /**
   * Handles an error that happened in the Chart component.
   * @param dataErrors The data errors that happened (if any)
   * @param optionsErrors The options errors that happened (if any)
   */
  const handleError = (dataErrors: ValidatorResult, optionsErrors: ValidatorResult): void => {
    // Gather all error messages
    const msgAll = SchemaValidator.parseValidatorResultsMessages([dataErrors, optionsErrors]);

    // Show the error (actually, can't because the snackbar is linked to a map at the moment
    // and geochart is standalone without a cgpv.init() at all)
    // TODO: Decide if we want the snackbar outside of a map or not and use showError or not
    cgpv.api.utilities.showError('', msgAll);
    alert(`There was an error parsing the Chart inputs.\n\n${msgAll}\n\nView console for details.`);
  };

  // Effect hook to add and remove event listeners
  useEffect(() => {
    window.addEventListener('chart/load', handleChartLoad);
    return () => {
      window.removeEventListener('chart/load', handleChartLoad);
    };
  });

  // Render the Chart
  return <Chart style={{ width: 800 }} data={data} options={options} handleError={handleError} />;
}

export default App;
