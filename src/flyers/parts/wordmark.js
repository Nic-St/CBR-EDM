// The site wordmark, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6 and 11:
// present on every generated flyer, always, absent from crew flyers. The
// quiet signal that tells the two apart at a glance.

import { config } from '../../config.js';

/**
 * @param {object} ctx
 * @param {{ x: number, y: number, size?: number, color?: string, align?: 'start'|'end' }} options - x/y is the text anchor point
 */
export function wordmark(ctx, { x, y, size = 20, color = ctx.palette.paper, align = 'end' }) {
  return `<text x="${x}" y="${y}" text-anchor="${align}" font-family="'Big Shoulders Display', 'Arial Narrow', sans-serif"
    font-weight="700" font-size="${size}" letter-spacing="0.06em" fill="${color}" opacity="0.85">${config.siteName}</text>`;
}
