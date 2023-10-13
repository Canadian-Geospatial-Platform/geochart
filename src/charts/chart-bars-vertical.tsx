import { Chart as ChartJS, DefaultDataPoint, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, ChartProps } from 'react-chartjs-2';

/**
 * Create a customized Chart Vertical Bars UI
 *
 * @param {TypeChartVerticalProps} props the properties passed to the Chart element
 * @returns {JSX.Element} the created Chart element
 */
export function ChartBarsVertical(props: ChartProps<'bar', DefaultDataPoint<'bar'>>): JSX.Element {
  const { data, options, redraw, style } = props;

  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

  return <Bar style={style} data={data} options={options} redraw={redraw} />;
}
