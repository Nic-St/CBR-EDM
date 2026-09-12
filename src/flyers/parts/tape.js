// A strip of tape holding a torn piece down, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 6. Flat colour, no shadow, no gloss -- just a slightly ragged
// parallelogram, seeded per placement.

/**
 * @param {object} ctx
 * @param {{ x: number, y: number, w: number, angle: number }} options - x/y is the tape's centre
 */
export function tape(ctx, { x, y, w, angle }) {
  const h = 18;
  const jitter = () => (ctx.random() - 0.5) * 3;
  const hw = w / 2;
  const hh = h / 2;
  const points = [
    [-hw + jitter(), -hh + jitter()],
    [hw + jitter(), -hh + jitter()],
    [hw + jitter(), hh + jitter()],
    [-hw + jitter(), hh + jitter()],
  ].map(([px, py]) => `${(x + px).toFixed(1)},${(y + py).toFixed(1)}`).join(' ');

  return `<polygon points="${points}" fill="rgba(217, 216, 210, 0.55)" transform="rotate(${angle.toFixed(1)} ${x} ${y})"/>`;
}
