// T-09 cymatic - standing wave. FLYER-ENGINE-SPEC.md section 7. Sound
// made visible: a Lissajous-figure pattern of thin accent lines, with a
// deliberately quiet type block underneath. Failure modes to avoid:
// element count (merged into a handful of multi-subpath <path>s, not
// hundreds of elements) and the pattern must not extend behind the type
// block -- it's confined to its own square, above the text.

import { ticketFooter } from '../parts/ticketFooter.js';
import { wordmark } from '../parts/wordmark.js';
import { escapeXml } from '../xml.js';
import { range } from '../seed.js';

export default {
  id: 'cymatic',
  name: 'Standing wave',
  blurb: 'A Lissajous figure of fine lines. Sound made visible.',
  suits: ['dub techno', 'deep', 'ambient', 'drone', 'minimal', 'experimental'],
  minLineup: 0,
  maxLineup: 6,
  needs: [],
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.tonerBlack}"/>`);

    const squareSize = 760;
    const cx = canvas.centerX;
    const cy = canvas.top + squareSize / 2 + 20;
    const curveCount = 3 + Math.floor(random() * 3);
    const baseFreqA = 2 + Math.floor(random() * 3);
    const baseFreqB = 3 + Math.floor(random() * 3);

    let d = '';
    const samples = 240;
    for (let c = 0; c < curveCount; c++) {
      const freqA = baseFreqA + c * 0.05;
      const freqB = baseFreqB;
      const phase = (Math.PI / 2) * (c / curveCount);
      const radius = (squareSize / 2) * (0.98 - c * 0.03);
      for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const x = cx + radius * Math.sin(freqA * t + phase);
        const y = cy + radius * Math.sin(freqB * t);
        d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
    }
    parts.push(`<path d="${d}" fill="none" stroke="${palette.accent}" stroke-width="1"/>`);

    const typeTop = cy + squareSize / 2 + 60;
    let y = typeTop;
    const centerText = (text, size, weight = 400) => {
      parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-weight="${weight}" font-size="${size}" letter-spacing="0.06em" fill="${palette.paper}">${escapeXml(text)}</text>`);
      y += size * 1.6;
    };

    if (event.headliner) centerText(event.headliner.toUpperCase(), 42, 700);
    const support = event.acts.slice(1, ctx.surface === 'scrap' ? 3 : undefined);
    if (support.length) centerText(support.map((a) => a.name).join(', '), 22);
    const dateVenue = [event.dateLong, event.venueName || (event.locationTba ? 'Location TBA' : null)].filter(Boolean).join(' - ');
    if (dateVenue) centerText(dateVenue, 22);

    parts.push(ticketFooter(ctx));
    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.height - 20 }));

    return `<g>${parts.join('')}</g>`;
  },
};
