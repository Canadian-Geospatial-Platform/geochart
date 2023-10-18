import { Chart } from './chart';
import { ValidatorResult } from './chart-validator';

/**
 * Create a container to visualize a GeoChart in a standalone manner.
 *
 * @returns {JSX.Elemet} the element that has the GeoChart
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
  const handleChartLoad = (e: Event) => {
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
  const handleError = (dataErrors: ValidatorResult, optionsErrors: ValidatorResult) => {
    // Gather all error messages
    let msgData = '';
    dataErrors.errors?.forEach((m: string) => {
      msgData += `${m}\n`;
    });

    // Gather all error messages
    let msgOptions = '';
    optionsErrors.errors?.forEach((m: string) => {
      msgOptions += `${m}\n`;
    });

    // Show the error (actually, can't because the snackbar is linked to a map at the moment and geochart is standalone)
    // TODO: Decide if we want the snackbar outside of a map or not and use showError or not
    cgpv.api.utilities.showError('', msgData);
    cgpv.api.utilities.showError('', msgOptions);
    console.error(dataErrors.errors, optionsErrors.errors);
    alert('There was an error parsing the Chart inputs. View console for details.');
  };

  /**
   * Handles when the Chart X Axis has changed.
   */
  const handleChartXAxisChanged = () => {
    console.log('Handle Chart X Axis');
  };

  /**
   * Handles when the Chart Y Axis has changed.
   */
  const handleChartYAxisChanged = () => {
    console.log('Handle Chart Y Axis');
  };

  // Effect hook to add and remove event listeners
  useEffect(() => {
    window.addEventListener('chart/load', handleChartLoad);
    return () => {
      window.removeEventListener('chart/load', handleChartLoad);
    };
  });

  // Render the Chart
  return (
    <Chart
      style={{ width: 800 }}
      data={data}
      options={options}
      handleSliderXChanged={handleChartXAxisChanged}
      handleSliderYChanged={handleChartYAxisChanged}
      handleError={handleError}
    />
  );
}

export default App;
