import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render, FLYER_ENGINE_VERSION } from '../src/flyers/index.js';
import { resolveTemplate, TEMPLATES } from '../src/flyers/manifest.js';
import { normaliseEvent } from '../src/flyers/normalise.js';
import { measure } from '../src/flyers/metrics.js';
import { FIXTURES, FIXTURE_NOW } from '../src/flyers/fixtures.js';

const SIZE_BUDGETS = { page: 60 * 1024, scrap: 60 * 1024 };

for (const [name, fixture] of Object.entries(FIXTURES)) {
  test(`${name}: renders without throwing, on both surfaces`, () => {
    for (const surface of ['page', 'scrap']) {
      const result = render(fixture, { surface, now: FIXTURE_NOW });
      assert.ok(result, `${name}/${surface} returned null`);
    }
  });

  test(`${name}: is deterministic (byte-identical across two renders)`, () => {
    const a = render(fixture, { surface: 'page', now: FIXTURE_NOW });
    const b = render(fixture, { surface: 'page', now: FIXTURE_NOW });
    assert.equal(a.svg, b.svg);
  });

  test(`${name}: stays under its surface's size budget`, () => {
    for (const surface of ['page', 'scrap']) {
      const result = render(fixture, { surface, now: FIXTURE_NOW });
      const bytes = new TextEncoder().encode(result.svg).length;
      assert.ok(bytes <= SIZE_BUDGETS[surface], `${name}/${surface} is ${bytes} bytes, over the ${SIZE_BUDGETS[surface]} budget`);
    }
  });

  test(`${name}: produces a valid, self-contained SVG`, () => {
    const result = render(fixture, { surface: 'page', now: FIXTURE_NOW });
    assert.ok(result.svg.startsWith('<svg'), 'does not start with <svg');
    assert.ok(result.svg.includes('viewBox='), 'missing viewBox');
    assert.ok(result.svg.includes('role="img"'), 'missing role="img"');
    assert.ok(result.svg.includes('<title>'), 'missing <title>');
    assert.doesNotMatch(result.svg, /href\s*=\s*"https?:/i, 'contains an external href');
    assert.doesNotMatch(result.svg, /<script/i, 'contains a <script> element');
  });
}

test('different seed_salt values produce different output for the same event', () => {
  const a = render({ ...FIXTURES.full, seed_salt: 0 }, { now: FIXTURE_NOW });
  const b = render({ ...FIXTURES.full, seed_salt: 1 }, { now: FIXTURE_NOW });
  assert.notEqual(a.svg, b.svg);
});

test('a broken template returns null instead of throwing (contour is the only template, its own fallback)', () => {
  const original = TEMPLATES.contour;
  TEMPLATES.contour = { ...original, render: () => { throw new Error('deliberately broken'); } };
  try {
    const result = render(FIXTURES.full, { now: FIXTURE_NOW });
    assert.equal(result, null);
  } finally {
    TEMPLATES.contour = original;
  }
});

test('resolveTemplate honours an explicit flyer_template that is still registered', () => {
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'dubstep' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, 'contour');
  assert.equal(template.id, 'contour');
});

test('resolveTemplate ignores an explicit flyer_template that no longer exists (an archived template)', () => {
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'dubstep' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, 'consignment');
  assert.equal(template.id, 'contour');
});

test('resolveTemplate still resolves to contour when contour cannot take the event', () => {
  // contour's own maxLineup is 6; longLineup has 12 acts, so contour is
  // skipped in the candidate loop, but the unconditional final fallback
  // (owner decision, 2026-09-13: stick purely to the real contour map)
  // returns contour regardless.
  const event = normaliseEvent(FIXTURES.longLineup, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, null);
  assert.equal(template.id, 'contour');
});

test('resolveTemplate defaults to contour when no explicit choice applies', () => {
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'a genre nobody uses' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, null);
  assert.equal(template.id, 'contour');
});

test('FLYER_ENGINE_VERSION is a semver string', () => {
  assert.match(FLYER_ENGINE_VERSION, /^\d+\.\d+\.\d+$/);
});

// Direct coverage for every registered template, forced explicitly --
// contour is the only one left in the codebase (see manifest.js), so
// this loop now runs once, but stays a loop rather than a single
// hardcoded test in case a template is ever un-archived.
for (const templateId of Object.keys(TEMPLATES)) {
  const fixture = FIXTURES.full;

  test(`${templateId}: renders the full fixture without throwing`, () => {
    const forced = { ...fixture, flyer_template: templateId };
    const result = render(forced, { surface: 'page', now: FIXTURE_NOW });
    assert.ok(result, `${templateId} returned null`);
    assert.equal(result.templateId, templateId, `${templateId} did not satisfy its own needs/minLineup against its own suited fixture`);
  });

  test(`${templateId}: is deterministic`, () => {
    const forced = { ...fixture, flyer_template: templateId };
    const a = render(forced, { surface: 'page', now: FIXTURE_NOW });
    const b = render(forced, { surface: 'page', now: FIXTURE_NOW });
    assert.equal(a.svg, b.svg);
  });

  // FLYER-ENGINE-SPEC.md section 11 rule 1: the footer band (or the
  // template's own equivalent) is present on every template.
  test(`${templateId}: carries the harm reduction line`, () => {
    const forced = { ...fixture, flyer_template: templateId };
    const result = render(forced, { surface: 'page', now: FIXTURE_NOW });
    assert.ok(result.svg.includes('Look after each other'), `${templateId} is missing the harm reduction line`);
  });

  // Found by hand on two now-archived templates whose canvas was the
  // light paper colour, but ticketFooter always drew this line in
  // palette.paper, the same colour, so it was invisible. Kept generic
  // across every registered template since the same class of bug could
  // recur for any of them.
  test(`${templateId}: the harm reduction line is visible against its own background`, () => {
    const forced = { ...fixture, flyer_template: templateId };
    const result = render(forced, { surface: 'page', now: FIXTURE_NOW });
    const bgMatch = result.svg.match(/<rect x="0" y="0" width="1080" height="1350" fill="([^"]+)"/);
    assert.ok(bgMatch, `${templateId}: no full-canvas background rect found`);
    const harmMatch = result.svg.match(/<text x="[\d.]+" y="[\d.]+"[^>]*fill="([^"]+)"[^>]*>Look after each other<\/text>/s);
    assert.ok(harmMatch, `${templateId}: harm reduction text not found`);
    assert.notEqual(harmMatch[1], bgMatch[1], `${templateId}: harm reduction text is the same colour as the background`);
  });
}

test('resolveTemplate exclude has no effect on auto-routing now contour is the only candidate', () => {
  // Owner decision (2026-09-13): stick purely to the real contour map --
  // contour is the only auto-routing candidate now, and the unconditional
  // final fallback is also contour, so excluding it changes nothing.
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'techno' }, { now: FIXTURE_NOW });
  const withoutExclude = resolveTemplate(event, null);
  assert.equal(withoutExclude.id, 'contour');

  const nudged = resolveTemplate(event, null, { exclude: 'contour' });
  assert.equal(nudged.id, 'contour');
});

test('resolveTemplate exclude has no effect on an explicit choice', () => {
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'techno' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, 'contour', { exclude: 'contour' });
  assert.equal(template.id, 'contour');
});

test('past events render with an extra grain layer over the full canvas', () => {
  const grainCount = (svg) => (svg.match(/<filter id="grain-/g) || []).length;

  const current = render({ ...FIXTURES.full, flyer_template: 'contour' }, { now: FIXTURE_NOW });
  const past = render({ ...FIXTURES.past, flyer_template: 'contour' }, { now: FIXTURE_NOW });

  assert.equal(grainCount(past.svg), grainCount(current.svg) + 1);
});

test('contour never places the venue label outside the canvas or in the footer band', () => {
  // The marker's ring radius/angle are seeded and the ring can be one of
  // the outer ones, well past the canvas on any angle -- found sitting on
  // the footer rule on the cancelled fixture. Try enough seeds that a
  // regression would show up. Canvas is 1080x1350, margin 72, so
  // canvas.right is 1008 and canvas.bottom is 1278; TICKET_FOOTER_HEIGHT
  // is 126.
  const footerTop = 1278 - 126;
  for (let i = 0; i < 40; i++) {
    const event = { ...FIXTURES.cancelled, id: `evt_venuecheck${i}`, flyer_template: 'contour' };
    const result = render(event, { now: FIXTURE_NOW });
    const match = result.svg.match(/<text x="(-?[\d.]+)" y="([\d.]+)" text-anchor="start" font-family="'Archivo',Arial,sans-serif" font-size="37" letter-spacing="0.1em"[^>]*>([^<]*)<\/text>/);
    assert.ok(match, `seed ${i}: venue label text not found`);
    const [, x, y, text] = match;
    const textWidth = measure(text, { font: 'archivo', size: 37, letterSpacing: 3.7 });
    assert.ok(Number(x) >= 72, `seed ${i}: venue label at x=${x} runs off the left edge`);
    assert.ok(Number(x) + textWidth <= 1008, `seed ${i}: venue label at x=${x} (width ${textWidth.toFixed(1)}) runs off the right edge`);
    assert.ok(Number(y) < footerTop - 20, `seed ${i}: venue label at y=${y} is inside the footer band (starts at ${footerTop})`);
  }
});

test('contour keeps the venue label within the canvas and clear of the footer/header in every label direction', () => {
  // Owner feedback: keep the label off the highlighted line where
  // possible, done by placing it in the direction of the local
  // elevation gradient away from the venue's own point. A pure
  // one-axis gradient forces each of the four directions deterministically.
  const footerTop = 1278 - 126;
  const gradients = { right: (r, c) => c * 100, left: (r, c) => -c * 100, down: (r) => r * 100, up: (r) => -r * 100 };
  for (const [dir, fn] of Object.entries(gradients)) {
    const grid = flatGrid(9, fn);
    const event = { ...FIXTURES.full, id: `evt_dircheck_${dir}`, flyer_template: 'contour', elevation_grid: JSON.stringify(grid) };
    const result = render(event, { now: FIXTURE_NOW });

    const match = result.svg.match(/<text x="(-?[\d.]+)" y="([\d.]+)" text-anchor="([a-z]+)" font-family="'Archivo',Arial,sans-serif" font-size="37" letter-spacing="0.1em"[^>]*>([^<]*)<\/text>/);
    assert.ok(match, `${dir}: venue label not found`);
    const [, x, y, anchor, text] = match;
    const textWidth = measure(text, { font: 'archivo', size: 37, letterSpacing: 3.7 });
    const left = anchor === 'end' ? Number(x) - textWidth : anchor === 'middle' ? Number(x) - textWidth / 2 : Number(x);
    const right = anchor === 'end' ? Number(x) : anchor === 'middle' ? Number(x) + textWidth / 2 : Number(x) + textWidth;

    assert.ok(left >= 71, `${dir}: label runs off the left edge (left=${left})`);
    assert.ok(right <= 1009, `${dir}: label runs off the right edge (right=${right})`);
    assert.ok(Number(y) < footerTop - 20, `${dir}: label is inside the footer band (y=${y})`);
  }
});

test('contour masks the contour lines behind the headliner and venue label, snug to the text', () => {
  // Owner request: an opaque box behind each, sized to the text plus
  // minor padding rather than a generic wide band.
  const result = render({ ...FIXTURES.full, flyer_template: 'contour' }, { now: FIXTURE_NOW });

  const headliner = FIXTURES.full.lineup.split('\n')[0].toUpperCase();
  const headlinerWidth = measure(headliner, { font: 'archivo', size: 56 });
  const headlinerRect = result.svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#0a0a0a"\/><text[^>]*font-weight="800"/);
  assert.ok(headlinerRect, 'no mask rect found immediately before the headliner text');
  const [, , , hw, hh] = headlinerRect;
  assert.ok(Math.abs(Number(hw) - (headlinerWidth + 20)) < 2, `headliner mask width ${hw} is not snug to the measured text width (${headlinerWidth.toFixed(1)} + padding)`);
  // Cap height (0.72em) plus padding, not the full font size plus
  // padding -- a looser box would read as a generic band, not text-snug.
  assert.ok(Math.abs(Number(hh) - (56 * 0.72 + 20)) < 2, `headliner mask height ${hh} is not the expected cap-height-plus-padding figure`);

  const venueRect = result.svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="#0a0a0a"\/><text[^>]*font-size="37"/);
  assert.ok(venueRect, 'no mask rect found immediately before the venue label text');
  const [, , , , vh] = venueRect;
  assert.ok(Math.abs(Number(vh) - (37 * 0.72 + 20)) < 2, `venue label mask height ${vh} is not the expected cap-height-plus-padding figure`);
});

test('contour lists support acts under the headliner', () => {
  // FIXTURES.full: 'Deep Signal\nKylo B2B Mantis\nResidents' -- Deep
  // Signal is the headliner, the other two are support.
  const result = render({ ...FIXTURES.full, flyer_template: 'contour' }, { now: FIXTURE_NOW });
  assert.ok(result.svg.includes('KYLO B2B MANTIS'), 'missing first support act');
  assert.ok(result.svg.includes('RESIDENTS'), 'missing second support act');
});

test('contour wraps a long support-act line instead of truncating to "+N MORE"', () => {
  // contour's own maxLineup is 6, so this stays within it while still
  // being far too wide for one line at size 22. Owner request: contour
  // is the only auto-routed template left, so every act has to show --
  // no "+N MORE" any more, it wraps onto as many lines as it needs.
  const lineup = [
    'Deep Signal',
    'An Extremely Long Support Act Name One',
    'Another Extremely Long Support Act Name Two',
    'Yet Another Very Long Named Act Three',
    'Fourth Long Named Support Act Here',
    'Fifth Act Also With A Long Name',
  ].join('\n');
  const event = { ...FIXTURES.full, lineup, flyer_template: 'contour' };
  const result = render(event, { now: FIXTURE_NOW });
  assert.equal(result.templateId, 'contour');
  assert.doesNotMatch(result.svg, /\+\d+ MORE/, 'every act should show in full, never truncated');
  assert.match(result.svg, /FIFTH ACT ALSO WITH A LONG NAME/, 'the last support act should still be drawn');
});

test('contour draws no support-act line when there is no support (single-act lineup)', () => {
  const event = { ...FIXTURES.full, lineup: 'Deep Signal', flyer_template: 'contour' };
  const result = render(event, { now: FIXTURE_NOW });
  assert.ok(!result.svg.includes('MORE'), 'unexpected support-act markup with no support acts');
});

function flatGrid(size, fn) {
  const values = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) values.push(fn(r, c));
  }
  return { size, spacingMeters: 150, values };
}

test('normaliseEvent never exposes an elevation grid for a location_tba event', () => {
  const grid = flatGrid(9, () => 500);
  const event = normaliseEvent({ ...FIXTURES.tba, elevation_grid: JSON.stringify(grid) }, { now: FIXTURE_NOW });
  assert.equal(event.elevationGrid, null);
});

test('normaliseEvent exposes a valid elevation grid for a disclosed venue', () => {
  const grid = flatGrid(9, (r, c) => 500 + r + c);
  const event = normaliseEvent({ ...FIXTURES.full, elevation_grid: JSON.stringify(grid) }, { now: FIXTURE_NOW });
  assert.equal(event.elevationGrid.size, 9);
  assert.equal(event.elevationGrid.values.length, 81);
});

test('normaliseEvent falls back to null on malformed elevation_grid JSON', () => {
  const event = normaliseEvent({ ...FIXTURES.full, elevation_grid: 'not json' }, { now: FIXTURE_NOW });
  assert.equal(event.elevationGrid, null);
});

test('contour draws real terrain when the event has an elevation grid, and the marker sits at the grid centre', () => {
  const grid = flatGrid(9, (r, c) => 500 + Math.sin(r) * 40 + Math.cos(c) * 40);
  const event = { ...FIXTURES.full, flyer_template: 'contour', elevation_grid: JSON.stringify(grid) };
  const result = render(event, { now: FIXTURE_NOW });
  // Grid centre (r=4, c=4 of 9) maps to exactly canvas centre with the
  // template's overscanned full-bleed mapping. The marker is always the
  // triangle (markerSize a fixed 8), so its top point is 8px above centre.
  assert.ok(result.svg.includes('M 540.0 667.0'), 'marker is not at the grid centre');
});

test('contour highlights the level closest to the venue\'s own elevation, not a random one', () => {
  // A pure north-south ramp (elevation = row only) makes every contour a
  // perfectly horizontal line at a known y, and the venue (grid centre,
  // row 4 of 0-8) sits at elevation 400. Levels are quantised (14-20 of
  // them across the full range), so the highlighted one won't
  // necessarily land exactly on the marker's y -- but it must be the
  // closest of all of them, every time, across enough seeds that
  // "closest" and "random" would visibly differ.
  for (let i = 0; i < 20; i++) {
    const grid = flatGrid(9, (r) => r * 100);
    const event = { ...FIXTURES.full, id: `evt_elevcheck${i}`, flyer_template: 'contour', elevation_grid: JSON.stringify(grid) };
    const result = render(event, { now: FIXTURE_NOW });

    const paths = [...result.svg.matchAll(/<path d="M -?[\d.]+ (-?[\d.]+)[^"]*" fill="none" stroke="([^"]+)" stroke-width="(2\.5|1)"/g)];
    assert.ok(paths.length > 1, `seed ${i}: expected multiple contour levels`);
    const ys = paths.map(([, y]) => Number(y));
    const highlightedYs = paths.filter(([, , , w]) => w === '2.5').map(([, y]) => Number(y));
    assert.equal(highlightedYs.length, 1, `seed ${i}: expected exactly one highlighted level`);

    // A tie (two levels equidistant from the venue's elevation) is
    // possible and fine either way -- compare distances, not identity.
    const minDist = Math.min(...ys.map((y) => Math.abs(y - 675)));
    const highlightedDist = Math.abs(highlightedYs[0] - 675);
    assert.ok(Math.abs(highlightedDist - minDist) < 0.5, `seed ${i}: highlighted level (y=${highlightedYs[0]}, dist ${highlightedDist.toFixed(1)}) is not the closest to the venue's elevation (closest dist is ${minDist.toFixed(1)})`);
  }
});

test('contour falls back to the synthetic map when there is no elevation grid', () => {
  const event = { ...FIXTURES.full, flyer_template: 'contour', elevation_grid: null };
  const result = render(event, { now: FIXTURE_NOW });
  assert.ok(result.svg.startsWith('<svg'));
});

test('contour caps real-terrain segments on a pathological checkerboard grid', () => {
  // Alternating high/low values cross a threshold in almost every cell,
  // the worst case for marching squares' segment count.
  const grid = flatGrid(9, (r, c) => ((r + c) % 2 === 0 ? 0 : 1000));
  const event = { ...FIXTURES.full, flyer_template: 'contour', elevation_grid: JSON.stringify(grid) };
  const result = render(event, { surface: 'page', now: FIXTURE_NOW });
  const bytes = new TextEncoder().encode(result.svg).length;
  assert.ok(bytes <= SIZE_BUDGETS.page, `checkerboard terrain produced ${bytes} bytes, over budget`);
});

test('ticketFooter centres the harm reduction line at the bottom middle, with no site wordmark', () => {
  // Owner request: the wordmark has been removed from every flyer. The
  // harm reduction line remains, centred, as the site's own material.
  const result = render({ ...FIXTURES.full, flyer_template: 'contour' }, { now: FIXTURE_NOW });
  const harmMatch = result.svg.match(/<text x="([\d.]+)" y="[\d.]+" font-family="'Archivo', Arial, sans-serif" font-size="16"\s+fill="[^"]+" opacity="0.7">Look after each other<\/text>/);
  assert.ok(harmMatch, 'harm reduction text not found');
  assert.ok(!/Big Shoulders Display/.test(result.svg), 'wordmark font should not appear anywhere in the flyer');
  assert.ok(!result.svg.includes('CBR EDM'), 'wordmark text should not appear anywhere in the flyer');

  const harmX = Number(harmMatch[1]);
  const harmWidth = measure('Look after each other', { font: 'archivo', size: 16 });
  const harmCentre = harmX + harmWidth / 2;

  assert.ok(Math.abs(harmCentre - 540) < 2, `harm reduction text is not centred on canvas.centerX (540): centre is ${harmCentre.toFixed(1)}`);
});

test('contour centres the date on the same line as doors/close and 18+, not as its own line', () => {
  // Owner request: previously its own centred line well above the
  // footer; now shares the doors/close/18+ row so it reads as one
  // event-facts line instead of two.
  const result = render({ ...FIXTURES.full, flyer_template: 'contour' }, { now: FIXTURE_NOW });

  const dateMatch = result.svg.match(/<text x="540" y="([\d.]+)" text-anchor="middle" font-family="'Archivo', Arial, sans-serif" font-size="22"\s+fill="[^"]+">([^<]+)<\/text>/);
  assert.ok(dateMatch, 'no centred date text found in the footer facts row');

  const ageMatch = result.svg.match(/<text x="[\d.]+" y="([\d.]+)" text-anchor="end" font-family="'Archivo', Arial, sans-serif" font-size="22"\s+fill="[^"]+">18\+<\/text>/);
  assert.ok(ageMatch, 'no 18+ label found');

  assert.equal(dateMatch[1], ageMatch[1], 'date is not on the same line (y) as the 18+ label');
});
