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

function parsePolygonPoints(clipPath) {
  const inner = clipPath.replace(/^polygon\(/, '').replace(/\)$/, '');
  return inner.split(',').map((pair) => pair.trim().split(' ').map((v) => parseFloat(v)));
}

function segmentsIntersect([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  // Standard orientation-based segment intersection test, excluding shared
  // endpoints (adjacent polygon edges legitimately touch at a shared point).
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

test('the torn outline never self-intersects (no spike artifacts), and every point is within the box', () => {
  const ids = Array.from({ length: 100 }, (_, i) => `evt_selfintersect_check_${i}`);
  for (const id of ids) {
    const { clipPath } = scrapShapeFor(id);
    const points = parsePolygonPoints(clipPath);

    for (const [x, y] of points) {
      assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${id}: point (${x}, ${y}) is outside the box`);
    }

    const n = points.length;
    for (let i = 0; i < n; i++) {
      const a1 = points[i];
      const a2 = points[(i + 1) % n];
      // Only compare against non-adjacent edges: adjacent edges share an
      // endpoint by construction, which is not a self-intersection.
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const b1 = points[j];
        const b2 = points[(j + 1) % n];
        assert.ok(!segmentsIntersect(a1, a2, b1, b2), `${id}: edges ${i} and ${j} cross`);
      }
    }
  }
});
