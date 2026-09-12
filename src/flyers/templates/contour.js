// T-10 contour - Canberra topography. FLYER-ENGINE-SPEC.md section 7. A
// procedurally generated contour map, not traced from real elevation
// data -- an evocation of a map, not a map. Failure mode to avoid: no
// real coordinates, elevations, or place data beyond the venue name the
// event itself supplied (a real coordinate for a location-TBA event
// would be an actual problem, not just a design one).

import { ticketFooter, TICKET_FOOTER_HEIGHT } from '../parts/ticketFooter.js';
import { wordmark } from '../parts/wordmark.js';
import { measure } from '../metrics.js';
import { escapeXml } from '../xml.js';
import { range, pick } from '../seed.js';

const MARKERS = {
  triangle: (x, y, s) => `M ${x} ${y - s} L ${x + s} ${y + s} L ${x - s} ${y + s} Z`,
  cross: (x, y, s) => `M ${x - s} ${y} L ${x + s} ${y} M ${x} ${y - s} L ${x} ${y + s}`,
  circle: null, // drawn as <circle>, not a path
};

export default {
  id: 'contour',
  name: 'Contour map',
  blurb: 'Procedural topographic lines. The one local template.',
  suits: ['outdoor', 'doof', 'bush', 'picnic'],
  minLineup: 0,
  maxLineup: 6,
  needs: [],
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    // The venue marker still avoids the headliner's own text block (see
    // ly2 below) so the two never collide, but the contour lines
    // themselves now run the full canvas -- owner request, they used to
    // be clipped out of the upper third and it read as a cut-off map
    // rather than a whole one.
    const clearZoneBottom = canvas.top + canvas.contentHeight / 3;
    // The marker's radius is seeded and can land anywhere on its ring, so
    // without this it could land in (or right on top of) the footer band
    // -- owner feedback, spotted the venue label sitting on the rule.
    const footerSafeBottom = canvas.bottom - TICKET_FOOTER_HEIGHT - 30;

    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.tonerBlack}"/>`);

    const contourCount = 8 + Math.floor(random() * 5);
    const highlighted = Math.floor(random() * contourCount);
    const harmonics = [1 + Math.floor(random() * 3), 2 + Math.floor(random() * 3)];
    const amp = range(random, 40, 90);
    const phaseX = random() * Math.PI * 2;
    const phaseY = random() * Math.PI * 2;
    const cx = canvas.centerX + range(random, -100, 100);
    const cy = canvas.centerY + range(random, -100, 100);

    let contourLines = '';
    for (let c = 0; c < contourCount; c++) {
      const baseRadius = 120 + c * 90;
      const isHighlight = c === highlighted;
      let d = '';
      const samples = 72;
      for (let i = 0; i <= samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const wobble = amp * (Math.sin(t * harmonics[0] + phaseX) + Math.sin(t * harmonics[1] + phaseY)) / 2;
        const r = baseRadius + wobble;
        const x = cx + r * Math.cos(t);
        const y = cy + r * Math.sin(t);
        d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      const color = isHighlight ? palette.accent : palette.paper;
      const width = isHighlight ? 2.5 : 1;
      const opacity = isHighlight ? 1 : 0.35;
      contourLines += `<path d="${d}Z" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
    }
    parts.push(`<g>${contourLines}</g>`);

    // Venue label on the highlighted contour, like a labelled spot height.
    // The ring it sits on can be one of the outer ones (radius up to
    // 120 + 11*90), well past the canvas on any angle, so the marker's
    // position is clamped into a safe rectangle rather than trusted to
    // land in frame -- it no longer sits exactly on the ring when
    // clamped, but an off-canvas or clipped label is worse than that.
    const venueText = event.locationTba ? 'LOCATION TBA' : event.venueName;
    if (venueText) {
      const upperVenue = venueText.toUpperCase();
      const textWidth = measure(upperVenue, { font: 'archivo', size: 18, letterSpacing: 1.8 });
      const markerToTextGap = 18;
      const edgeMargin = 24;

      const labelAngle = range(random, 0, Math.PI * 2);
      const labelRadius = 120 + highlighted * 90;
      const rawX = cx + labelRadius * Math.cos(labelAngle);
      const rawY = cy + labelRadius * Math.sin(labelAngle);
      const lx = Math.min(
        Math.max(rawX, canvas.left + edgeMargin),
        canvas.right - edgeMargin - markerToTextGap - textWidth,
      );
      const ly2 = Math.min(Math.max(clearZoneBottom + 20, rawY), footerSafeBottom);

      const markerSize = 8;
      const markerShape = pick(random, ['triangle', 'cross', 'circle']);
      if (markerShape === 'circle') {
        parts.push(`<circle cx="${lx.toFixed(1)}" cy="${ly2.toFixed(1)}" r="${markerSize}" fill="${palette.accent}"/>`);
      } else {
        parts.push(`<path d="${MARKERS[markerShape](lx, ly2, markerSize)}" stroke="${palette.accent}" stroke-width="2" fill="${markerShape === 'triangle' ? palette.accent : 'none'}"/>`);
      }
      parts.push(`<text x="${(lx + markerToTextGap).toFixed(1)}" y="${(ly2 + 5).toFixed(1)}" font-family="'Archivo',Arial,sans-serif" font-size="18" letter-spacing="0.1em" fill="${palette.paper}">${escapeXml(upperVenue)}</text>`);
    }

    if (event.headliner) {
      parts.push(`<text x="${canvas.centerX}" y="${(canvas.top + 140).toFixed(1)}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-weight="800" font-size="56" fill="${palette.paper}">${escapeXml(event.headliner.toUpperCase())}</text>`);
    }

    const dateText = event.dateLong;
    if (dateText) {
      parts.push(`<text x="${canvas.centerX}" y="${(canvas.bottom - 220).toFixed(1)}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-size="24" fill="${palette.paper}">${escapeXml(dateText)}</text>`);
    }

    parts.push(ticketFooter(ctx));
    // Same baseline as ticketFooter's "Look after each other" (owner
    // feedback: it used to float disconnected further down in the margin).
    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.bottom - 22 }));

    return `<g>${parts.join('')}</g>`;
  },
};
