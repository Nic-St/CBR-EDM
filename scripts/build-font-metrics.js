// Builds font metrics tables for the flyer engine, section 4.4 of
// PROJECT-C-EDM-FLYER-ENGINE-SPEC.md. Workers have no measureText and SVG
// has no text wrapping, so the renderer measures text itself, using these
// tables instead of parsing font files at request time.
//
// Run with: node scripts/build-font-metrics.js
// Commit the output; the Worker never imports fontkit.

import * as fontkit from 'fontkit';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'src', 'flyers', 'font-metrics');

// Basic Latin + Latin-1 Supplement, plus the punctuation the templates
// actually use. Anything outside this table falls back to the width of
// "n" at render time (see src/flyers/metrics.js).
const CODEPOINTS = [];
for (let cp = 0x0020; cp <= 0x007e; cp++) CODEPOINTS.push(cp); // Basic Latin
for (let cp = 0x00a0; cp <= 0x00ff; cp++) CODEPOINTS.push(cp); // Latin-1 Supplement
for (const ch of "-/[]()+:'\"&@#") CODEPOINTS.push(ch.codePointAt(0));

const FONTS = [
  { file: 'archivo.woff2', out: 'archivo-400' },
  { file: 'big-shoulders-display.woff2', out: 'big-shoulders-display-800' },
  { file: 'big-shoulders-stencil.woff2', out: 'big-shoulders-stencil-700' },
  { file: 'jetbrains-mono.woff2', out: 'jetbrains-mono-400' },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { file, out } of FONTS) {
  const path = join(__dirname, '..', 'public', 'fonts', file);
  const font = fontkit.openSync(path);
  const unitsPerEm = font.unitsPerEm;
  const widths = {};
  let missing = 0;

  for (const cp of new Set(CODEPOINTS)) {
    const glyph = font.glyphForCodePoint(cp);
    if (!glyph || glyph.id === 0) {
      missing++;
      continue;
    }
    widths[cp] = glyph.advanceWidth;
  }

  const table = { unitsPerEm, widths };
  writeFileSync(join(OUT_DIR, `${out}.json`), JSON.stringify(table));
  console.log(`${out}: ${Object.keys(widths).length} glyphs, ${missing} missing, unitsPerEm ${unitsPerEm}`);
}
