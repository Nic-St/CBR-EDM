// T-02 schematic - sound system spec sheet. FLYER-ENGINE-SPEC.md section 7.
// The flyer as technical documentation for the rig, drawn in the language
// of an amp rack diagram. Failure mode to avoid: no invented technical
// values -- every label is real event data, never a fake wattage or
// frequency.

import { grain } from '../parts/grain.js';
import { rules } from '../parts/rules.js';
import { ticketFooter } from '../parts/ticketFooter.js';
import { escapeXml } from '../xml.js';
import { range } from '../seed.js';

export default {
  id: 'schematic',
  name: 'Rig diagram',
  blurb: 'The lineup as a signal-chain diagram. No invented specs.',
  suits: ['sound system', 'dub', 'bass', 'techno', 'dub techno', 'hard techno'],
  minLineup: 1,
  maxLineup: 6,
  needs: [],
  render(ctx) {
    const { event, canvas, palette } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}"/>`);
    parts.push(grain(ctx, { opacity: 0.015, area: { x: 0, y: 0, width: canvas.width, height: canvas.height } }));

    const diagramTop = canvas.top;
    const diagramBottom = canvas.top + canvas.contentHeight * 0.6;
    const acts = event.acts.length ? event.acts : [{ name: event.headliner || event.title || 'TBA', tier: 1 }];
    const boxes = layoutBoxes(ctx.random, acts, canvas, diagramTop, diagramBottom);

    for (let i = 0; i < boxes.length - 1; i++) {
      parts.push(connector(boxes[i], boxes[i + 1], palette.tonerBlack));
    }
    for (const box of boxes) {
      parts.push(drawBox(box, palette));
    }

    const tableTop = diagramBottom + 60;
    const rows = [
      ['DATE', event.dateNumeric],
      ['DOORS', event.doors],
      ['VENUE', event.locationTba ? 'LOCATION TBA' : event.venueName],
      ['AGE', event.ageRestriction],
    ].filter(([, value]) => value);

    let y = tableTop;
    for (const [label, value] of rows) {
      parts.push(`<text x="${canvas.left}" y="${y}" font-family="'Archivo',Arial,sans-serif" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(label)}</text>`);
      const labelWidth = 90;
      parts.push(rules(ctx, {
        kind: 'leader', x: canvas.left + labelWidth, y: y - 6,
        width: canvas.contentWidth * 0.5 - labelWidth, color: palette.tonerBlack, weight: 2, leaderGap: 8,
      }));
      parts.push(`<text x="${canvas.left + canvas.contentWidth * 0.5 + 10}" y="${y}" font-family="'JetBrains Mono','Courier New',monospace" font-size="18" fill="${palette.tonerBlack}">${escapeXml(value)}</text>`);
      y += 44;
    }

    // ticketFooter now draws the wordmark itself, centred with "Look
    // after each other" as one bottom-middle pair (owner request). This
    // canvas is the light paper colour, so both need the dark ink.
    parts.push(ticketFooter(ctx, { color: palette.tonerBlack }));

    return `<g>${parts.join('')}</g>`;
  },
};

function layoutBoxes(random, acts, canvas, top, bottom) {
  const n = acts.length;
  const laneY = (i) => {
    if (n <= 2) return top + (bottom - top) * 0.5;
    // A gentle split-then-recombine: alternate rows for the middle acts.
    const pattern = [0.35, 0.65, 0.5];
    return top + (bottom - top) * pattern[i % pattern.length];
  };
  const gap = canvas.contentWidth / n;
  return acts.map((act, i) => {
    const w = act.tier === 1 ? 170 : 120;
    const h = act.tier === 1 ? 90 : 64;
    const jitter = range(random, -6, 6);
    return {
      x: canvas.left + gap * i + gap / 2 - w / 2,
      y: laneY(i) - h / 2 + jitter,
      w, h, act,
    };
  });
}

function connector(a, b, color) {
  const ax = a.x + a.w;
  const ay = a.y + a.h / 2;
  const bx = b.x;
  const by = b.y + b.h / 2;
  const midX = (ax + bx) / 2;
  return `<path d="M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${midX.toFixed(1)} ${ay.toFixed(1)} L ${midX.toFixed(1)} ${by.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2"/>`;
}

function drawBox({ x, y, w, h, act }, palette) {
  const strokeWidth = act.tier === 1 ? 3 : 2;
  const doubleStroke = act.tier === 1
    ? `<rect x="${(x + 5).toFixed(1)}" y="${(y + 5).toFixed(1)}" width="${(w - 10).toFixed(1)}" height="${(h - 10).toFixed(1)}" fill="none" stroke="${palette.tonerBlack}" stroke-width="1.5"/>`
    : '';
  const fontSize = act.tier === 1 ? 20 : 15;
  return `
    <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${palette.paper}" stroke="${palette.tonerBlack}" stroke-width="${strokeWidth}"/>
    ${doubleStroke}
    <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + fontSize * 0.35).toFixed(1)}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(act.name.toUpperCase())}</text>
  `;
}
