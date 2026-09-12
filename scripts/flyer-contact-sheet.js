// Renders every flyer template against every fixture and writes an HTML
// contact sheet for visual review. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 14: "This is the single most useful thing you can build here."
// Run after any change to the engine: node scripts/flyer-contact-sheet.js

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TEMPLATES } from '../src/flyers/manifest.js';
import { render, FLYER_ENGINE_VERSION } from '../src/flyers/index.js';
import { FIXTURES, FIXTURE_NOW } from '../src/flyers/fixtures.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'docs', 'flyers');
const OUT_FILE = join(OUT_DIR, `contact-sheet-v${FLYER_ENGINE_VERSION}.html`);

mkdirSync(OUT_DIR, { recursive: true });

const cells = [];

for (const templateId of Object.keys(TEMPLATES)) {
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) {
    const forced = { ...fixture, flyer_template: templateId };
    const result = render(forced, { surface: 'page', now: FIXTURE_NOW });
    const label = `${templateId} / ${fixtureName}`;
    if (!result) {
      cells.push(`<figure class="cell broken"><figcaption>${label} -- FAILED TO RENDER</figcaption></figure>`);
      continue;
    }
    cells.push(`
      <figure class="cell${result.templateId !== templateId ? ' fell-back' : ''}">
        ${result.svg}
        <figcaption>${label}${result.templateId !== templateId ? ` (fell back to ${result.templateId})` : ''} -- ${new TextEncoder().encode(result.svg).length}B</figcaption>
      </figure>
    `);
  }
}

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Flyer contact sheet -- v${FLYER_ENGINE_VERSION}</title>
<style>
  body { background: #222; font-family: sans-serif; margin: 0; padding: 24px; }
  h1 { color: #eee; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .cell { margin: 0; background: #333; padding: 8px; border-radius: 4px; }
  .cell svg { width: 100%; height: auto; display: block; }
  .cell figcaption { color: #ccc; font-size: 12px; margin-top: 6px; word-break: break-word; }
  .cell.broken { background: #611; }
  .cell.fell-back figcaption { color: #fc6; }
</style>
</head>
<body>
<h1>Flyer contact sheet -- engine v${FLYER_ENGINE_VERSION}</h1>
<p style="color:#999">${Object.keys(TEMPLATES).length} templates x ${Object.keys(FIXTURES).length} fixtures = ${cells.length} compositions.</p>
<div class="grid">${cells.join('')}</div>
</body>
</html>`;

writeFileSync(OUT_FILE, html);
console.log(`Wrote ${OUT_FILE} (${cells.length} compositions)`);
