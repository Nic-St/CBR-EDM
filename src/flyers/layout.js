// Text wrapping, size fitting, and grid geometry for the flyer engine,
// PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 4.4 and 4.6.

import { measure } from './metrics.js';

/**
 * Greedy word wrap. Never breaks inside a word unless a single word alone
 * exceeds maxWidth, in which case the caller should reduce size rather
 * than this function hyphenating anything.
 * @param {string} text
 * @param {number} maxWidth
 * @param {{ font: string, size: number, letterSpacing?: number }} typeOptions
 * @returns {string[]} lines
 */
export function wrap(text, maxWidth, typeOptions) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (measure(candidate, typeOptions) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

/**
 * Binary search on font size until `text` wraps to fit `box` in both axes.
 * Fewer than 6 iterations, per spec.
 * @param {string} text
 * @param {{ width: number, height: number }} box
 * @param {{ minSize: number, maxSize: number, font: string, leading: number, letterSpacing?: number }} options
 * @returns {{ size: number, lines: string[], lineHeight: number }}
 */
export function fitBlock(text, box, options) {
  const { minSize, maxSize, font, leading, letterSpacing = 0 } = options;

  function tryFit(size) {
    const typeOptions = { font, size, letterSpacing };
    const lines = wrap(text, box.width, typeOptions);
    const lineHeight = size * leading;
    const blockHeight = lines.length * lineHeight;
    const widestLine = Math.max(...lines.map((line) => measure(line, typeOptions)), 0);
    return { lines, lineHeight, blockHeight, widestLine };
  }

  let lo = minSize;
  let hi = maxSize;
  let best = { size: minSize, ...tryFit(minSize) };

  for (let i = 0; i < 6 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2;
    const attempt = tryFit(mid);
    const fits = attempt.blockHeight <= box.height && attempt.widestLine <= box.width;
    if (fits) {
      best = { size: mid, ...attempt };
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return { size: best.size, lines: best.lines, lineHeight: best.lineHeight };
}

/**
 * The shared grid, section 4.6: 1080x1350, margin 72, 12 columns of 62
 * with 18 gutters, baseline grid of 18.
 * @param {number} [width]
 * @param {number} [height]
 */
export function gridFor(width = 1080, height = 1350) {
  const margin = 72;
  const columns = 12;
  const gutter = 18;
  const columnWidth = 62;
  const baseline = 18;
  const contentWidth = width - margin * 2;
  const contentHeight = height - margin * 2;

  return {
    width, height, margin, columns, gutter, columnWidth, baseline,
    contentWidth, contentHeight,
    left: margin,
    right: width - margin,
    top: margin,
    bottom: height - margin,
    centerX: width / 2,
    centerY: height / 2,
  };
}

/** Snaps a value to the nearest multiple of the baseline grid (18px). */
export function toBaseline(value, baseline = 18) {
  return Math.round(value / baseline) * baseline;
}
