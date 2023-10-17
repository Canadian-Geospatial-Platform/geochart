import { Chart as ChartJS, DefaultDataPoint, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie, ChartProps } from 'react-chartjs-2';

/**
 * Create a customized Chart Pie UI
 *
 * @param {TypeChartPieProps} props the properties passed to the Chart element
 * @returns {JSX.Element} the created Chart element
 */
export function ChartPie(props: ChartProps<'pie', DefaultDataPoint<'pie'>>): JSX.Element {
  const { data, options, redraw, style } = props;

  ChartJS.register(ArcElement, Tooltip, Legend);

  return <Pie style={style} data={data} options={options} redraw={redraw} />;
}
