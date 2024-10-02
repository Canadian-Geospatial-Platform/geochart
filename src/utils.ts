/**
 * Checks if the value is a number.
 * @param val unknown An unknown value
 * @returns boolean True when the value is a number.
 */
export const isNumber = (val: unknown): boolean => {
  return typeof val === 'number' && !Number.isNaN(val);
};

/**
 * Finds the color in a palette for the given index.
 * When the index is greater than the palette length, it loops back to the beginning.
 * @param colorPalette string[] The color palette to seek for a color
 * @param index number The index we should find a color for
 * @returns string The color at the specified index location in the palette
 */
export const getColorFromPalette = (colorPalette: string[] | undefined, index: number, defaultColor: string): string => {
  if (colorPalette) return colorPalette[index % colorPalette.length];
  return defaultColor;
};

/**
 * Extracts the color value without its alpha layer.
 * It accepts colors specified in hex, rgb() and rgba() formats.
 * @param color string The color to extract the value without the alpha layer
 * @returns string The opaque color equivalent in rbg() format.
 */
export const extractColor = (color: string): string => {
  // Regular expression patterns for different color formats
  const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const rgbPattern = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i;
  const rgbaPattern = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d*\.?\d+)\)$/i;

  // Check for hex color format
  const hexMatch = color.match(hexPattern);
  if (hexMatch) {
    const hex =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split('')
            .map((c) => c + c)
            .join('')
        : hexMatch[1];
    return `#${hex}`;
  }

  // Check for rgb color format
  const rgbMatch = color.match(rgbPattern);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Check for rgba color format
  const rgbaMatch = color.match(rgbaPattern);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgb(${r}, ${g}, ${b})`;
  }

  // As-is
  return color;
};

/**
 * Downloads the data object as a JSON file on the client.
 */
export const downloadJson = (data: unknown, filename: string): void => {
  const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', filename);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

/**
 * Guesses the estimated steps that should be used by the slider, depending on the value range
 * @param {number} minValue - The minimum value
 * @param {number} maxValue - The maximum value
 * @returns The estimated stepping value based on the min and max values
 */
export const guessEstimatedStep = (minValue: number, maxValue: number): number | undefined => {
  const day1 = 86400000; // 24h x 60m x 60s x 1000ms = 86,400,000ms in a day
  const month1 = day1 * 30; // 2,592,000,000ms in 1 month
  const months2 = month1 * 2; // 5,184,000,000ms in 2 months
  const year1 = day1 * 365; // 31,536,000,000ms in 1 year
  const years2 = year1 * 2; // 63,072,000,000ms in 2 years
  const years10 = year1 * 10; // 315,360,000,000 in 10 years
  const intervalDiff = maxValue - minValue;

  let step: number | undefined;
  if (intervalDiff > months2) step = day1; // Daily stepping
  if (intervalDiff > years2) step = month1; // Monthly stepping
  if (intervalDiff > years10) step = year1; // Yearly stepping
  return step;
};
