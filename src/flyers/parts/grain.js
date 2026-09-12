// Toner/photocopy grain, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6.
// Rendered as a tiling pattern rather than a full-canvas filter, since a
// full-canvas filter is expensive to rasterise. Never placed over text.

/**
 * @param {object} ctx
 * @param {{ opacity: number, scale?: number, area: { x: number, y: number, width: number, height: number } }} options
 */
export function grain(ctx, { opacity, scale = 1, area }) {
  const id = `grain-${ctx.event.id.replace(/[^a-zA-Z0-9]/g, '')}-${Math.round(area.x)}-${Math.round(area.y)}`;
  const tile = 64;
  const baseFrequency = (0.8 + (ctx.random() * 0.6)) / scale; // 0.8 to 1.4, per spec
  const seed = ctx.random() * 1000 | 0;

  return `
    <filter id="${id}-f" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="${baseFrequency.toFixed(3)}" numOctaves="2" seed="${seed}" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0"/>
    </filter>
    <pattern id="${id}-p" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">
      <rect width="${tile}" height="${tile}" filter="url(#${id}-f)"/>
    </pattern>
    <rect x="${area.x}" y="${area.y}" width="${area.width}" height="${area.height}" fill="url(#${id}-p)" opacity="${opacity}"/>
  `;
}
