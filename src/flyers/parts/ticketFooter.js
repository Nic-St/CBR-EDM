// The shared bottom band, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6:
// age restriction, doors and close, ticket text, harm reduction mark.
// Used by contour, the only template left in the codebase (the other
// nine that used to share this were removed, see manifest.js). Height
// 126, flush to the bottom margin. Only ever shows fields that actually
// exist (section 5's honesty rule): this is not the place to print
// placeholder text.

import { rules } from './rules.js';
import { measure } from '../metrics.js';
import { escapeXml } from '../xml.js';
import { config } from '../../config.js';

const HEIGHT = 126;
const HARM_TEXT_SIZE = 16;

/**
 * @param {object} ctx
 * @param {{ date?: string }} [options] - date: an optional date string
 * centred on the same line as doors/close and 18+ (owner request).
 */
export function ticketFooter(ctx, { date } = {}) {
  const { event, canvas, palette } = ctx;
  const textColor = palette.paper;
  const top = canvas.bottom - HEIGHT;

  // Owner request: the rule separates event/crew-specific facts (above)
  // from the site's own material (below) -- doors, close and age belong
  // to this event, but "look after each other" is the same on every
  // flyer. It now sits right at the bottom of the page (canvas.height -
  // 20, in the true margin) rather than tucked just under the rule, so
  // it reads as a footer of the physical page, not another line of the
  // form -- decoupled from the rule/labelY gap math below, which still
  // governs the event-facts band only.
  const linkY = canvas.height - 20;
  const gap = 36;
  const ruleY = top + HEIGHT - 22 - gap;
  const labelY = ruleY - gap;

  let doorsLabel = '';
  if (event.doors || event.close) {
    const range = [event.doors, event.close].filter(Boolean).join(' - ');
    doorsLabel = `<text x="${canvas.left}" y="${labelY}" font-family="'Archivo', Arial, sans-serif" font-size="22"
      fill="${textColor}">${escapeXml(range)}</text>`;
  }

  // Right-aligned, mirroring doors/close on the left -- owner request.
  let ageLabel = '';
  if (event.ageRestriction === '18+') {
    ageLabel = `<text x="${canvas.right}" y="${labelY}" text-anchor="end" font-family="'Archivo', Arial, sans-serif" font-size="22"
      fill="${textColor}">18+</text>`;
  }

  let dateLabel = '';
  if (date) {
    dateLabel = `<text x="${canvas.centerX}" y="${labelY}" text-anchor="middle" font-family="'Archivo', Arial, sans-serif" font-size="22"
      fill="${textColor}">${escapeXml(date)}</text>`;
  }

  // Bottom middle -- owner request: "look after each other" is the
  // site's own material, not the crew's, and centring it (rather than
  // left/right like the crew's own facts above the rule) is what makes
  // that separation actually read, instead of just being true in the code.
  const harmText = config.harmReductionTitle;
  const harmWidth = measure(harmText, { font: 'archivo', size: HARM_TEXT_SIZE });
  const harmLeft = canvas.centerX - harmWidth / 2;

  return `
    ${doorsLabel}
    ${ageLabel}
    ${dateLabel}
    ${rules(ctx, { kind: 'full', x: canvas.left, y: ruleY, width: canvas.contentWidth, color: textColor })}
    <text x="${harmLeft}" y="${linkY}" font-family="'Archivo', Arial, sans-serif" font-size="${HARM_TEXT_SIZE}"
      fill="${textColor}" opacity="0.7">${escapeXml(harmText)}</text>
  `;
}

export const TICKET_FOOTER_HEIGHT = HEIGHT;
