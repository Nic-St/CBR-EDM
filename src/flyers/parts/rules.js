// Hairline dividers, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6.

/**
 * @param {object} ctx
 * @param {{ kind: 'full'|'partial'|'leader'|'crop', x?: number, y?: number, width?: number, color?: string, weight?: number, leaderGap?: number }} options
 */
export function rules(ctx, options) {
  const { kind, color = ctx.palette.paper, weight = 2 } = options;

  if (kind === 'full' || kind === 'partial') {
    const { x, y, width } = options;
    return `<rect x="${x}" y="${y - weight / 2}" width="${width}" height="${weight}" fill="${color}"/>`;
  }

  if (kind === 'leader') {
    const { x, y, width, leaderGap = 10 } = options;
    const dots = [];
    for (let dx = 0; dx < width; dx += leaderGap) {
      dots.push(`<circle cx="${(x + dx).toFixed(1)}" cy="${y}" r="${weight / 2}" fill="${color}"/>`);
    }
    return `<g>${dots.join('')}</g>`;
  }

  if (kind === 'crop') {
    const { length = 16 } = options;
    const { left, top, right, bottom } = ctx.canvas;
    const corners = [
      [left, top, 0, 1],
      [right, top, -1, 1],
      [left, bottom, 0, -1],
      [right, bottom, -1, -1],
    ];
    const marks = corners.map(([cx, cy, dx, dy]) => `
      <rect x="${(cx + (dx < 0 ? -length : 0)).toFixed(1)}" y="${(cy - weight / 2).toFixed(1)}" width="${length}" height="${weight}" fill="${color}"/>
      <rect x="${(cx - weight / 2).toFixed(1)}" y="${(cy + (dy < 0 ? -length : 0)).toFixed(1)}" width="${weight}" height="${length}" fill="${color}"/>
    `);
    return `<g>${marks.join('')}</g>`;
  }

  throw new Error(`Unknown rule kind "${kind}"`);
}
