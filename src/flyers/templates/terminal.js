// T-05 terminal - monospace readout. FLYER-ENGINE-SPEC.md section 7. A
// terminal session, cold and precise. Failure mode to avoid: must not
// read as a joke about programmers -- vocabulary stays about the event,
// no fake stack traces, errors or IP addresses. Absent fields are simply
// not printed, never "null" or "-".

import { grain } from '../parts/grain.js';
import { wordmark } from '../parts/wordmark.js';
import { escapeXml } from '../xml.js';
import { pick } from '../seed.js';

const COMMANDS = ['events --show', 'wall --lookup', 'listing --fetch', 'board --query'];
const STATUS_TEMPLATES = [
  (n) => `${n} act${n === 1 ? '' : 's'} listed. 0 filters applied.`,
  (n) => `${n} entr${n === 1 ? 'y' : 'ies'} in lineup. Query complete.`,
  (n) => `${n} act${n === 1 ? '' : 's'} found. Nothing filtered out.`,
];

export default {
  id: 'terminal',
  name: 'Terminal',
  blurb: 'A cold, precise command-line readout of the event record.',
  suits: ['electro', 'idm', 'experimental', 'breakcore', 'drum and bass', 'dnb', 'jungle'],
  minLineup: 0,
  maxLineup: 8,
  needs: [],
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.tonerBlack}"/>`);
    parts.push(grain(ctx, { opacity: 0.03, area: { x: 0, y: 0, width: canvas.width, height: canvas.height } }));

    const scanlineId = `scanlines-${event.id.replace(/[^a-zA-Z0-9]/g, '')}`;
    const pitch = Math.round(4 + random() * 3);
    parts.push(`
      <pattern id="${scanlineId}" width="1" height="${pitch}" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill="${palette.paper}" opacity="0.04"/>
      </pattern>
      <rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="url(#${scanlineId})"/>
    `);

    const font = "'JetBrains Mono','Courier New',monospace";
    const size = 22;
    const lineHeight = size * 1.6;
    let y = canvas.top + 60;
    const shortId = event.id.slice(0, 12);

    const line = (text, color = palette.paper) => {
      parts.push(`<text x="${canvas.left}" y="${y}" font-family="${font}" font-size="${size}" fill="${color}">${escapeXml(text)}</text>`);
      y += lineHeight;
    };

    line(`$ ${pick(random, COMMANDS)} ${shortId}`);
    line('loading...');
    y += lineHeight * 0.5;

    const field = (label, value, color) => {
      if (!value) return;
      line(`  ${label.padEnd(12, ' ')}: ${value}`, color);
    };

    field('presenter', event.presenter);
    if (event.headliner) field('headline', event.headliner, palette.accent);
    const support = event.acts.slice(1);
    if (support.length) {
      field('support', support[0].name);
      for (const act of support.slice(1)) line(`              : ${act.name}`);
    }
    field('date', event.dateNumeric);
    field('doors', event.doors);
    field('close', event.close);
    const venue = event.locationTba ? 'LOCATION TBA' : event.venueName;
    field('venue', venue);
    field('age', event.ageRestriction);

    y += lineHeight * 0.5;
    line(STATUS_TEMPLATES[Math.floor(random() * STATUS_TEMPLATES.length)](event.acts.length));
    line('_');

    // Section 11 rule 1: terminal has no shared ticketFooter, but still
    // carries the same harm reduction line every template does -- below a
    // rule, same as everywhere else, so the event's own readout stays
    // above it and the site's own material stays below. Same gap on both
    // sides of the rule, matching ticketFooter.js.
    const gap = 32;
    y += gap;
    parts.push(`<rect x="${canvas.left}" y="${y}" width="${canvas.contentWidth}" height="2" fill="${palette.paper}" opacity="0.3"/>`);
    y += gap;
    parts.push(`<text x="${canvas.left}" y="${y}" font-family="${font}" font-size="16" fill="${palette.paper}" opacity="0.6">Look after each other</text>`);

    // Same baseline as "Look after each other" above -- both the site's
    // own material, so they read as one row (owner feedback: it used to
    // float disconnected further down in the margin).
    parts.push(wordmark(ctx, { x: canvas.right, y }));

    return `<g>${parts.join('')}</g>`;
  },
};
