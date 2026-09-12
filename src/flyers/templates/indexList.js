// T-08 index-list - pure typography. FLYER-ENGINE-SPEC.md section 7. No
// imagery: the lineup itself is the artwork, for a long bill where every
// name matters. Requires at least four acts (section 8's routing also
// forces this template whenever a lineup is that long, regardless of
// genre).
//
// Simplification from the spec's literal "one continuous flowing block
// with mixed sizes": true multi-size run-on justification needs a custom
// text-flow engine (measuring and wrapping mixed font sizes within one
// paragraph) that doesn't exist yet. Instead, each tier is its own
// wrapped paragraph at its own size, stacked in billing order -- the
// same size differentiation the spec asks for (tier 1 far larger than
// tier 3), just one size per line-group rather than mid-line size
// changes. Revisit if a true mixed-run engine gets built later.

import { wrap } from '../layout.js';
import { wordmark } from '../parts/wordmark.js';
import { escapeXml } from '../xml.js';
import { pick } from '../seed.js';

const SEPARATORS = [' / ', '   '];

export default {
  id: 'index-list',
  name: 'Lineup sheet',
  blurb: 'No imagery: the lineup itself, set big, is the whole artwork.',
  suits: [],
  minLineup: 4,
  maxLineup: 40,
  needs: [],
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}"/>`);

    const separator = pick(random, SEPARATORS);
    const byTier = [1, 2, 3].map((tier) => event.acts.filter((a) => a.tier === tier));
    const baseSize = 30 + random() * 8;
    const sizes = { 1: baseSize * 2.2, 2: baseSize * 1.4, 3: baseSize };

    let y = canvas.top + 80;
    const maxY = canvas.top + canvas.contentHeight * 0.66;

    for (const tier of [1, 2, 3]) {
      const acts = byTier[tier - 1];
      if (!acts.length) continue;
      const text = acts.map((a) => a.name.toUpperCase()).join(separator);
      const size = sizes[tier];
      const lines = wrap(text, canvas.contentWidth, { font: 'archivo', size, letterSpacing: 0 });
      const lineHeight = size * 1.15;
      for (const line of lines) {
        if (y > maxY) break;
        parts.push(`<text x="${canvas.left}" y="${y}" font-family="'Archivo',Arial,sans-serif" font-weight="${tier === 1 ? 800 : 600}" font-size="${size.toFixed(1)}" fill="${palette.tonerBlack}">${escapeXml(line)}</text>`);
        y += lineHeight;
      }
      y += lineHeight * 0.3;
    }

    // Own compact detail block, no shared ticketFooter (section 11: this
    // template incorporates the info into its own structure). The rule
    // separates the event/crew-specific line above it from the site's own
    // material below (owner request): the detail line belongs to this
    // event, "look after each other" and the wordmark are the same on
    // every flyer.
    y += 20;
    const detailLine = [
      event.presenter,
      event.dateLong,
      event.locationTba ? 'Location TBA' : event.venueName,
      [event.doors, event.close].filter(Boolean).join(' - '),
      event.ageRestriction,
    ].filter(Boolean).join('   ');
    parts.push(`<text x="${canvas.left}" y="${y}" font-family="'Archivo',Arial,sans-serif" font-size="20" fill="${palette.tonerBlack}">${escapeXml(detailLine)}</text>`);
    // Same gap on both sides of the rule, matching ticketFooter.js.
    const gap = 32;
    y += gap;
    parts.push(`<rect x="${canvas.left}" y="${y}" width="${canvas.contentWidth}" height="2" fill="${palette.tonerBlack}"/>`);
    y += gap;
    parts.push(`<text x="${canvas.left}" y="${y}" font-family="'Archivo',Arial,sans-serif" font-size="14" fill="${palette.tonerBlack}" opacity="0.6">Look after each other</text>`);
    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.height - 20, color: palette.tonerBlack }));

    return `<g>${parts.join('')}</g>`;
  },
};
