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

function clamp01to100(value) {
  return Math.max(0, Math.min(100, value));
}

/**
 * Interior points for one edge, walking in a straight line between two
 * already-placed corners and jittering only the perpendicular coordinate.
 * Because the along-edge coordinate is strictly interpolated from 0 to 1,
 * points on the same edge are always in order and can never cross each
 * other, however large the jitter -- that ordering is what actually
 * prevents the self-intersecting spikes, not the jitter size.
 * @param {() => number} random
 * @param {[number, number]} from - [x, y] of the starting corner
 * @param {[number, number]} to - [x, y] of the ending corner
 * @param {number} count - interior points (excludes the corners themselves)
 * @param {number} jitter - max perpendicular jitter, in percentage points
 * @param {'x'|'y'} perpendicularAxis - which coordinate the jitter applies to
 */
function edgeInteriorPoints(random, from, to, count, jitter, perpendicularAxis) {
  const points = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const jig = (random() - 0.5) * 2 * jitter;
    points.push(
      perpendicularAxis === 'y'
        ? [clamp01to100(x), clamp01to100(y + jig)]
        : [clamp01to100(x + jig), clamp01to100(y)],
    );
  }
  return points;
}

function toClipPath(points) {
  return `polygon(${points.map((p) => `${p[0].toFixed(1)}% ${p[1].toFixed(1)}%`).join(',')})`;
}

/**
 * Builds a torn-paper outline. Corners are placed once and shared by both
 * of their adjacent edges (never two independently-jittered points for the
 * same corner), which is what keeps the outline from self-intersecting
 * into little spike artifacts. Each event's random draw decides how heavy
 * the tear reads and whether the top edge gets extra rough treatment (as
 * if the scrap were ripped off a pole), so different events land at
 * different points between a light and a slightly heavier tear, without
 * ever reading as jagged or artificial.
 * @param {() => number} random
 */
function tornShape(random) {
  const cornerJitter = 1 + random() * 1.2; // 1 to 2.2
  const edgeJitter = 1 + random() * 1.6; // 1 to 2.6
  const pointsPerEdge = 2 + Math.floor(random() * 2); // 2 to 3 interior points
  const topGetsExtraTear = random() < 0.4;
  const topJitter = topGetsExtraTear ? edgeJitter * 1.4 : edgeJitter;

  const corner = () => (random() - 0.5) * 2 * cornerJitter;
  const topLeft = [clamp01to100(0 + corner()), clamp01to100(0 + corner())];
  const topRight = [clamp01to100(100 + corner()), clamp01to100(0 + corner())];
  const bottomRight = [clamp01to100(100 + corner()), clamp01to100(100 + corner())];
  const bottomLeft = [clamp01to100(0 + corner()), clamp01to100(100 + corner())];

  const points = [
    topLeft,
    ...edgeInteriorPoints(random, topLeft, topRight, pointsPerEdge, topJitter, 'y'),
    topRight,
    ...edgeInteriorPoints(random, topRight, bottomRight, pointsPerEdge, edgeJitter, 'x'),
    bottomRight,
    ...edgeInteriorPoints(random, bottomRight, bottomLeft, pointsPerEdge, edgeJitter, 'y'),
    bottomLeft,
    ...edgeInteriorPoints(random, bottomLeft, topLeft, pointsPerEdge, edgeJitter, 'x'),
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
