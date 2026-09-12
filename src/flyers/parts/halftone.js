// A dot or line screen over a mathematical field, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 6. Not a photo -- `field(x, y)` returns 0 to 1 for a point, and
// dots are sized by that value. Capped at 4000 elements: if a requested
// lpi would exceed it, drawing simply stops rather than emitting more,
// which keeps the composition within its size budget the same way a
// coarser lpi would.

/**
 * @param {object} ctx
 * @param {{ shape: 'round'|'square'|'line', lpi: number, angle: number, field: (x: number, y: number) => number, area: { x: number, y: number, width: number, height: number }, color: string }} options
 */
export function halftone(ctx, { shape, lpi, angle, field, area, color }) {
  const MAX_ELEMENTS = 4000;
  const cell = Math.max(8, area.width / lpi);
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const span = Math.max(area.width, area.height) * 1.5; // covers the area even once rotated
  const steps = Math.ceil(span / cell);

  const elements = [];
  outer: for (let row = -steps; row < steps; row++) {
    for (let col = -steps; col < steps; col++) {
      const gx = col * cell;
      const gy = row * cell;
      const x = area.x + area.width / 2 + gx * cos - gy * sin;
      const y = area.y + area.height / 2 + gx * sin + gy * cos;
      if (x < area.x || x > area.x + area.width || y < area.y || y > area.y + area.height) continue;

      const v = Math.max(0, Math.min(1, field(x, y)));
      if (v <= 0.03) continue;
      const size = v * cell * 0.48;

      if (shape === 'round') {
        elements.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${color}"/>`);
      } else if (shape === 'square') {
        elements.push(`<rect x="${(x - size).toFixed(1)}" y="${(y - size).toFixed(1)}" width="${(size * 2).toFixed(1)}" height="${(size * 2).toFixed(1)}" fill="${color}"/>`);
      } else {
        elements.push(`<rect x="${(x - size).toFixed(1)}" y="${(y - 1).toFixed(1)}" width="${(size * 2).toFixed(1)}" height="2" fill="${color}"/>`);
      }
      if (elements.length >= MAX_ELEMENTS) break outer;
    }
  }

  return `<g>${elements.join('')}</g>`;
}

/**
 * Three field functions to choose from, section 7 T-06: interfering sine
 * waves, a radial falloff, or smooth noise-like interference. All return
 * 0 to 1 and are pure functions of (x, y) plus the seed-derived params, so
 * the same event always draws the same field.
 * @param {() => number} random
 * @param {{ x: number, y: number, width: number, height: number }} area
 */
export function pickField(random, area) {
  const kind = Math.floor(random() * 3);
  const cx = area.x + area.width * (0.3 + random() * 0.4);
  const cy = area.y + area.height * (0.3 + random() * 0.4);

  if (kind === 0) {
    const fx = 0.02 + random() * 0.03;
    const fy = 0.02 + random() * 0.03;
    return (x, y) => (Math.sin(x * fx) * Math.sin(y * fy) + 1) / 2;
  }

  if (kind === 1) {
    const maxDist = Math.hypot(area.width, area.height) / 2;
    return (x, y) => 1 - Math.min(1, Math.hypot(x - cx, y - cy) / maxDist);
  }

  const fx1 = 0.01 + random() * 0.02;
  const fy1 = 0.015 + random() * 0.02;
  const fx2 = 0.02 + random() * 0.02;
  const fy2 = 0.01 + random() * 0.02;
  return (x, y) => (Math.sin(x * fx1 + y * fy1) + Math.cos(x * fx2 - y * fy2) + 2) / 4;
}
