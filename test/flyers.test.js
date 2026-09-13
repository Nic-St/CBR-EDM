import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render, FLYER_ENGINE_VERSION } from '../src/flyers/index.js';
import { resolveTemplate, TEMPLATES } from '../src/flyers/manifest.js';
import { normaliseEvent } from '../src/flyers/normalise.js';
import { measure } from '../src/flyers/metrics.js';
import { FIXTURES, FIXTURE_NOW } from '../src/flyers/fixtures.js';

const SIZE_BUDGETS = { page: 60 * 1024, scrap: 12 * 1024 };

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

test('a broken template falls back to medi instead of throwing', () => {
  const broken = { id: 'broken', name: 'broken', render: () => { throw new Error('deliberately broken'); } };
  TEMPLATES.__broken_test_template = broken;
  try {
    const event = { ...FIXTURES.full, flyer_template: '__broken_test_template' };
    const result = render(event, { now: FIXTURE_NOW });
    assert.ok(result, 'expected a fallback render, got null');
    assert.equal(result.templateId, 'medi');
  } finally {
    delete TEMPLATES.__broken_test_template;
  }
});

test('resolveTemplate honours an explicit flyer_template over genre routing', () => {
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'dubstep' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, 'consignment');
  assert.equal(template.id, 'consignment');
});

test('resolveTemplate falls back to medi when no route or explicit choice applies', () => {
  const event = normaliseEvent({ id: 'x', genres: 'a genre nobody uses' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, null);
  assert.equal(template.id, 'medi');
});

test('FLYER_ENGINE_VERSION is a semver string', () => {
  assert.match(FLYER_ENGINE_VERSION, /^\d+\.\d+\.\d+$/);
});

// Direct coverage for every registered template, forced explicitly --
// FIXTURES resolving naturally by genre wouldn't necessarily reach all
// ten. index-list needs 6+ acts to satisfy its own minLineup, so it gets
// the longLineup fixture instead of full.
for (const templateId of Object.keys(TEMPLATES)) {
  const fixture = templateId === 'index-list' ? FIXTURES.longLineup : FIXTURES.full;

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
}

test('resolveTemplate honours exclude by falling through to the next candidate', () => {
  // Section 8's anti-repetition nudge: techno routes to consignment, so
  // excluding it should fall through to the next satisfied candidate
  // rather than staying on consignment.
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'techno' }, { now: FIXTURE_NOW });
  const withoutExclude = resolveTemplate(event, null);
  assert.equal(withoutExclude.id, 'consignment');

  const nudged = resolveTemplate(event, null, { exclude: 'consignment' });
  assert.notEqual(nudged.id, 'consignment');
});

test('resolveTemplate exclude has no effect on an explicit choice', () => {
  const event = normaliseEvent({ ...FIXTURES.full, genres: 'techno' }, { now: FIXTURE_NOW });
  const template = resolveTemplate(event, 'consignment', { exclude: 'consignment' });
  assert.equal(template.id, 'consignment');
});

test('past events render with an extra grain layer over the full canvas', () => {
  const grainCount = (svg) => (svg.match(/<filter id="grain-/g) || []).length;

  const current = render({ ...FIXTURES.full, flyer_template: 'medi' }, { now: FIXTURE_NOW });
  const past = render({ ...FIXTURES.past, flyer_template: 'medi' }, { now: FIXTURE_NOW });

  assert.equal(grainCount(past.svg), grainCount(current.svg) + 1);
});

test('consignment never lets an Archivo text node overflow the label past the right margin', () => {
  // A long venue name or crew name used to overflow past the column
  // divider or the label's own border, since values were drawn at a
  // fixed size with no measurement. Checks every fixture's rightmost
  // margin (1008 = canvas.right on the 1080-wide canvas).
  for (const fixture of Object.values(FIXTURES)) {
    const result = render({ ...fixture, flyer_template: 'consignment' }, { surface: 'page', now: FIXTURE_NOW });
    const texts = [...result.svg.matchAll(/<text x="([\d.]+)" y="[\d.]+" font-family="'Archivo',Arial,sans-serif" font-size="(\d+(?:\.\d+)?)"[^>]*>([^<]*)<\/text>/g)];
    for (const [, x, size, text] of texts) {
      const rightEdge = Number(x) + measure(text, { font: 'archivo', size: Number(size) });
      assert.ok(rightEdge <= 1008, `"${text}" at size ${size} overflows to ${rightEdge}`);
    }
  }
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
  // template's overscanned full-bleed mapping. Marker shape is seeded
  // (circle/triangle/cross); circle emits the centre as cx/cy, the other
  // two as an "M x y-8" token (markerSize is a fixed 8), so check for
  // either rather than assuming which shape this seed picks.
  assert.ok(result.svg.includes('cx="540.0" cy="675.0"') || result.svg.includes('M 540.0 667.0'), 'marker is not at the grid centre');
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

test('halftoneField never draws riso yellow directly onto the paper field', () => {
  // Section 9: riso yellow only clears contrast as a field colour with
  // dark type on it, never as a mark on paper. Try enough seeds that a
  // real regression would show up.
  for (let i = 0; i < 40; i++) {
    const event = { ...FIXTURES.full, id: `evt_yellowcheck${i}`, flyer_template: 'halftoneField' };
    const result = render(event, { now: FIXTURE_NOW });
    assert.doesNotMatch(result.svg, /fill="#ffe800"/, `seed ${i} drew riso yellow on the paper field`);
  }
});
