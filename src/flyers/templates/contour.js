// T-10 contour - Canberra topography. FLYER-ENGINE-SPEC.md section 7. A
// procedurally generated contour map by default -- an evocation of a
// map, not a map. When the event has a real, disclosed venue that's
// been geocoded (src/lib/geocode.js, an explicit admin/crew action, never
// run for a location_tba event), the lines are traced from that venue's
// actual elevation data instead (owner request). Failure mode to avoid:
// no real coordinates, elevations, or place data for a location-TBA
// event -- that would be an actual problem, not just a design one; see
// normalise.js's elevationGridFor, which enforces this regardless of
// what's in the database.

import { ticketFooter, TICKET_FOOTER_HEIGHT } from '../parts/ticketFooter.js';
import { wordmark } from '../parts/wordmark.js';
import { measure } from '../metrics.js';
import { escapeXml } from '../xml.js';
import { range, pick } from '../seed.js';

const MARKERS = {
  triangle: (x, y, s) => `M ${x.toFixed(1)} ${(y - s).toFixed(1)} L ${(x + s).toFixed(1)} ${(y + s).toFixed(1)} L ${(x - s).toFixed(1)} ${(y + s).toFixed(1)} Z`,
  cross: (x, y, s) => `M ${(x - s).toFixed(1)} ${y.toFixed(1)} L ${(x + s).toFixed(1)} ${y.toFixed(1)} M ${x.toFixed(1)} ${(y - s).toFixed(1)} L ${x.toFixed(1)} ${(y + s).toFixed(1)}`,
  circle: null, // drawn as <circle>, not a path
};

// Real elevation data is smooth at this grid's resolution (30m samples,
// 150m apart), so a contour level realistically crosses on the order of
// the grid's own size in cells, not anywhere near all of them -- this
// cap is a safety net against a pathological dataset, not the expected
// count, matching halftone.js's MAX_ELEMENTS approach.
const MAX_TERRAIN_SEGMENTS = 2400;
const MAP_OVERSCAN = 120;
// The geocoded grid is only 9x9 (real API points cost a request each);
// upsampling it before tracing is what makes the lines smooth curves
// instead of a blocky low-poly outline of the same real data, and lets
// more contour levels read as distinct lines rather than a solid mass.
const UPSAMPLE_FACTOR = 4;

/**
 * Bilinear upsample of a scalar grid to (size - 1) * factor + 1 per
 * side, same physical span and exact same centre point. Doesn't invent
 * data the samples don't support -- it's the standard way a coarse DEM
 * is rendered as smooth contours, not an approximation of the real
 * values, just a finer mesh through them.
 * @param {{ size: number, values: number[] }} grid
 * @param {number} factor
 */
function upsampleGrid(grid, factor) {
  const { size, values } = grid;
  const newSize = (size - 1) * factor + 1;
  const at = (r, c) => values[r * size + c];
  const newValues = new Array(newSize * newSize);

  for (let nr = 0; nr < newSize; nr++) {
    const fr = nr / factor;
    const r0 = Math.min(size - 2, Math.floor(fr));
    const tr = fr - r0;
    for (let nc = 0; nc < newSize; nc++) {
      const fc = nc / factor;
      const c0 = Math.min(size - 2, Math.floor(fc));
      const tc = fc - c0;
      const top = at(r0, c0) + (at(r0, c0 + 1) - at(r0, c0)) * tc;
      const bottom = at(r0 + 1, c0) + (at(r0 + 1, c0 + 1) - at(r0 + 1, c0)) * tc;
      newValues[nr * newSize + nc] = top + (bottom - top) * tr;
    }
  }
  return { size: newSize, values: newValues };
}

/**
 * One iso-elevation level's line segments through a scalar grid
 * (marching squares, the standard case table). Segments are left
 * unstitched -- adjacent cells' segments share exact interpolated
 * endpoints, so they still read as continuous lines once drawn together,
 * without needing a path-tracing pass.
 * @param {{ size: number, values: number[] }} grid
 * @param {number} threshold
 * @param {(cell: { r: number, c: number }) => { x: number, y: number }} toScreen
 * @param {number} budget - remaining segment budget across all levels
 */
function marchingSquaresSegments(grid, threshold, toScreen, budget) {
  const { size, values } = grid;
  const at = (r, c) => values[r * size + c];
  const lerp = (a, b) => (b === a ? 0.5 : (threshold - a) / (b - a));
  const segments = [];

  outer: for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const tl = at(r, c);
      const tr = at(r, c + 1);
      const bl = at(r + 1, c);
      const br = at(r + 1, c + 1);
      const caseIndex = (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0)
        | (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0);
      if (caseIndex === 0 || caseIndex === 15) continue;

      const top = toScreen({ r, c: c + lerp(tl, tr) });
      const bottom = toScreen({ r: r + 1, c: c + lerp(bl, br) });
      const left = toScreen({ r: r + lerp(tl, bl), c });
      const right = toScreen({ r: r + lerp(tr, br), c: c + 1 });

      const cases = {
        1: [[left, bottom]], 14: [[left, bottom]],
        2: [[bottom, right]], 13: [[bottom, right]],
        3: [[left, right]], 12: [[left, right]],
        4: [[top, right]], 11: [[top, right]],
        6: [[top, bottom]], 9: [[top, bottom]],
        7: [[left, top]], 8: [[left, top]],
        5: [[left, top], [bottom, right]],
        10: [[top, right], [left, bottom]],
      };
      for (const [a, b] of cases[caseIndex] || []) {
        segments.push([a, b]);
        if (segments.length >= budget) break outer;
      }
    }
  }
  return segments;
}

function segmentsToPath(segments) {
  return segments.map(([a, b]) => `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`).join(' ');
}

/**
 * Renders the real-elevation-derived version. Returns the same shape
 * the synthetic path uses: contourLines markup plus a marker screen
 * position (the grid's centre cell, which is exactly the geocoded venue).
 */
function renderRealTerrain(ctx, rawGrid) {
  const { canvas, palette, random } = ctx;
  const grid = upsampleGrid(rawGrid, UPSAMPLE_FACTOR);
  const { size, values } = grid;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // North-up: assumes row 0 is the grid's north edge (geocode.js's
  // fetchElevationGrid builds it that way), so increasing row moves
  // south and correctly moves down the canvas.
  const toScreen = ({ r, c }) => ({
    x: -MAP_OVERSCAN + (c / (size - 1)) * (canvas.width + 2 * MAP_OVERSCAN),
    y: -MAP_OVERSCAN + (r / (size - 1)) * (canvas.height + 2 * MAP_OVERSCAN),
  });

  const levelCount = 14 + Math.floor(random() * 7);

  // The highlighted contour is the one closest to the venue's own real
  // elevation (its exact grid centre value), not a random pick -- owner
  // request. Thresholds run min + 1*(max-min)/(levelCount+1) up to
  // min + levelCount*(max-min)/(levelCount+1), so inverting that for
  // venueElevation gives the closest index directly.
  const half = (size - 1) / 2;
  const venueElevation = values[half * size + half];
  const highlighted = max === min
    ? 0
    : Math.min(levelCount - 1, Math.max(0, Math.round(((venueElevation - min) / (max - min)) * (levelCount + 1)) - 1));

  let contourLines = '';
  let budget = MAX_TERRAIN_SEGMENTS;
  for (let i = 0; i < levelCount; i++) {
    const threshold = min + ((i + 1) * (max - min)) / (levelCount + 1);
    const segments = marchingSquaresSegments(grid, threshold, toScreen, budget);
    budget -= segments.length;
    const isHighlight = i === highlighted;
    const color = isHighlight ? palette.accent : palette.paper;
    const width = isHighlight ? 2.5 : 1;
    const opacity = isHighlight ? 1 : 0.35;
    contourLines += `<path d="${segmentsToPath(segments)}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
    if (budget <= 0) break;
  }

  const marker = toScreen({ r: half, c: half });

  // Which way the label should sit, so it reads outside the highlighted
  // line rather than crossing it where possible (owner feedback): moving
  // along the elevation gradient (not perpendicular to it) moves away
  // from the current contour band in either direction, since perpendicular
  // movement is what stays ON an isoline. Compares screen-space distance,
  // not raw grid deltas, since a row and a column don't cover the same
  // number of pixels here.
  const east = toScreen({ r: half, c: half + 1 });
  const south = toScreen({ r: half + 1, c: half });
  const dValueDx = (values[half * size + (half + 1)] - venueElevation) / (east.x - marker.x);
  const dValueDy = (values[(half + 1) * size + half] - venueElevation) / (south.y - marker.y);
  const labelDir = Math.abs(dValueDx) >= Math.abs(dValueDy)
    ? (dValueDx >= 0 ? 'right' : 'left')
    : (dValueDy >= 0 ? 'down' : 'up');

  return { contourLines, markerX: marker.x, markerY: marker.y, labelDir };
}

/** The original fully-synthetic version: seeded wobble rings around a seeded centre. */
function renderSyntheticTerrain(ctx) {
  const { canvas, palette, random } = ctx;
  const contourCount = 8 + Math.floor(random() * 5);
  const highlighted = Math.floor(random() * contourCount);
  const harmonics = [1 + Math.floor(random() * 3), 2 + Math.floor(random() * 3)];
  const amp = range(random, 40, 90);
  const phaseX = random() * Math.PI * 2;
  const phaseY = random() * Math.PI * 2;
  const cx = canvas.centerX + range(random, -100, 100);
  const cy = canvas.centerY + range(random, -100, 100);

  let contourLines = '';
  let markerX = cx;
  let markerY = cy;
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
    if (isHighlight) {
      const labelAngle = range(random, 0, Math.PI * 2);
      markerX = cx + baseRadius * Math.cos(labelAngle);
      markerY = cy + baseRadius * Math.sin(labelAngle);
    }
  }
  // No local gradient concept in the synthetic version -- keeps the
  // original placement, to the right of the marker.
  return { contourLines, markerX, markerY, labelDir: 'right' };
}

export default {
  id: 'contour',
  name: 'Contour map',
  blurb: 'Procedural topographic lines, real terrain when a venue is geocoded.',
  suits: ['outdoor', 'doof', 'bush', 'picnic'],
  minLineup: 0,
  maxLineup: 6,
  needs: [],
  render(ctx) {
    const { event, canvas, palette, random } = ctx;
    const clearZoneBottom = canvas.top + canvas.contentHeight / 3;
    // The marker's screen position (seeded ring position for the
    // synthetic map, the exact grid centre for a real one) is never
    // trusted to land in a safe spot on its own -- clamped clear of the
    // headliner zone, the footer band, and both side edges.
    const footerSafeBottom = canvas.bottom - TICKET_FOOTER_HEIGHT - 30;

    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.tonerBlack}"/>`);

    const { contourLines, markerX, markerY, labelDir } = event.elevationGrid
      ? renderRealTerrain(ctx, event.elevationGrid)
      : renderSyntheticTerrain(ctx);
    parts.push(`<g>${contourLines}</g>`);

    // Venue label, like a labelled spot height.
    const venueText = event.locationTba ? 'LOCATION TBA' : event.venueName;
    if (venueText) {
      const upperVenue = venueText.toUpperCase();
      // Halfway between the headliner's 56 and the label's old 18,
      // owner request: the venue name should read as more obvious.
      const venueSize = 37;
      const textWidth = measure(upperVenue, { font: 'archivo', size: venueSize, letterSpacing: venueSize * 0.1 });
      const markerToTextGap = 18;
      const edgeMargin = 24;

      // Which side of the marker the text sits on depends on labelDir
      // (owner feedback: keep it off the highlighted line where
      // possible) -- each direction needs its own text-anchor and its
      // own edge/zone clamp, since "past the edge" means something
      // different depending on which way the text runs.
      let lx;
      let ly2;
      let textAnchor = 'start';
      let textX;
      let textY;

      if (labelDir === 'left') {
        textAnchor = 'end';
        lx = Math.min(
          Math.max(markerX, canvas.left + edgeMargin + markerToTextGap + textWidth),
          canvas.right - edgeMargin,
        );
        ly2 = Math.min(Math.max(clearZoneBottom + 20, markerY), footerSafeBottom);
        textX = lx - markerToTextGap;
        textY = ly2 + venueSize * 0.35;
      } else if (labelDir === 'up' || labelDir === 'down') {
        textAnchor = 'middle';
        lx = Math.min(Math.max(markerX, canvas.left + edgeMargin + textWidth / 2), canvas.right - edgeMargin - textWidth / 2);
        if (labelDir === 'up') {
          ly2 = Math.min(Math.max(clearZoneBottom + 20 + markerToTextGap + venueSize, markerY), footerSafeBottom);
          textY = ly2 - markerToTextGap;
        } else {
          ly2 = Math.min(Math.max(clearZoneBottom + 20, markerY), footerSafeBottom - markerToTextGap - venueSize);
          textY = ly2 + markerToTextGap + venueSize * 0.8;
        }
        textX = lx;
      } else {
        lx = Math.min(
          Math.max(markerX, canvas.left + edgeMargin),
          canvas.right - edgeMargin - markerToTextGap - textWidth,
        );
        // The clamp keeps the marker clear of the footer band, but the
        // text sits venueSize * 0.35 below it, so the clamp needs the
        // same margin subtracted or a big enough font could still push
        // the label into the footer even though the marker looked clear.
        ly2 = Math.min(Math.max(clearZoneBottom + 20, markerY), footerSafeBottom - venueSize * 0.35);
        textX = lx + markerToTextGap;
        textY = ly2 + venueSize * 0.35;
      }

      const markerSize = 8;
      const markerShape = pick(random, ['triangle', 'cross', 'circle']);
      if (markerShape === 'circle') {
        parts.push(`<circle cx="${lx.toFixed(1)}" cy="${ly2.toFixed(1)}" r="${markerSize}" fill="${palette.accent}"/>`);
      } else {
        parts.push(`<path d="${MARKERS[markerShape](lx, ly2, markerSize)}" stroke="${palette.accent}" stroke-width="2" fill="${markerShape === 'triangle' ? palette.accent : 'none'}"/>`);
      }
      parts.push(`<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="${textAnchor}" font-family="'Archivo',Arial,sans-serif" font-size="${venueSize}" letter-spacing="0.1em" fill="${palette.paper}">${escapeXml(upperVenue)}</text>`);
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
