// T-04 consignment - shipping label. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 7. The flyer as a freight document: bureaucratic deadpan, and
// the best template for sparse data, since an empty cell (a label plus a
// hairline strike through the value area) is exactly how a real form
// handles a field nobody filled in.
//
// The canvas itself is kraft wrapping paper -- a deliberate departure from
// the shared photocopy-paper/toner-black material palette (section 9),
// owner request: "tap into the vibe of consignment notice parcels being
// that brown paper texture". The label (the bordered form) is a distinct,
// lighter sheet stuck onto it, in the site's normal paper colour, so it
// reads as a printed label affixed to a parcel rather than the whole page
// being brown. The label's height is driven by its actual content instead
// of a fixed figure: a sparse lineup used to leave a large dead void in
// the CONTENTS cell (found on a real postponed event with almost no
// data) -- now the label is only as tall as it needs to be and sits
// centred in the kraft paper margin, which reads as intentional at any
// lineup length instead of broken at a short one.
//
// Deliberate grid deviation (section 4.6 permits this with a comment): the
// bordered form uses the standard 72 margin rather than the "inset 40"
// figure in the spec prose, so there is guaranteed room below it for the
// wordmark, which every generated flyer must carry (section 11).
//
// The spec's standard ticketFooter is not used here: this template's own
// HANDLING and WINDOW cells already carry age, ticket text and doors/close,
// so appending the shared footer would print the same facts twice.

import { rules } from '../parts/rules.js';
import { barcode } from '../parts/barcode.js';
import { wordmark } from '../parts/wordmark.js';
import { grain } from '../parts/grain.js';
import { fitSingleLine } from '../layout.js';
import { escapeXml } from '../xml.js';

const LABEL_FONT = "'JetBrains Mono','Courier New',monospace";
const VALUE_FONT = "'Archivo',Arial,sans-serif";

const KRAFT_PAPER = '#c19a6b';
const KRAFT_PAPER_FADED = '#a8927a';

const CELL_PADDING = 20;
const VALUE_MAX_SIZE = 28;
const VALUE_MIN_SIZE = 16;

// Every row's header sits at the same fixed distance from its own row's
// top border, whether it's a cell() label or the CONTENTS row's label --
// those two were previously two different hand-tuned offsets (34 and 22),
// which is what read as inconsistent header-to-border spacing. Content
// then sits a deliberately generous distance below the header rather than
// close behind it.
const LABEL_TOP_OFFSET = 34;
const LABEL_CONTENT_GAP = 50;

const ROW0_HEIGHT = 130;
const ROW2_HEIGHT = 160;
const ROW3_HEIGHT = 130;
const ROW4_HEIGHT = 150;
const BARCODE_HEIGHT = 60;
const BARCODE_ID_GAP = 40;
const CONTENTS_MIN_HEIGHT = 110;
const CONTENTS_FIRST_LINE_OFFSET = LABEL_TOP_OFFSET + LABEL_CONTENT_GAP;
const CONTENTS_BOTTOM_PADDING = 30;
const WORDMARK_CLEARANCE = 60;

/**
 * The CONTENTS row's height, driven by how many lines it actually needs
 * (label plus one line per act at its tier size, plus a truncation line
 * if the scrap surface dropped any), floored so an empty lineup still
 * gets a normal-looking cell rather than collapsing to nothing.
 * @param {object[]} acts - already truncated for the current surface
 * @param {boolean} truncated - whether acts is shorter than the full lineup
 */
function contentsHeightFor(acts, truncated) {
  if (!acts.length) return CONTENTS_MIN_HEIGHT;
  let height = CONTENTS_FIRST_LINE_OFFSET;
  for (const act of acts) {
    const size = act.tier === 1 ? 40 : act.tier === 2 ? 30 : 24;
    height += size * 1.5;
  }
  if (truncated) height += 34;
  return Math.max(CONTENTS_MIN_HEIGHT, height + CONTENTS_BOTTOM_PADDING);
}

export default {
  id: 'consignment',
  name: 'Consignment note',
  blurb: 'A freight document, drawn as a real form. Best for sparse data.',
  suits: ['warehouse', 'multi-genre', 'techno', 'breaks'],
  minLineup: 0,
  maxLineup: 12,
  needs: [],
  render(ctx) {
    const { event, canvas, palette } = ctx;

    // Row 1 (CONTENTS) truncated to 3 acts on the scrap surface (section
    // 4.5) to keep the inlined-on-the-board size small; computed here,
    // ahead of the row geometry, since its height now depends on it.
    const acts = ctx.surface === 'scrap' ? event.acts.slice(0, 3) : event.acts;
    const truncated = acts.length < event.acts.length;

    const boxWidth = canvas.contentWidth;
    const row1Height = contentsHeightFor(acts, truncated);
    const rowHeights = [ROW0_HEIGHT, row1Height, ROW2_HEIGHT, ROW3_HEIGHT, ROW4_HEIGHT];
    const boxHeight = rowHeights.reduce((sum, h) => sum + h, 0);

    const availableHeight = canvas.bottom - WORDMARK_CLEARANCE - canvas.top;
    const boxY = canvas.top + Math.max(0, (availableHeight - boxHeight) / 2);
    const box = { x: canvas.left, y: boxY, w: boxWidth, h: boxHeight };
    const splitX = box.x + box.w * 0.68;

    const rowTops = [box.y];
    for (let i = 0; i < rowHeights.length; i++) rowTops.push(rowTops[i] + rowHeights[i]);

    const parts = [];
    const kraftPaper = ctx.isPast ? KRAFT_PAPER_FADED : KRAFT_PAPER;
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${kraftPaper}"/>`);
    parts.push(grain(ctx, { opacity: 0.05, area: { x: 0, y: 0, width: canvas.width, height: canvas.height } }));

    // The label: a distinct, lighter sheet stuck onto the kraft paper.
    parts.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${palette.paper}"/>`);
    parts.push(grain(ctx, { opacity: 0.02, area: { x: box.x, y: box.y, width: box.w, height: box.h } }));
    // Outer border, 4px.
    parts.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="none" stroke="${palette.tonerBlack}" stroke-width="4"/>`);
    // Row dividers.
    for (let i = 1; i < rowHeights.length; i++) {
      parts.push(rules(ctx, { kind: 'full', x: box.x, y: rowTops[i], width: box.w, color: palette.tonerBlack, weight: 2 }));
    }
    // Column divider on the two split rows (0 and 2).
    parts.push(`<rect x="${splitX}" y="${rowTops[0]}" width="2" height="${rowHeights[0]}" fill="${palette.tonerBlack}"/>`);
    parts.push(`<rect x="${splitX}" y="${rowTops[2]}" width="2" height="${rowHeights[2]}" fill="${palette.tonerBlack}"/>`);

    // Row 0: CONSIGNOR | DATE
    parts.push(cell(ctx, { x: box.x, y: rowTops[0], w: splitX - box.x, h: rowHeights[0], label: 'CONSIGNOR', value: event.presenter }));
    parts.push(cell(ctx, { x: splitX, y: rowTops[0], w: box.x + box.w - splitX, h: rowHeights[0], label: 'DATE', value: event.dateNumeric }));

    // Row 1: CONTENTS (lineup), acts/truncated computed above. Each name
    // is shrunk to fit on one line rather than wrapping or overflowing
    // into the border -- a long act name used to run straight through the
    // right-hand edge of the label with nothing stopping it.
    const contentsX = box.x + CELL_PADDING;
    const contentsMaxWidth = box.w - CELL_PADDING * 2;
    parts.push(labelText('CONTENTS', contentsX, rowTops[1], palette.tonerBlack));
    if (acts.length) {
      let y = rowTops[1] + CONTENTS_FIRST_LINE_OFFSET;
      for (const act of acts) {
        const nominalSize = act.tier === 1 ? 40 : act.tier === 2 ? 30 : 24;
        const size = fitSingleLine(act.name, contentsMaxWidth, { font: 'archivo', maxSize: nominalSize, minSize: VALUE_MIN_SIZE });
        parts.push(`<text x="${contentsX}" y="${y}" font-family="${VALUE_FONT}" font-size="${size}" fill="${palette.tonerBlack}">${escapeXml(act.name)}</text>`);
        y += nominalSize * 1.5;
      }
      if (truncated) {
        parts.push(`<text x="${contentsX}" y="${y}" font-family="${VALUE_FONT}" font-size="20" fill="${palette.tonerBlack}" opacity="0.6">+ ${event.acts.length - acts.length} more</text>`);
      }
    } else {
      parts.push(strike(contentsX, rowTops[1] + CONTENTS_FIRST_LINE_OFFSET, contentsMaxWidth, palette.tonerBlack));
    }

    // Row 2: DELIVER TO | WINDOW
    const deliverTo = event.locationTba ? `LOCATION TBA${event.locationNote ? `, ${event.locationNote}` : ''}` : event.venueName;
    parts.push(cell(ctx, { x: box.x, y: rowTops[2], w: splitX - box.x, h: rowHeights[2], label: 'DELIVER TO', value: deliverTo }));
    const windowText = [event.doors, event.close].filter(Boolean).join(' - ');
    parts.push(cell(ctx, { x: splitX, y: rowTops[2], w: box.x + box.w - splitX, h: rowHeights[2], label: 'WINDOW', value: windowText || null }));

    // Row 3: HANDLING
    const handling = event.ageRestriction || null;
    parts.push(cell(ctx, { x: box.x, y: rowTops[3], w: box.w, h: rowHeights[3], label: 'HANDLING', value: handling || null }));

    // Row 4: barcode + event ID. No barcode on the scrap surface (section
    // 4.5): it's the single most element-heavy part of this template, and
    // the ID text alone still reads fine at thumbnail size. Left edge and
    // top offset match every other row's (CELL_PADDING, LABEL_TOP_OFFSET)
    // instead of sitting flush with no padding, and the ID text sits a
    // full LABEL_CONTENT_GAP-scale gap below the barcode rather than the
    // cramped 24px it used to.
    const barcodeX = box.x + CELL_PADDING;
    const barcodeY = rowTops[4] + LABEL_TOP_OFFSET;
    if (ctx.surface !== 'scrap') {
      parts.push(barcode(ctx, { value: event.id, x: barcodeX, y: barcodeY, w: (box.w - CELL_PADDING * 2) * 0.7, h: BARCODE_HEIGHT }));
      const idY = barcodeY + BARCODE_HEIGHT + BARCODE_ID_GAP;
      parts.push(`<text x="${barcodeX}" y="${idY}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(event.id)}</text>`);
    } else {
      parts.push(`<text x="${barcodeX}" y="${barcodeY}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(event.id)}</text>`);
    }

    // Section 11 rule 1: the footer band's facts are covered by this
    // template's own cells, but the harm reduction line is not a fact
    // about this event, it is the same on every flyer -- it belongs on
    // the kraft paper below the label's own border, next to the
    // wordmark, not duplicated inside the form.
    parts.push(`<text x="${box.x}" y="${canvas.bottom - 12}" font-family="'Archivo',Arial,sans-serif" font-size="16" fill="${palette.tonerBlack}" opacity="0.6">Look after each other</text>`);
    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.bottom - 12, color: palette.tonerBlack }));

    return `<g>${parts.join('')}</g>`;
  },
};

function labelText(label, x, y, color) {
  return `<text x="${x}" y="${y + LABEL_TOP_OFFSET}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${color}">${escapeXml(label)}</text>`;
}

function strike(x, y, width, color) {
  return `<rect x="${x}" y="${y - 1}" width="${width}" height="2" fill="${color}" opacity="0.4"/>`;
}

function cell(ctx, { x, y, w, h, label, value }) {
  const { palette } = ctx;
  const padding = CELL_PADDING;
  const labelY = y + LABEL_TOP_OFFSET;
  const valueY = labelY + LABEL_CONTENT_GAP;
  const maxWidth = w - padding * 2;
  const parts = [
    `<text x="${x + padding}" y="${labelY}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(label)}</text>`,
  ];
  if (value) {
    // Shrink to fit rather than overflow into the column divider or the
    // border -- these values (a venue name, a long crew name) are never
    // wrapped or measured elsewhere before reaching this template.
    const size = fitSingleLine(value, maxWidth, { font: 'archivo', maxSize: VALUE_MAX_SIZE, minSize: VALUE_MIN_SIZE });
    parts.push(`<text x="${x + padding}" y="${valueY}" font-family="${VALUE_FONT}" font-size="${size}" fill="${palette.tonerBlack}">${escapeXml(value)}</text>`);
  } else {
    parts.push(`<rect x="${x + padding}" y="${valueY - 8}" width="${maxWidth}" height="2" fill="${palette.tonerBlack}" opacity="0.4"/>`);
  }
  return `<g>${parts.join('')}</g>`;
}
