import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render, FLYER_ENGINE_VERSION } from '../src/flyers/index.js';
import { resolveTemplate, TEMPLATES } from '../src/flyers/manifest.js';
import { normaliseEvent } from '../src/flyers/normalise.js';
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
