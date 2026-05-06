/**
 * Utility class with static functions.
 */
export class Utils {
  /**
   * Checks if the value is a number.
   * @param val unknown An unknown value
   * @returns boolean True when the value is a number.
   */
  static isNumber(val: unknown): boolean {
    return typeof val === 'number' && !Number.isNaN(val);
  }

  /**
   * Finds the color in a palette for the given index.
   * When the index is greater than the palette length, it loops back to the beginning.
   * @param colorPalette string[] The color palette to seek for a color
   * @param index number The index we should find a color for
   * @returns string The color at the specified index location in the palette
   */
  static getColorFromPalette(colorPalette: string[] | undefined, index: number, defaultColor: string): string {
    if (colorPalette) return colorPalette[index % colorPalette.length];
    return defaultColor;
  }

  /**
   * Extracts the color value without its alpha layer.
   * It accepts colors specified in hex, rgb() and rgba() formats.
   * @param color string The color to extract the value without the alpha layer
   * @returns string The opaque color equivalent in rbg() format.
   */
  static extractColor(color: string): string {
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
  }

  /**
   * Downloads the data object as a JSON file on the client.
   */
  static downloadJson(data: unknown, filename: string): void {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', filename);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  /**
   * Guesses the estimated steps that should be used by the slider, depending on the value range
   * @param {number} minValue - The minimum value
   * @param {number} maxValue - The maximum value
   * @returns The estimated stepping value based on the min and max values
   */
  static guessEstimatedStep(minValue: number, maxValue: number, desiredSteps: number): number {
    const range = maxValue - minValue;
    const rawStep = range / desiredSteps;
    return Utils.#normalizeTimeStep(rawStep);
  }

  /**
   * Normalizes a raw time step (in milliseconds) to the nearest higher "nice" time interval.
   * Useful for defining consistent step values for sliders or axis ticks on time-based charts,
   * this method returns the smallest standard time interval (e.g., 1 minute, 1 hour, 1 day, etc.)
   * that is greater than or equal to the provided raw step.
   * If the input exceeds all predefined intervals, it defaults to 1 year.
   * @param {number} ms - The raw time step in milliseconds to normalize.
   * @returns {number} A normalized time step in milliseconds from a predefined list of "nice" intervals.
   * @static
   * @private
   */
  static #normalizeTimeStep(ms: number): number {
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    // Nice interval options
    const niceIntervals = [
      minute,
      5 * minute,
      15 * minute,
      30 * minute,
      hour,
      3 * hour,
      6 * hour,
      12 * hour,
      day,
      2 * day,
      week,
      2 * week,
      month,
      3 * month,
      6 * month,
      year,
      2 * year,
      5 * year,
    ];

    // Find closest interval >= desired step
    return niceIntervals.find((interval) => interval >= ms) ?? year;
  }

  /**
   * The default color palette that ChartJS uses (I couldn't easily find out where that const is stored within ChartJS)
   * WCAG - These colors have been verified to have sufficient contrast for text against a white background
   */
  static readonly DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT: string[] = [
    'rgba(31, 119, 180, 0.5)',
    'rgba(214, 39, 40, 0.5)',
    'rgba(44, 140, 140, 0.5)',
    'rgba(227, 119, 0, 0.5)',
    'rgba(148, 103, 189, 0.5)',
    'rgba(188, 128, 0, 0.5)',
    'rgba(140, 140, 140, 0.5)',
    'rgba(0, 0, 200, 0.5)',
    'rgba(0, 130, 0, 0.5)',
    'rgba(200, 0, 0, 0.5)',
    'rgba(230, 115, 0, 0.5)',
    'rgba(180, 0, 180, 0.5)',
    'rgba(0, 150, 0, 0.5)',
    'rgba(150, 0, 150, 0.5)',
    'rgba(0, 140, 140, 0.5)',
    'rgba(180, 140, 0, 0.5)',
    'rgba(128, 0, 128, 0.5)',
    'rgba(0, 100, 100, 0.5)',
    'rgba(100, 100, 0, 0.5)',
    'rgba(100, 100, 100, 0.5)',
  ];

  /**
   * The default color palette that ChartJS uses (I couldn't easily find out where that const is stored within ChartJS)
   */
  static readonly DEFAULT_COLOR_PALETTE_CHARTJS_OPAQUE: string[] = Utils.DEFAULT_COLOR_PALETTE_CHARTJS_TRANSPARENT.map((color: string) => {
    // Extract the alpha-less color code for better output
    return Utils.extractColor(color);
  });

  /**
   * The default color palette to be used for backgrounds when no color palette is specified
   */
  static readonly DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT: string[] = [
    'rgba(0, 0, 255, 0.5)', // blue
    'rgba(0, 255, 0, 0.5)', // green
    'rgba(255, 0, 0, 0.5)', // red
    'rgba(255, 150, 0, 0.5)', // orange
    'rgba(255, 0, 255, 0.5)', // pink
    'rgba(30, 219, 34, 0.5)', // lime green
    'rgba(190, 0, 190, 0.5)', // purple
    'rgba(132, 255, 255, 0.5)', // cyan
    'rgba(255, 250, 0, 0.5)', // yellow
  ];

  /**
   * The default color palette to be used when no color palette is specified
   */
  static readonly DEFAULT_COLOR_PALETTE_CUSTOM_OPAQUE: string[] = Utils.DEFAULT_COLOR_PALETTE_CUSTOM_TRANSPARENT.map((color: string) => {
    // Extract the alpha-less color code for better output
    return Utils.extractColor(color);
  });

  /**
   * The alternate color palette to be used when no alternate color palette is specified, used for pie and doughnut charts
   */
  static readonly DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT: string[] = [
    'rgba(30, 219, 34, 0.5)', // lime green
    'rgba(190, 0, 190, 0.5)', // purple
    'rgba(255, 150, 0, 0.5)', // orange
    'rgba(0, 0, 255, 0.5)', // blue
    'rgba(132, 255, 255, 0.5)', // cyan
    'rgba(255, 0, 255, 0.5)', // pink
    'rgba(0, 255, 0, 0.5)', // green
    'rgba(255, 150, 75, 0.5)', // bisque
  ];

  /**
   * The alternate color palette to be used when no alternate color palette is specified, used for pie and doughnut charts
   */
  static readonly DEFAULT_COLOR_PALETTE_CUSTOM_ALT_OPAQUE: string[] = Utils.DEFAULT_COLOR_PALETTE_CUSTOM_ALT_TRANSPARENT.map(
    (color: string) => {
      // Extract the alpha-less color code for better output
      return Utils.extractColor(color);
    }
  );
}
