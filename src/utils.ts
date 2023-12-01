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
