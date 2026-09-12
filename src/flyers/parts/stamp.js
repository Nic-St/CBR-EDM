// The status stamp, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6 and 11:
// always topmost, always last, never covers the date. Only the five
// statuses the main spec defines.

const STAMP_TEXT = {
  cancelled: 'CANCELLED',
  sold_out: 'SOLD OUT',
  postponed: 'POSTPONED',
  location_dropped: 'LOCATION DROPPED',
};

/**
 * @param {object} ctx
 * @param {{ text: string, x: number, y: number }} options - x/y is the stamp's centre
 */
export function stamp(ctx, { text, x, y }) {
  const id = `stamp-${ctx.event.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const rotation = -14 + ctx.random() * 8; // -14 to -6 degrees
  const seed = Math.round(ctx.random() * 1000);
  const size = 44;

  return `
    <filter id="${id}-f" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <g transform="rotate(${rotation.toFixed(1)} ${x} ${y})" filter="url(#${id}-f)">
      <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
        font-family="'Big Shoulders Stencil', 'Arial Narrow', sans-serif" font-weight="700"
        font-size="${size}" letter-spacing="0.04em" fill="${ctx.palette.stampInk}"
        stroke="${ctx.palette.stampInk}" stroke-width="1.5">${text}</text>
    </g>
  `;
}

/** The stamp text for an event's status, or null if it should not stamp. */
export function stampTextFor(status) {
  return STAMP_TEXT[status] || null;
}
