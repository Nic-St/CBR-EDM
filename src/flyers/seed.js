// Deterministic seed and PRNG for the flyer engine. Non-negotiable 1 in
// PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 3: same event ID, same event
// data, same engine version must always produce a byte-identical SVG. No
// Math.random(), no Date.now(), anywhere in the render path.

/**
 * FNV-1a, 32-bit. Not cryptographic, just needs to spread similar strings
 * apart so nearby event IDs don't produce visually similar flyers.
 * @param {string} str
 */
export function fnv1a32(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * A tiny seeded PRNG (mulberry32). Same seed always produces the same
 * sequence of floats in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} eventId
 * @param {number} [seedSalt] - bumped by the admin "Reroll" button, section 4.3
 */
export function seedFor(eventId, seedSalt = 0) {
  return fnv1a32(`${eventId}:${seedSalt}`);
}

/**
 * A ready-to-use PRNG for one event. Every stochastic decision in a
 * template must draw from this, in a fixed order, so adding a new draw
 * partway through shifts every downstream draw (a visual change, so bump
 * FLYER_ENGINE_VERSION when it happens -- see index.js).
 * @param {string} eventId
 * @param {number} [seedSalt]
 * @returns {() => number}
 */
export function rngFor(eventId, seedSalt = 0) {
  return mulberry32(seedFor(eventId, seedSalt));
}

/**
 * Picks one of `items` using the PRNG, optionally weighted.
 * @param {() => number} random
 * @param {Array<T>} items
 * @returns {T}
 * @template T
 */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/**
 * A random number in [min, max), drawn from the seeded PRNG.
 * @param {() => number} random
 * @param {number} min
 * @param {number} max
 */
export function range(random, min, max) {
  return min + random() * (max - min);
}
