// T-06 halftoneField - generative duotone. FLYER-ENGINE-SPEC.md section 7.
// The only template that's primarily an image, but the image is
// mathematics, not a photo. Failure modes to avoid: element count (halftone.js
// caps this itself) and contrast -- the knockout band must be solid, not a
// screen, or the type inside it fails contrast at the dot edges.

import { halftone, pickField } from '../parts/halftone.js';
import { ticketFooter } from '../parts/ticketFooter.js';
import { wordmark } from '../parts/wordmark.js';
import { escapeXml } from '../xml.js';
import { pick, range } from '../seed.js';

export default {
  id: 'halftoneField',
  name: 'Halftone',
  blurb: 'A printed dot-screen field, generated from a wave, not a photo.',
  suits: ['house', 'disco', 'breaks', 'garage', 'ukg', '2-step', 'melodic'],
  minLineup: 0,
  maxLineup: 6,
  needs: ['dateLong'],
  // The accent draws directly onto the paper colour (the halftone dots),
  // so riso yellow -- which section 9 only allows as a field colour with
  // dark type on it, never as a mark on paper -- must be excluded here.
  paperField: true,
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}"/>`);

    const field = pickField(random, { x: 0, y: 0, width: canvas.width, height: canvas.height });
    // Section 4.5: the scrap surface gets a simplified halftone (a coarser
    // screen, so far fewer dots) rather than shrinking the full-detail one.
    const [lpiMin, lpiMax] = ctx.surface === 'scrap' ? [8, 12] : [15, 25];
    parts.push(halftone(ctx, {
      shape: pick(random, ['round', 'square', 'line']),
      lpi: range(random, lpiMin, lpiMax),
      angle: pick(random, [15, 45, 75]),
      field,
      area: { x: 0, y: 0, width: canvas.width, height: canvas.height },
      color: palette.accent,
    }));

    const bandHeight = range(random, 260, 340);
    const bandY = canvas.height - bandHeight - 100;
    parts.push(`<rect x="0" y="${bandY.toFixed(1)}" width="${canvas.width}" height="${bandHeight.toFixed(1)}" fill="${palette.tonerBlack}"/>`);

    const headliner = (event.headliner || event.title || 'TBA').toUpperCase();
    let y = bandY + 70;
    parts.push(`<text x="${canvas.centerX}" y="${y}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-weight="800" font-size="56" fill="${palette.paper}">${escapeXml(headliner)}</text>`);
    y += 50;

    const support = event.acts.slice(1, ctx.surface === 'scrap' ? 3 : undefined);
    if (support.length) {
      parts.push(`<text x="${canvas.centerX}" y="${y}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-size="24" fill="${palette.paper}">${escapeXml(support.map((a) => a.name).join(', '))}</text>`);
      y += 44;
    }

    const dateVenue = [event.dateLong, event.venueName || (event.locationTba ? 'Location TBA' : null)].filter(Boolean).join(' - ');
    if (dateVenue) {
      parts.push(`<text x="${canvas.centerX}" y="${y}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-size="22" fill="${palette.paper}">${escapeXml(dateVenue)}</text>`);
    }

    parts.push(ticketFooter(ctx));
    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.height - 20 }));

    return `<g>${parts.join('')}</g>`;
  },
};
