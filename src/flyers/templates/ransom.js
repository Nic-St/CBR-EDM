// T-07 ransom - cut and paste. FLYER-ENGINE-SPEC.md section 7. A
// photocopied zine collage: genuine DIY, not a filter over a clean layout.
// The one template allowed more than two type styles, since the format
// demands it. Failure mode to avoid: text must stay inside its own piece,
// fully readable -- each piece's polygon is computed first, then text is
// sized to fit inside it, not the other way around.

import { tape } from '../parts/tape.js';
import { grain } from '../parts/grain.js';
import { ticketFooter } from '../parts/ticketFooter.js';
import { fitBlock } from '../layout.js';
import { escapeXml } from '../xml.js';
import { range } from '../seed.js';

// Four fixed type combinations, section 7 T-07: this is the one template
// where mixing faces per piece is intentional, not sloppy.
const TYPE_COMBOS = [
  { font: 'archivo', weight: 400 },
  { font: 'archivo', weight: 800 },
  { font: 'big-shoulders-display', weight: 700 },
  { font: 'big-shoulders-stencil', weight: 700 },
];

const FONT_FAMILY = {
  archivo: "'Archivo',Arial,sans-serif",
  'big-shoulders-display': "'Big Shoulders Display','Arial Narrow',sans-serif",
  'big-shoulders-stencil': "'Big Shoulders Stencil','Arial Narrow',sans-serif",
};

export default {
  id: 'ransom',
  name: 'Cut-and-paste',
  blurb: 'A photocopied zine collage: torn pieces, tape, mixed type.',
  suits: ['jungle', 'hardcore', 'gabber', 'rave'],
  minLineup: 0,
  maxLineup: 8,
  needs: ['venueName'],
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}"/>`);
    parts.push(grain(ctx, { opacity: range(random, 0.04, 0.08), area: { x: 0, y: 0, width: canvas.width, height: canvas.height } }));
    // Copier edge darkening on two sides.
    parts.push(`<rect x="0" y="0" width="60" height="${canvas.height}" fill="${palette.tonerBlack}" opacity="0.15"/>`);
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="40" fill="${palette.tonerBlack}" opacity="0.12"/>`);

    const pieces = [
      { text: (event.headliner || event.title || 'TBA').toUpperCase(), size: 'large' },
      event.presenter && { text: event.presenter, size: 'medium' },
      event.dateLong && { text: event.dateLong, size: 'small' },
      (event.venueName || event.locationTba) && { text: event.locationTba ? 'LOCATION TBA' : event.venueName, size: 'small' },
      event.acts.length > 1 && { text: event.acts.slice(1, 4).map((a) => a.name).join(', '), size: 'small' },
      event.ageRestriction && { text: event.ageRestriction, size: 'small' },
    ].filter(Boolean).slice(0, 7);

    const layout = layoutPieces(random, pieces.length, canvas);
    const taped = new Set();
    const taperCount = Math.min(pieces.length - 1, 2 + Math.floor(random() * 2));
    while (taped.size < taperCount) taped.add(Math.floor(random() * pieces.length));

    pieces.forEach((piece, i) => {
      const box = layout[i];
      const rotation = range(random, -3, 3);
      const combo = TYPE_COMBOS[Math.min(i, TYPE_COMBOS.length - 1)];
      const clip = piecePolygon(random, box);

      parts.push(`
        <g transform="rotate(${rotation.toFixed(1)} ${(box.x + box.w / 2).toFixed(1)} ${(box.y + box.h / 2).toFixed(1)})">
          <polygon points="${clip}" fill="${palette.paper}" stroke="${palette.tonerBlack}" stroke-width="1.5"/>
          ${fitText(piece.text, box, combo, palette)}
        </g>
      `);
      if (taped.has(i)) {
        parts.push(tape(ctx, { x: box.x + box.w / 2, y: box.y, w: 50, angle: range(random, -20, 20) }));
      }
    });

    // ticketFooter centres "Look after each other" at the bottom middle
    // (owner request). This canvas is the light paper colour, so it
    // needs the dark ink.
    parts.push(ticketFooter(ctx, { color: palette.tonerBlack }));

    return `<g>${parts.join('')}</g>`;
  },
};

function layoutPieces(random, count, canvas) {
  const cols = count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const cellW = canvas.contentWidth / cols;
  const cellH = (canvas.contentHeight - 200) / rows;
  const boxes = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const w = cellW * 0.9;
    const h = i === 0 ? cellH * 1.3 : cellH * 0.75;
    boxes.push({
      x: canvas.left + col * cellW + range(random, -10, 10),
      y: canvas.top + row * cellH + range(random, -10, 10),
      w, h,
    });
  }
  return boxes;
}

function piecePolygon(random, box) {
  const j = () => range(random, -8, 8);
  const points = [
    [box.x + j(), box.y + j()],
    [box.x + box.w + j(), box.y + j()],
    [box.x + box.w + j(), box.y + box.h + j()],
    [box.x + j(), box.y + box.h + j()],
  ];
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

function fitText(text, box, combo, palette) {
  const inset = 16;
  const fit = fitBlock(text, { width: box.w - inset * 2, height: box.h - inset * 2 }, {
    minSize: 16, maxSize: 64, font: combo.font, leading: 1.15,
  });
  const family = FONT_FAMILY[combo.font];
  const startY = box.y + box.h / 2 - (fit.lines.length - 1) * fit.lineHeight / 2 + fit.size * 0.35;
  return fit.lines.map((line, i) => `
    <text x="${(box.x + box.w / 2).toFixed(1)}" y="${(startY + i * fit.lineHeight).toFixed(1)}" text-anchor="middle"
      font-family="${family}" font-weight="${combo.weight}" font-size="${fit.size}" fill="${palette.tonerBlack}">${escapeXml(line)}</text>
  `).join('');
}
