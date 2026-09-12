// T-01 medi - deep field. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 7.
// The Croydon lineage: restraint as a signal. The default and the
// fallback template, so it must be the most tolerant of sparse data.
// Failure mode to avoid: adding anything. One colour, one hairline.

import { grain } from '../parts/grain.js';
import { rules } from '../parts/rules.js';
import { ticketFooter, TICKET_FOOTER_HEIGHT } from '../parts/ticketFooter.js';
import { wordmark } from '../parts/wordmark.js';
import { fitBlock } from '../layout.js';
import { escapeXml } from '../xml.js';
import { range } from '../seed.js';

export default {
  id: 'medi',
  name: 'Deep field',
  blurb: 'Black field, one accent, wide-tracked caps. Restrained.',
  suits: ['dubstep', '140', 'halfstep', 'dub', 'sound system', 'deep'],
  minLineup: 0,
  maxLineup: 6,
  needs: [],
  render(ctx) {
    const { event, canvas, palette } = ctx;
    const centerX = canvas.centerX;
    const font = 'archivo';

    // Seeded variation, section 7: vertical shift, hairline width, grain.
    const shift = range(ctx.random, -30, 30);
    const hairlineWidth = range(ctx.random, 180, 320);
    const grainOpacity = range(ctx.random, 0.03, 0.06);

    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.tonerBlack}"/>`);
    parts.push(grain(ctx, {
      opacity: grainOpacity,
      area: { x: 0, y: 0, width: canvas.width, height: canvas.height },
    }));

    const hairlineY = 460 + shift;
    parts.push(rules(ctx, {
      kind: 'full', x: centerX - hairlineWidth / 2, y: hairlineY, width: hairlineWidth,
      color: palette.accent, weight: 2,
    }));

    if (event.presenter) {
      parts.push(textLine(event.presenter.toUpperCase(), centerX, 300 + shift, {
        font, size: 28, letterSpacing: 0.08, color: palette.paper,
      }));
    }

    const headliner = (event.headliner || event.title || 'TBA').toUpperCase();
    const fit = fitBlock(headliner, { width: canvas.contentWidth, height: 220 }, {
      minSize: 48, maxSize: 120, font, leading: 1.1, letterSpacing: 0.08 * 64,
    });
    let cursorY = 560 + shift;
    for (const line of fit.lines) {
      parts.push(textLine(line, centerX, cursorY, {
        font, size: fit.size, letterSpacing: 0.08, color: palette.paper, weight: 700,
      }));
      cursorY += fit.lineHeight;
    }

    // Bounded by the room actually left before the date line (non-negotiable
    // 4: no element may overlap another), not just a fixed count -- a long
    // bill would otherwise run straight into the date and venue. Also
    // truncated to 3 regardless of space on the scrap surface, section 4.5.
    const lineHeight = 32 * 1.4;
    const dateLineY = 1050;
    const availableHeight = dateLineY - 60 - (cursorY + 40);
    const maxByRoom = Math.max(0, Math.floor(availableHeight / lineHeight));
    const maxSupport = ctx.surface === 'scrap' ? Math.min(3, maxByRoom) : maxByRoom;
    const allSupport = event.acts.slice(1);
    const support = allSupport.slice(0, maxSupport);

    if (support.length) {
      cursorY += 40;
      for (const act of support) {
        parts.push(textLine(act.name, centerX, cursorY, { font, size: 32, color: palette.paper }));
        cursorY += lineHeight;
      }
      if (support.length < allSupport.length) {
        parts.push(textLine(`+ ${allSupport.length - support.length} more`, centerX, cursorY, {
          font, size: 24, color: palette.paper,
        }));
      }
    }

    const dateVenue = [event.dateLong, event.venueName || (event.locationTba ? 'Location TBA' : null)]
      .filter(Boolean).join(' - ');
    if (dateVenue) {
      parts.push(textLine(dateVenue, centerX, 1050, { font, size: 26, color: palette.paper }));
    }

    parts.push(ticketFooter(ctx));
    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.bottom - TICKET_FOOTER_HEIGHT - 16 }));

    return `<g>${parts.join('')}</g>`;
  },
};

function textLine(text, x, y, { font, size, letterSpacing = 0, color, weight = 400 }) {
  const family = font === 'archivo' ? "'Archivo',Arial,sans-serif" : font;
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${family}" font-weight="${weight}" font-size="${size}" letter-spacing="${letterSpacing}em" fill="${color}">${escapeXml(text)}</text>`;
}
