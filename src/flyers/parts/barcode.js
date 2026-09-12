// Code 39 barcode, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 6: "It must
// scan. Do not draw random bars, because someone will try it and a fake
// barcode is a small lie in a project built on honesty."
//
// Standard Code 39 character set: 0-9, A-Z, space, and "-.$/+%". Each
// character is 5 bars and 4 spaces (9 elements), narrow or wide, always
// starting and ending with a bar. N = narrow, W = wide.

const CODE39_PATTERNS = {
  0: 'NNNWWNWNN', 1: 'WNNWNNNNW', 2: 'NNWWNNNNW', 3: 'WNWWNNNNN', 4: 'NNNWWNNNW',
  5: 'WNNWWNNNN', 6: 'NNWWWNNNN', 7: 'NNNWNNWNW', 8: 'WNNWNNWNN', 9: 'NNWWNNWNN',
  A: 'WNNNNWNNW', B: 'NNWNNWNNW', C: 'WNWNNWNNN', D: 'NNNNWWNNW', E: 'WNNNWWNNN',
  F: 'NNWNWWNNN', G: 'NNNNNWWNW', H: 'WNNNNWWNN', I: 'NNWNNWWNN', J: 'NNNNWWWNN',
  K: 'WNNNNNNWW', L: 'NNWNNNNWW', M: 'WNWNNNNWN', N: 'NNNNWNNWW', O: 'WNNNWNNWN',
  P: 'NNWNWNNWN', Q: 'NNNNNNWWW', R: 'WNNNNNWWN', S: 'NNWNNNWWN', T: 'NNNNWNWWN',
  U: 'WWNNNNNNW', V: 'NWWNNNNNW', W: 'WWWNNNNNN', X: 'NWNNWNNNW', Y: 'WWNNWNNNN',
  Z: 'NWWNWNNNN', '-': 'NWNNNNWNW', '.': 'WWNNNNWNN', ' ': 'NWWNNNWNN',
  $: 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN', '*': 'NWNNWNWNN',
};

const ENCODABLE = /^[0-9A-Z\-. $/+%]+$/;

/**
 * @param {object} ctx
 * @param {{ value: string, x: number, y: number, w: number, h: number, color?: string }} options
 */
export function barcode(ctx, { value, x, y, w, h, color = ctx.palette.tonerBlack }) {
  const clean = value.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '');
  if (!ENCODABLE.test(clean)) throw new Error(`Value not encodable in Code 39: "${value}"`);

  const message = `*${clean}*`;
  const NARROW = 1;
  const WIDE = 2.5;

  const charWidths = [...message].map((ch) => {
    const pattern = CODE39_PATTERNS[ch];
    return [...pattern].map((el) => (el === 'W' ? WIDE : NARROW));
  });

  const totalUnits = charWidths.reduce((sum, widths) => sum + widths.reduce((a, b) => a + b, 0), 0)
    + (message.length - 1) * NARROW; // one narrow inter-character gap between characters

  const unitWidth = w / totalUnits;
  const bars = [];
  let cursor = x;

  charWidths.forEach((widths, charIndex) => {
    widths.forEach((units, elementIndex) => {
      const elementWidth = units * unitWidth;
      const isBar = elementIndex % 2 === 0; // elements alternate bar, space, bar, ...
      if (isBar) {
        bars.push(`<rect x="${cursor.toFixed(2)}" y="${y}" width="${elementWidth.toFixed(2)}" height="${h}" fill="${color}"/>`);
      }
      cursor += elementWidth;
    });
    if (charIndex < charWidths.length - 1) cursor += NARROW * unitWidth;
  });

  return `<g>${bars.join('')}</g>`;
}
