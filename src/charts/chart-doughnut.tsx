import { Chart as ChartJS, DefaultDataPoint, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, ChartProps } from 'react-chartjs-2';

/**
 * Create a customized Chart Doughnut UI
 *
 * @param {TypeChartDoughnutProps} props the properties passed to the Chart element
 * @returns {JSX.Element} the created Chart element
 */
export function ChartDoughnut(props: ChartProps<'doughnut', DefaultDataPoint<'doughnut'>>): JSX.Element {
  const { data, options, redraw, style } = props;

  ChartJS.register(ArcElement, Tooltip, Legend);

  return <Doughnut style={style} data={data} options={options} redraw={redraw} />;
}
