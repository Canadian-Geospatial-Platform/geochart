/**
 * SX Classes for the Chart
 */
export const sxClasses = {
  mainContainer: {
    width: '100%',
    minHeight: '400px',
  },
  mainGeoChartContainer: {},
  header: {
    display: 'flex',
    alignItems: 'center',
  },
  datasourceSelector: {
    minWidth: '150px',
  },
  title: {
    padding: '10px',
    fontSize: 'larger',
  },
  xAxisLabel: {
    textAlign: 'center',
    margin: '10px 0px',
  },
  yAxisLabel: {
    position: 'relative',
    margin: '0 10px',
    writingMode: 'vertical-rl',
    transform: 'rotate(-180deg)',
    transformOrigin: 'bottom center',
  },
  uiOptions: {
    position: 'absolute',
    right: '0px',
    marginRight: '35px',
    verticalAlign: 'middle',
  },
  uiOptionsStepsSelector: {
    minWidth: '100px',
  },
  uiOptionsResetStates: {
    display: 'inline-flex',
    width: '40px',
  },
  checkDatasetWrapperLabel: {
    display: 'inline-block',
    padding: '9px',
  },
  checkDatasetWrapper: {
    display: 'inline-block',
  },
  checkDatasetLabel: {
    display: 'inline-flex',
    verticalAlign: 'middle',
    marginRight: '20px !important',
  },
  chartContent: {
    position: 'relative',
  },
  xSliderWrapper: {},
  ySliderWrapper: {
    height: '85%',
  },
  loadingDatasource: {
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  chartError: {
    fontStyle: 'italic',
    color: 'red',
  },
};
