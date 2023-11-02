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
export const getColorFromPalette = (colorPalette: string[], index: number): string => {
  return colorPalette[index % colorPalette.length];
};

/**
 * Extracts the color value without an alpha layer.
 * It accepts colors specified in hex, rgb() and rgba() formats.
 * @param color string The color to extract the value without the alpha layer
 * @returns string The opaque color equivalent in rbg() format.
 */
export const extractColor = (color: string): string | null => {
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

  // // Handle named colors (like "red")
  // const opt = new Option();
  // opt.style.color = color;
  // const namedColor = opt.style.color;
  // if (namedColor) {
  //   document.body.appendChild(opt);
  //   debugger;
  //   const computedColor = getComputedStyle(opt).color;
  //   document.body.removeChild(opt);
  //   return extractColor(computedColor);
  // }

  // As-is
  return color;
};
