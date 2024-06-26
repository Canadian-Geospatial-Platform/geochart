/**
 * SX Classes for the Chart
 */
import { Theme } from '@mui/material/styles';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getSxClasses = (theme: Theme) => {
  return {
    mainContainer: {
      fontFamily: theme.typography.body1.fontFamily,
    },
    mainGeoChartContainer: {
      position: 'relative',
      padding: '20px',
      display: 'flex',
      borderColor: theme.palette.geoViewColor?.primary.main,
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
      marginLeft: 'auto',
      '& button': {
        height: '40px',
        textTransform: 'capitalize',
        backgroundColor: theme.palette.geoViewColor?.bgColor.dark[100],
        color: theme.palette.geoViewColor?.textColor.main,
        '&:hover': {
          backgroundColor: theme.palette.geoViewColor?.bgColor.dark[50],
          color: theme.palette.geoViewColor?.textColor.main,
        },
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
      fontSize: theme.palette.geoViewFontSize?.default,
      textAlign: 'center',
      margin: '10px 0px',
    },
    yAxisLabel: {
      fontFamily: theme.typography.body1.fontFamily,
      fontWeight: theme.typography.fontWeightBold,
      fontSize: theme.palette.geoViewFontSize?.default,
      position: 'absolute',
      top: '45%',
      margin: '0 auto',
      marginLeft: '20px',
      writingMode: 'vertical-rl',
      transform: 'rotate(-180deg)',
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
      '& .Mui-checked': {
        color: `${theme.palette.geoViewColor?.primary.main} !important`,
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
        color: theme.palette.geoViewColor?.primary.main,
      },
      '& .MuiSlider-markLabel-overlap': {
        marginTop: '20px',
      },
      '& .MuiSlider-markLabel-first': {
        marginLeft: '-40px',
      },
      '& .MuiSlider-markLabel-last': {
        marginLeft: '40px',
      },
      '& .markLabel-first': {
        fontFamily: theme.typography.body1.fontFamily,
        fontSize: theme.palette.geoViewFontSize?.sm,
        float: 'left',
        marginLeft: '-60px',
        color: '#000',
        opacity: 0.6,
      },
      '& .markLabel-last': {
        fontFamily: theme.typography.body1.fontFamily,
        fontSize: theme.palette.geoViewFontSize?.sm,
        float: 'right',
        marginRight: '-60px',
        color: '#000',
        opacity: 0.6,
      },
    },
    ySliderWrapper: {
      height: '70%',
      textAlign: 'center',
      marginTop: '-20px',
      marginLeft: '20px',
      '& .MuiSlider-root': {
        color: theme.palette.geoViewColor?.primary.main,
      },
      '& .markLabel-top, & .markLabel-bottom': {
        fontFamily: theme.typography.body1.fontFamily,
        fontSize: theme.palette.geoViewFontSize?.sm,
        marginLeft: '-30px',
        color: '#000',
        opacity: 0.6,
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
