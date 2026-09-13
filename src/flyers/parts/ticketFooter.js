// The shared bottom band, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6:
// age restriction, doors and close, ticket text, harm reduction mark.
// Used by most templates so it stays consistent. Height 126, flush to the
// bottom margin. Only ever shows fields that actually exist (section 5's
// honesty rule): this is not the place to print placeholder text.

import { rules } from './rules.js';
import { wordmark } from './wordmark.js';
import { measure } from '../metrics.js';
import { escapeXml } from '../xml.js';
import { config } from '../../config.js';

const HEIGHT = 126;
const HARM_TEXT_SIZE = 16;
const WORDMARK_SIZE = 20;
const HARM_WORDMARK_GAP = 24;

/**
 * @param {object} ctx
 * @param {{ color?: string }} [options] - text colour, for the two
 * templates in the seven that use this whose canvas is the light paper
 * colour instead of toner black (ransom, schematic) -- without this,
 * every line in the footer band defaults to palette.paper text on a
 * palette.paper background and is invisible. Defaults to palette.paper,
 * correct for the other five, which are dark.
 */
export function ticketFooter(ctx, { color } = {}) {
  const { event, canvas, palette } = ctx;
  const textColor = color || palette.paper;
  const top = canvas.bottom - HEIGHT;

  // Owner request: the rule separates event/crew-specific facts (above)
  // from the site's own material (below) -- doors, close and age belong
  // to this event, but "look after each other" and the wordmark are the
  // same on every flyer, so they read as the site talking, not the crew.
  // The gap is the same on both sides of the rule (36px): it used to be
  // 24px above and 54px below, which read as inconsistent.
  const linkY = top + HEIGHT - 22;
  const gap = 36;
  const ruleY = linkY - gap;
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

  // Bottom middle, as one centred pair -- owner request: "look after
  // each other" and the wordmark are the site's own material, not the
  // crew's, and centring them (rather than left/right like the crew's
  // own facts above the rule) is what makes that separation actually
  // read, instead of just being true in the code.
  const harmText = config.harmReductionTitle;
  const harmWidth = measure(harmText, { font: 'archivo', size: HARM_TEXT_SIZE });
  const wordmarkWidth = measure(config.siteName, { font: 'big-shoulders-display', size: WORDMARK_SIZE, letterSpacing: WORDMARK_SIZE * 0.06 });
  const groupLeft = canvas.centerX - (harmWidth + HARM_WORDMARK_GAP + wordmarkWidth) / 2;

  return `
    ${doorsLabel}
    ${ageLabel}
    ${rules(ctx, { kind: 'full', x: canvas.left, y: ruleY, width: canvas.contentWidth, color: textColor })}
    <text x="${groupLeft}" y="${linkY}" font-family="'Archivo', Arial, sans-serif" font-size="${HARM_TEXT_SIZE}"
      fill="${textColor}" opacity="0.7">${escapeXml(harmText)}</text>
    ${wordmark(ctx, { x: groupLeft + harmWidth + HARM_WORDMARK_GAP, y: linkY, size: WORDMARK_SIZE, align: 'start', color: textColor })}
  `;
}

export const TICKET_FOOTER_HEIGHT = HEIGHT;
