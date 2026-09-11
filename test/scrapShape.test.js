import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrapShapeFor } from '../src/lib/scrapShape.js';

test('same event ID always produces the same shape', () => {
  const first = scrapShapeFor('evt_deepsignal0314');
  const second = scrapShapeFor('evt_deepsignal0314');
  assert.deepEqual(first, second);
});

test('different event IDs produce different shapes', () => {
  const a = scrapShapeFor('evt_deepsignal0314');
  const b = scrapShapeFor('evt_lowfreq0919');
  assert.notEqual(a.clipPath, b.clipPath);
});

test('rotation stays within the +/-1.5deg range from SPEC.md section 13.5', () => {
  const ids = ['evt_a', 'evt_b', 'evt_c', 'evt_d', 'evt_e', 'evt_f', 'evt_g', 'evt_h'];
  for (const id of ids) {
    const { rotationDeg } = scrapShapeFor(id);
    assert.ok(rotationDeg >= -1.5 && rotationDeg <= 1.5, `${id}: ${rotationDeg}`);
  }
});

test('clip-path is a well-formed polygon() value', () => {
  const { clipPath } = scrapShapeFor('evt_deepsignal0314');
  assert.match(clipPath, /^polygon\((-?\d+\.\d% -?\d+\.\d%,?)+\)$/);
});
