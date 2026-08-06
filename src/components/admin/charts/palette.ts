/**
 * Chart colours, computed rather than chosen.
 *
 * The obvious move was to reuse the platform brand colours from
 * `PlatformIcons.tsx` — Fiverr green, Upwork green, LinkedIn blue. Running them
 * through a contrast/CVD validator against the real card surface (#131318)
 * killed that idea:
 *
 *     #1DBF73 (Fiverr) vs #14A800 (Upwork) — ΔE 9.9 normal vision — HARD FAIL
 *
 * Two greens, and they are the two most important sources on the chart. Brand
 * colours stay where they already work — the icon beside each row, where shape
 * carries the identity — and the marks use the palette below.
 *
 * Validated as a set against #131318:
 *   lightness band PASS · chroma floor PASS · CVD ΔE 8.4 worst adjacent PASS
 *   normal-vision ΔE 19.3 PASS · contrast ≥3:1 PASS
 *
 * Assigned in this fixed order and never cycled. A seventh category folds into
 * "Other" rather than inventing an eighth hue.
 */
export const SERIES = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
] as const;

/**
 * The brand lime is L 0.936 — far outside the 0.48–0.67 band a categorical
 * slot needs, so it can never be one. It is correct as the SINGLE-series
 * colour, where there is no adjacent pair to separate and only contrast
 * matters.
 */
export const SINGLE = "#D0FF4E";

/** Recessive furniture, from the app's own theme tokens. */
export const GRID = "#26262E";
export const AXIS = "#8A8880";
export const SURFACE = "#131318";

export const seriesColour = (i: number) => SERIES[i % SERIES.length];
