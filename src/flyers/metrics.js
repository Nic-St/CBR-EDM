// Font width tables and text measurement, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 4.4. Workers have no measureText and SVG does not wrap text, so
// every template fits its own text using these tables, built ahead of time
// by scripts/build-font-metrics.js from the site's actual WOFF2 files.

import archivo400 from './font-metrics/archivo-400.json' with { type: 'json' };
import bigShouldersDisplay800 from './font-metrics/big-shoulders-display-800.json' with { type: 'json' };
import bigShouldersStencil700 from './font-metrics/big-shoulders-stencil-700.json' with { type: 'json' };
import jetbrainsMono400 from './font-metrics/jetbrains-mono-400.json' with { type: 'json' };

/** Logical font names templates ask for, mapped to their metrics table. */
const TABLES = {
  archivo: archivo400,
  'big-shoulders-display': bigShouldersDisplay800,
  'big-shoulders-stencil': bigShouldersStencil700,
  mono: jetbrainsMono400,
};

/** CSS font-family values, keyed the same way, for the rendered <text>. */
export const FONT_FAMILY = {
  archivo: "'Archivo', Arial, sans-serif",
  'big-shoulders-display': "'Big Shoulders Display', 'Arial Narrow', sans-serif",
  'big-shoulders-stencil': "'Big Shoulders Stencil', 'Arial Narrow', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};

const SAFETY_FACTOR = 1.02;

/**
 * The advance width of one character, in font units, falling back to the
 * width of "n" for anything missing from the table (section 4.4).
 */
function charAdvance(table, codePoint) {
  if (table.widths[codePoint] !== undefined) return table.widths[codePoint];
  const fallback = table.widths['n'.codePointAt(0)];
  return fallback !== undefined ? fallback : table.unitsPerEm * 0.5;
}

/**
 * Measures one line of text (no wrapping) at a given size.
 * @param {string} text
 * @param {{ font: string, size: number, letterSpacing?: number }} options
 */
export function measure(text, { font, size, letterSpacing = 0 }) {
  const table = TABLES[font];
  if (!table) throw new Error(`Unknown flyer font "${font}"`);
  let units = 0;
  for (const ch of text) units += charAdvance(table, ch.codePointAt(0));
  const width = (units / table.unitsPerEm) * size * SAFETY_FACTOR;
  const tracking = letterSpacing * Math.max(0, [...text].length - 1);
  return width + tracking;
}

/** Whether a font table has every glyph in `text` (used by dev warnings only). */
export function coverage(text, font) {
  const table = TABLES[font];
  const missing = [...text].filter((ch) => table.widths[ch.codePointAt(0)] === undefined);
  return { ok: missing.length === 0, missing };
}
