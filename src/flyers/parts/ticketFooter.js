// The shared bottom band, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6:
// age restriction, doors and close, ticket text, harm reduction mark.
// Used by most templates so it stays consistent. Height 126, flush to the
// bottom margin. Only ever shows fields that actually exist (section 5's
// honesty rule): this is not the place to print placeholder text.

import { rules } from './rules.js';
import { escapeXml } from '../xml.js';

const HEIGHT = 126;

/**
 * @param {object} ctx
 */
export function ticketFooter(ctx) {
  const { event, canvas, palette } = ctx;
  const top = canvas.bottom - HEIGHT;
  const items = [];

  if (event.doors || event.close) {
    const range = [event.doors, event.close].filter(Boolean).join(' - ');
    items.push(range);
  }
  if (event.ageRestriction === '18+') items.push('18+');
  if (event.ticketText) items.push(event.ticketText);

  const labelY = top + 40;
  const linkY = top + HEIGHT - 22;

  const labels = items.map((text, i) => {
    const x = canvas.left + i * (canvas.contentWidth / Math.max(items.length, 1));
    return `<text x="${x}" y="${labelY}" font-family="'Archivo', Arial, sans-serif" font-size="22"
      fill="${palette.paper}">${escapeXml(text)}</text>`;
  }).join('');

  return `
    ${rules(ctx, { kind: 'full', x: canvas.left, y: top, width: canvas.contentWidth, color: palette.paper })}
    ${labels}
    <text x="${canvas.left}" y="${linkY}" font-family="'Archivo', Arial, sans-serif" font-size="16"
      fill="${palette.paper}" opacity="0.7">Look after each other</text>
  `;
}

export const TICKET_FOOTER_HEIGHT = HEIGHT;
