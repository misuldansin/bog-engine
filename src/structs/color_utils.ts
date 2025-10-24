import type { Color } from "../types";

export const STANDARD_COLORS = Object.freeze({
  WHITE: new Uint8ClampedArray([255, 255, 255, 255]) as Color,
  BLACK: new Uint8ClampedArray([0, 0, 0, 255]) as Color,
  GRAY: new Uint8ClampedArray([128, 128, 128, 255]) as Color,
  RED: new Uint8ClampedArray([255, 0, 0, 255]) as Color,
  GREEN: new Uint8ClampedArray([0, 255, 0, 255]) as Color,
  BLUE: new Uint8ClampedArray([0, 0, 255, 255]) as Color,
  YELLOW: new Uint8ClampedArray([255, 255, 0, 255]) as Color,
  CYAN: new Uint8ClampedArray([0, 255, 255, 255]) as Color,
  MAGENTA: new Uint8ClampedArray([255, 0, 255, 255]) as Color,
  TRANSPARENT_BLACK: new Uint8ClampedArray([0, 0, 0, 0]) as Color,
  SEMI_TRANSPARENT_WHITE: new Uint8ClampedArray([255, 255, 255, 128]) as Color,
} as const);

export const color = {
  // ..
  createColor(hex: string | null | undefined): Color {
    return this.hexToColor(hex);
  },

  // ..
  hexToColor(hex: string | null | undefined): Color {
    // Hex is not valid, return black color
    if (hex === null || hex === undefined) {
      return STANDARD_COLORS.BLACK;
    }

    // Remove '#' to get the actual hex value
    let hex_value = hex.replace("#", "");

    // It's a normal hex, add alpha channel
    if (hex_value.length === 6) {
      hex_value += "FF";
    }
    // It's a shorthand, expand and add alpha channel
    else if (hex_value.length === 3) {
      let expanded_hex = "";
      for (const char of hex_value) {
        expanded_hex += char;
        expanded_hex += char;
      }
      hex_value = expanded_hex + "FF";
    }
    // The length in unsupported, return black color
    else {
      return STANDARD_COLORS.BLACK;
    }

    // Parse hex to 32-bit raw color
    const raw = parseInt(hex_value, 16);

    // Unpack and return color (Uint8ClampedArray)
    return new Uint8ClampedArray([
      (raw >> 24) & 255, // R
      (raw >> 16) & 255, // G
      (raw >> 8) & 255, // B
      raw & 255, // A
    ]) as Color;
  },

  // ..
  colorToHex(color: Color): string {
    const [r, g, b, a] = color;
    const toHex = (v: number): string => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  },

  // ..
  lerpColor(colorA: Color, colorB: Color, t: number): Color {
    // Linear interpolation: a + (b - a) * t
    const r = colorA[0] + (colorB[0] - colorA[0]) * t;
    const g = colorA[1] + (colorB[1] - colorA[1]) * t;
    const b = colorA[2] + (colorB[2] - colorA[2]) * t;
    const a = colorA[3] + (colorB[3] - colorA[3]) * t;

    return new Uint8ClampedArray([r, g, b, a]) as Color;
  },

  // ..
  createColorRamp(colorStart: Color, colorEnd: Color, resolution: number): Color[] {
    // Resolution is 1 or less, no need to gradate
    if (resolution < 2) {
      return [colorStart, colorEnd] as Color[];
    }

    // Calculate interpolation steps
    const step = 1 / (resolution - 1);

    // And fill out colors
    const outColors: Color[] = new Array(resolution);
    for (let i = 0; i < resolution; i++) {
      const t = i * step;
      outColors[i] = this.lerpColor(colorStart, colorEnd, t);
    }
    return outColors;
  },

  // ..
  invertColor(color: Color): Color {
    const r = 255 - color[0];
    const g = 255 - color[1];
    const b = 255 - color[2];
    const a = color[3];
    return new Uint8ClampedArray([r, g, b, a]) as Color;
  },

  // ..
  getLuminance(color: Color): number {
    const r = color[0];
    const g = color[1];
    const b = color[2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance;
  },
};
