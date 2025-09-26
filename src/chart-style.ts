/**
 * SX Classes for the Chart
 */
import { Palette, Theme } from '@mui/material/styles';

type GeoViewThemePalette = Palette & { geoViewColor: Palette; geoViewFontSize: { default: number } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSxClasses = (theme: Theme): any => {
  // Cast
  const gvThemePalette = theme.palette as GeoViewThemePalette;

  return {
    mainContainer: {
      fontFamily: theme.typography.body1.fontFamily,
    },
    mainGeoChartContainer: {
      position: 'relative',
      padding: '25px',
      display: 'flex',
      borderColor: gvThemePalette.geoViewColor?.primary.main,
      borderWidth: '2px',
      borderStyle: 'solid',
    },
    header: {
      display: 'flex',
      flexDirection: 'row',
    },
    datasourceSelector: {
      minWidth: '150px',
      marginRight: '10px',
      '& .MuiSelect-select': {
        padding: '8px 12px !important',
      },
    },
    uiOptionsStepsSelector: {
      minWidth: '100px',
      '& .MuiSelect-select': {
        padding: '8px 12px !important',
      },
      marginRight: '10px',
    },
    uiOptionsScaleSelector: {
      minWidth: '130px',
      '& .MuiSelect-select': {
        padding: '8px 12px !important',
      },
      marginRight: '10px',
    },
    downloadButton: {
      marginTop: 'auto',
      marginBottom: 'auto',
      marginLeft: 'auto',
      '& button': {
        height: '40px',
        textTransform: 'capitalize',
      },
    },
    dataset: {
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    title: {
      fontFamily: theme.typography.h5.fontFamily,
      fontWeight: theme.typography.h5.fontWeight,
      fontSize: theme.typography.h5.fontSize,
      textAlign: 'center',
      margin: '10px 0px',
    },
    xAxisLabel: {
      fontFamily: theme.typography.body1.fontFamily,
      fontWeight: theme.typography.fontWeightBold,
      fontSize: gvThemePalette.geoViewFontSize?.default,
      textAlign: 'center',
      margin: '10px 0px',
    },
    yAxisContainer: {
      display: 'inline-flex;',
    },
    yAxisLabel: {
      fontFamily: theme.typography.body1.fontFamily,
      fontWeight: theme.typography.fontWeightBold,
      fontSize: gvThemePalette.geoViewFontSize?.default,
      margin: 'auto',
      writingMode: 'vertical-rl',
      position: 'absolute',
      top: '50%',
      transform: 'rotate(-180deg) translateY(50%)',
      transformOrigin: 'center',
    },
    uiOptionsResetStates: {
      display: 'inline-flex',
      width: '40px',
      textTransform: 'capitalize',
      margin: '10px',
    },
    checkDatasetWrapperLabel: {
      display: 'inline-block',
      padding: '10px',
    },
    checkDatasetWrapper: {
      display: 'inline-block',
      cursor: 'pointer',
      '& .Mui-checked': {
        color: `${gvThemePalette?.primary.main} !important`,
      },
    },
    checkDatasetLabel: {
      fontFamily: theme.typography.body1.fontFamily,
      display: 'inline-flex',
      verticalAlign: 'middle',
    },
    chartContent: {
      position: 'relative',
    },
    xSliderWrapper: {
      '& .MuiSlider-root': {
        color: gvThemePalette?.primary.main,
      },
    },
    ySliderWrapper: {
      height: '70%',
      textAlign: 'center',
      marginLeft: '20px',
      '& .MuiSlider-root': {
        color: gvThemePalette?.primary.main,
      },
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
};
