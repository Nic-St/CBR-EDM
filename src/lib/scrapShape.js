// Deterministic per-event "paper scrap" shape: a slight rotation and a torn
// clip-path, both seeded from the event ID so the same event always looks
// the same, but different events don't all look identical. See DESIGN.md
// and SPEC.md section 13.5.

/**
 * A small, fast string hash (djb2) used to turn an event ID into a numeric
 * seed. Not cryptographic, just needs to spread similar IDs apart.
 * @param {string} str
 */
function hashSeed(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * A tiny seeded PRNG (mulberry32). Same seed always produces the same
 * sequence, which is what makes a scrap's shape stable across renders.
 * @param {number} seed
 * @returns {() => number} a function returning floats in [0, 1)
 */
function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Places points along one edge of a 0-100% box, each jittered perpendicular
 * to the edge, so the edge reads as torn rather than a straight line.
 * @param {() => number} random
 * @param {number} count - number of segments (count + 1 points)
 * @param {number} jitter - max perpendicular jitter, in percentage points
 * @param {'x'|'y'} axis - 'x' for a horizontal edge (top/bottom), 'y' for a vertical edge (left/right)
 * @param {number} fixedAt - the edge's nominal position (0 or 100) along the other axis
 * @param {number} from
 * @param {number} to
 */
function edgePoints(random, count, jitter, axis, fixedAt, from, to) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const along = from + (to - from) * t;
    const jig = (random() - 0.5) * 2 * jitter;
    const edgeVal = fixedAt + jig;
    points.push(axis === 'x' ? [along, edgeVal] : [edgeVal, along]);
  }
  return points;
}

function toClipPath(points) {
  return `polygon(${points.map((p) => `${p[0].toFixed(1)}% ${p[1].toFixed(1)}%`).join(',')})`;
}

/**
 * Builds a torn-paper outline. Each event's random draw decides how heavy
 * the tear is, how many rough points it gets, and whether the top edge
 * gets extra rough treatment (as if the scrap were ripped off a pole) --
 * so different events land at different points between a light and a
 * heavy tear, rather than all sharing one fixed "style".
 * @param {() => number} random
 */
function tornShape(random) {
  const jitterBase = 2 + random() * 5;
  const pointCount = 4 + Math.floor(random() * 4);
  const topGetsExtraTear = random() < 0.5;
  const topJitter = topGetsExtraTear ? jitterBase * (1.6 + random()) : jitterBase;

  const points = [
    ...edgePoints(random, pointCount, topJitter, 'x', 0, 0, 100), // top
    ...edgePoints(random, pointCount, jitterBase, 'y', 100, 0, 100), // right
    ...edgePoints(random, pointCount, jitterBase, 'x', 100, 100, 0), // bottom
    ...edgePoints(random, pointCount, jitterBase, 'y', 0, 100, 0), // left
  ];

  return {
    rotationDeg: (random() - 0.5) * 3,
    clipPath: toClipPath(points),
  };
}

/**
 * @param {string} eventId
 * @returns {{ rotationDeg: number, clipPath: string }}
 */
export function scrapShapeFor(eventId) {
  const random = mulberry32(hashSeed(eventId));
  return tornShape(random);
}
