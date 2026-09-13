// T-03 stencil - industrial. FLYER-ENGINE-SPEC.md section 7. Warehouse
// severity: type as a physical object sprayed on a wall. Failure mode to
// avoid: the stretched headliner must stay readable -- a long name drops
// the stretch and wraps to two lines rather than compressing horizontally.

import { grain } from '../parts/grain.js';
import { ticketFooter } from '../parts/ticketFooter.js';
import { fitBlock } from '../layout.js';
import { escapeXml } from '../xml.js';
import { range } from '../seed.js';

const LONG_NAME_THRESHOLD = 14;

export default {
  id: 'stencil',
  name: 'Stencil',
  blurb: 'Sprayed-stencil warehouse severity. Headline stretched edge to edge.',
  suits: ['hard techno', 'industrial', 'hardgroove', 'ebm', 'gabber', 'hard dance'],
  minLineup: 0,
  maxLineup: 6,
  needs: ['dateLong'],
  render(ctx) {
    const { event, canvas, palette } = ctx;
    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.tonerBlack}"/>`);
    parts.push(grain(ctx, { opacity: range(ctx.random, 0.05, 0.09), area: { x: 0, y: 0, width: canvas.width, height: canvas.height } }));

    const headliner = (event.headliner || event.title || 'TBA').toUpperCase();
    const cropL = range(ctx.random, 0, 60);
    const cropR = range(ctx.random, 0, 60);
    const stretchFactor = range(ctx.random, 1.8, 2.6);
    const longName = headliner.length > LONG_NAME_THRESHOLD;

    const headlineY = 480;
    if (longName) {
      // Two lines instead of compressing horizontally, per the spec's
      // named failure mode.
      const fit = fitBlock(headliner, { width: canvas.width - 80, height: 320 }, {
        minSize: 64, maxSize: 150, font: 'big-shoulders-stencil', leading: 0.95, letterSpacing: 0,
      });
      let y = headlineY - fit.lineHeight / 2;
      for (const line of fit.lines) {
        parts.push(`<text x="${canvas.centerX}" y="${y}" text-anchor="middle" font-family="'Big Shoulders Stencil','Arial Narrow',sans-serif" font-weight="700" font-size="${fit.size}" fill="${palette.paper}">${escapeXml(line)}</text>`);
        y += fit.lineHeight;
      }
    } else {
      parts.push(`
        <text x="${(-cropL).toFixed(1)}" y="${headlineY}" font-family="'Big Shoulders Stencil','Arial Narrow',sans-serif"
          font-weight="700" font-size="200" fill="${palette.paper}"
          textLength="${(canvas.width + cropL + cropR).toFixed(1)}" lengthAdjust="spacingAndGlyphs"
          transform="scale(1, ${stretchFactor.toFixed(2)})" transform-origin="${canvas.centerX} ${headlineY}">${escapeXml(headliner)}</text>
      `);
    }

    const blockY = range(ctx.random, 760, 900);
    parts.push(`<rect x="0" y="${blockY.toFixed(1)}" width="${canvas.width}" height="90" fill="${palette.accent}"/>`);
    if (event.dateLong) {
      parts.push(`<text x="${canvas.centerX}" y="${(blockY + 58).toFixed(1)}" text-anchor="middle" font-family="'Archivo',Arial,sans-serif" font-weight="700" font-size="36" fill="${palette.tonerBlack}">${escapeXml(event.dateLong.toUpperCase())}</text>`);
    }

    const support = event.acts.slice(1, ctx.surface === 'scrap' ? 3 : undefined);
    let y = blockY + 150;
    for (const act of support) {
      parts.push(`<text x="${canvas.left}" y="${y}" font-family="'Archivo',Arial,sans-serif" font-size="24" letter-spacing="0.03em" fill="${palette.paper}">${escapeXml(act.name.toUpperCase())}</text>`);
      y += 34;
    }

    // ticketFooter now draws the wordmark itself, centred with "Look
    // after each other" as one bottom-middle pair (owner request).
    parts.push(ticketFooter(ctx));

    return `<g>${parts.join('')}</g>`;
  },
};
