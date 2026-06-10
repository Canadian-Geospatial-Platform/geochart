/**
 * SX Classes for the Chart
 */
import { Palette, Theme } from '@mui/material/styles';

type GeoViewThemePalette = Palette & { geoViewColor: Palette; geoViewFontSize: { default: number } };

/**
 * Chart container heights optimized for different viewport sizes.
 * - Mobile: Taller to accommodate vertical scrolling patterns
 * - Desktop: Shorter to fit within viewport without vertical scrolling
 */
const CHART_HEIGHT = {
  /** Height for mobile/smaller screens - allows most charts to be functional */
  MOBILE: '800px',
  /** Height for desktop/larger screens - optimized to prevent page scrolling */
  DESKTOP: '636px',
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSxClasses = (theme: Theme): any => {
  // Cast
  const gvThemePalette = theme.palette as GeoViewThemePalette;

  // Base selector style
  const baseSelectorStyle = {
    '& .MuiSelect-select': {
      whiteSpace: 'nowrap', // Prevent text wrapping inside
      overflow: 'hidden', // Hide overflow text
      textOverflow: 'ellipsis',
    },
  };

  return {
    mainContainer: {
      fontFamily: theme.typography.body1.fontFamily,
      height: '100%',
      containerType: 'inline-size',
      containerName: 'main',
    },
    mainGeoChartContainer: {
      position: 'relative',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      borderColor: gvThemePalette.geoViewColor?.primary.main,
      borderWidth: '2px',
      borderStyle: 'solid',
      height: CHART_HEIGHT.MOBILE,
      [`@container main (min-width: ${theme.breakpoints.values.sm}px)`]: {
        height: CHART_HEIGHT.DESKTOP,
        padding: '20px',
      },
      '.fullscreen-mode &': {
        padding: '0',
      },
    },
    headerContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      alignItems: 'center',
      justifyContent: 'flex-start',
      [`@container main (min-width: ${theme.breakpoints.values.sm}px)`]: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
    },
    headerSelections: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '20px',
      alignItems: 'center',
      '& .MuiFormControl-root': {
        maxWidth: '100%',
      },
      [`@container main (max-width: ${theme.breakpoints.values.sm}px)`]: {
        width: '100%',
        flexDirection: 'column',
        alignItems: 'stretch',
      },
    },
    headerActions: {
      display: 'flex',
      gap: 1,
      alignItems: 'center',
    },
    datasourceSelector: {
      ...baseSelectorStyle,
      minWidth: '150px',
      [`@container main (max-width: ${theme.breakpoints.values.sm}px)`]: {
        width: '100%',
      },
    },
    uiOptionsStepsSelector: {
      ...baseSelectorStyle,
      minWidth: '100px',
      [`@container main (max-width: ${theme.breakpoints.values.sm}px)`]: {
        width: '100%',
      },
    },
    uiOptionsScaleSelector: {
      ...baseSelectorStyle,
      minWidth: '130px',
      [`@container main (max-width: ${theme.breakpoints.values.sm}px)`]: {
        width: '100%',
      },
    },
    dataset: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
    },
    title: {
      fontFamily: theme.typography.h5.fontFamily,
      fontWeight: theme.typography.h5.fontWeight,
      fontSize: theme.typography.h5.fontSize,
      textAlign: 'center',
      margin: '0',
    },
    checkDatasetContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '4px',
    },
    chartContentContainer: {
      display: 'flex',
      gap: '10px',
      alignItems: 'stretch',
      position: 'relative',
      flex: '1 1 0%', // Grow to fill remaining space
      minHeight: 0, // Allow shrinking below content size
    },
    xAxisContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '70%', // Provide room to the left and right for tooltips
      justifyContent: 'center',
      alignItems: 'stretch',
      textAlign: 'center',
      margin: '0 auto',
    },
    xAxisLabel: {
      fontFamily: theme.typography.body1.fontFamily,
      fontWeight: theme.typography.fontWeightBold,
      fontSize: gvThemePalette.geoViewFontSize?.default,
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
      textAlign: 'center',
      height: '100%',
    },
    checkDatasetWrapperLabel: {
      display: 'inline-block',
      padding: '10px',
    },
    checkDatasetWrapper: {
      display: 'inline-block',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      '& .Mui-checked': {
        color: `${gvThemePalette?.primary.main} !important`,
      },
    },
    checkDatasetLabel: {
      fontFamily: theme.typography.body1.fontFamily,
      display: 'inline-flex',
      verticalAlign: 'middle',
    },
    yAxisContainer: {
      display: 'flex',
      flexShrink: 0,
      width: '50px', // Fixed width for alignment
      alignItems: 'center',
      justifyContent: 'center',
    },
    chartContent: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    ySliderContainer: {
      display: 'flex',
      flexShrink: 0,
      justifyContent: 'flex-end',
    },
    xSliderWrapper: {
      flex: 1,
      '& .MuiSlider-root': {
        color: gvThemePalette?.primary.main,
      },
      '& .MuiSlider-markLabel': {
        fontSize: '0.75rem',
      },
      // Hide mark labels and remove margin on smaller viewports
      [theme.breakpoints.down('md')]: {
        '& .MuiSlider-markLabel': {
          display: 'none',
        },
        '& .MuiSlider-root': {
          marginBottom: 0, // Remove default margin when labels are hidden
        },
      },
    },
    ySliderWrapper: {
      height: '100%',
      textAlign: 'center',
      '& .MuiSlider-root': {
        color: gvThemePalette?.primary.main,
      },
      '& .MuiSlider-markLabel': {
        whiteSpace: 'nowrap',
        maxWidth: '36px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: '0.75rem',
        display: 'inline-block',
      },
      // Hide mark labels and remove margin on smaller viewports
      [theme.breakpoints.down('md')]: {
        '& .MuiSlider-markLabel': {
          display: 'none',
        },
        '& .MuiSlider-root': {
          marginRight: 0, // Remove default margin when labels are hidden
        },
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
