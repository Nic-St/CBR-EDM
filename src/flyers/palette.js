// Material palette for generated flyers, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 9. Inherits the site's material colours; adds a one-per-flyer
// accent set. No gradients, ever -- tonal variation comes from halftone or
// dither, not from blending these colours.

import { pick } from './seed.js';

export const MATERIAL = {
  tonerBlack: '#0a0a0a',
  photocopyPaper: '#d6d5cf',
  fadedPaper: '#bdbbb3',
  stampInk: '#9c1f1f',
};

export const ACCENTS = [
  { name: 'risoPink', hex: '#ff48b0' },
  { name: 'risoBlue', hex: '#0078bf' },
  { name: 'risoYellow', hex: '#ffe800' },
  { name: 'sodium', hex: '#c77a2a' },
  { name: 'copierCyan', hex: '#00a3ad' },
  { name: 'warningOrange', hex: '#e8590c' },
];

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${[v, v, v].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(h) * 255);
  const b = Math.round(hue2rgb(h - 1 / 3) * 255);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Drops saturation by `amount` (0 to 1), keeping hue and lightness. */
function desaturate(hex, amount) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s * (1 - amount), l);
}

/**
 * The full colour set for one flyer: field/paper colours plus one seeded
 * accent, already adjusted for a past event if applicable (faded paper,
 * accent saturation dropped 40%, section 9).
 * @param {() => number} random
 * @param {boolean} isPast
 * @param {{ excludeYellowOnPaper?: boolean }} [options] - pass true for a
 *   template that paints the accent directly onto the paper colour (e.g.
 *   halftoneField's dots): section 9 bans riso yellow there, it only
 *   clears contrast as a field colour with dark type on it.
 */
export function paletteFor(random, isPast, options = {}) {
  const pool = options.excludeYellowOnPaper ? ACCENTS.filter((a) => a.name !== 'risoYellow') : ACCENTS;
  const accent = pick(random, pool);
  return {
    tonerBlack: MATERIAL.tonerBlack,
    paper: isPast ? MATERIAL.fadedPaper : MATERIAL.photocopyPaper,
    stampInk: MATERIAL.stampInk,
    accent: isPast ? desaturate(accent.hex, 0.4) : accent.hex,
    accentName: accent.name,
  };
}
