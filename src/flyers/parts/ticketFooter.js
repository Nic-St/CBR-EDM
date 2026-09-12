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
      fill="${palette.paper}">${escapeXml(range)}</text>`;
  }

  // Right-aligned, directly above the wordmark (also canvas.right,
  // text-anchor end) -- owner request.
  let ageLabel = '';
  if (event.ageRestriction === '18+') {
    ageLabel = `<text x="${canvas.right}" y="${labelY}" text-anchor="end" font-family="'Archivo', Arial, sans-serif" font-size="22"
      fill="${palette.paper}">18+</text>`;
  }

  return `
    ${doorsLabel}
    ${ageLabel}
    ${rules(ctx, { kind: 'full', x: canvas.left, y: ruleY, width: canvas.contentWidth, color: palette.paper })}
    <text x="${canvas.left}" y="${linkY}" font-family="'Archivo', Arial, sans-serif" font-size="16"
      fill="${palette.paper}" opacity="0.7">Look after each other</text>
  `;
}

export const TICKET_FOOTER_HEIGHT = HEIGHT;
