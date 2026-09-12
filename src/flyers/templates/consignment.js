// T-04 consignment - shipping label. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 7. The flyer as a freight document: bureaucratic deadpan, and
// the best template for sparse data, since an empty cell (a label plus a
// hairline strike through the value area) is exactly how a real form
// handles a field nobody filled in.
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
import { escapeXml } from '../xml.js';

const LABEL_FONT = "'JetBrains Mono','Courier New',monospace";
const VALUE_FONT = "'Archivo',Arial,sans-serif";

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
    const box = { x: canvas.left, y: canvas.top, w: canvas.contentWidth, h: canvas.contentHeight - 60 };
    const splitX = box.x + box.w * 0.68;

    const rowHeights = [130, box.h - 130 - 160 - 130 - 140, 160, 130, 140];
    const rowTops = [box.y];
    for (let i = 0; i < rowHeights.length; i++) rowTops.push(rowTops[i] + rowHeights[i]);

    const parts = [];
    parts.push(`<rect x="0" y="0" width="${canvas.width}" height="${canvas.height}" fill="${palette.paper}"/>`);
    parts.push(grain(ctx, { opacity: 0.02, area: { x: 0, y: 0, width: canvas.width, height: canvas.height } }));

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

    // Row 1: CONTENTS (lineup). Truncated to 3 acts on the scrap surface,
    // section 4.5, to keep the inlined-on-the-board size small.
    const acts = ctx.surface === 'scrap' ? event.acts.slice(0, 3) : event.acts;
    parts.push(labelText('CONTENTS', box.x, rowTops[1], palette.tonerBlack));
    if (acts.length) {
      let y = rowTops[1] + 60;
      for (const act of acts) {
        const size = act.tier === 1 ? 40 : act.tier === 2 ? 30 : 24;
        parts.push(`<text x="${box.x}" y="${y}" font-family="${VALUE_FONT}" font-size="${size}" fill="${palette.tonerBlack}">${escapeXml(act.name)}</text>`);
        y += size * 1.5;
      }
      if (acts.length < event.acts.length) {
        parts.push(`<text x="${box.x}" y="${y}" font-family="${VALUE_FONT}" font-size="20" fill="${palette.tonerBlack}" opacity="0.6">+ ${event.acts.length - acts.length} more</text>`);
      }
    } else {
      parts.push(strike(box.x, rowTops[1] + 60, box.w, palette.tonerBlack));
    }

    // Row 2: DELIVER TO | WINDOW
    const deliverTo = event.locationTba ? `LOCATION TBA${event.locationNote ? `, ${event.locationNote}` : ''}` : event.venueName;
    parts.push(cell(ctx, { x: box.x, y: rowTops[2], w: splitX - box.x, h: rowHeights[2], label: 'DELIVER TO', value: deliverTo }));
    const windowText = [event.doors, event.close].filter(Boolean).join(' - ');
    parts.push(cell(ctx, { x: splitX, y: rowTops[2], w: box.x + box.w - splitX, h: rowHeights[2], label: 'WINDOW', value: windowText || null }));

    // Row 3: HANDLING
    const handling = [event.ageRestriction, event.ticketText].filter(Boolean).join(', ');
    parts.push(cell(ctx, { x: box.x, y: rowTops[3], w: box.w, h: rowHeights[3], label: 'HANDLING', value: handling || null }));

    // Row 4: barcode + event ID. No barcode on the scrap surface (section
    // 4.5): it's the single most element-heavy part of this template, and
    // the ID text alone still reads fine at thumbnail size.
    const barcodeY = rowTops[4] + 30;
    if (ctx.surface !== 'scrap') {
      parts.push(barcode(ctx, { value: event.id, x: box.x, y: barcodeY, w: box.w * 0.7, h: 60 }));
      parts.push(`<text x="${box.x}" y="${barcodeY + 84}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(event.id)}</text>`);
    } else {
      parts.push(`<text x="${box.x}" y="${barcodeY + 24}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(event.id)}</text>`);
    }

    parts.push(wordmark(ctx, { x: canvas.right, y: canvas.bottom - 12, color: palette.tonerBlack }));

    return `<g>${parts.join('')}</g>`;
  },
};

function labelText(label, x, y, color) {
  return `<text x="${x}" y="${y + 22}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${color}">${escapeXml(label)}</text>`;
}

function strike(x, y, width, color) {
  return `<rect x="${x}" y="${y - 1}" width="${width}" height="2" fill="${color}" opacity="0.4"/>`;
}

function cell(ctx, { x, y, w, h, label, value }) {
  const { palette } = ctx;
  const padding = 20;
  const labelY = y + 34;
  const valueY = y + 76;
  const parts = [
    `<text x="${x + padding}" y="${labelY}" font-family="${LABEL_FONT}" font-size="18" letter-spacing="0.04em" fill="${palette.tonerBlack}">${escapeXml(label)}</text>`,
  ];
  if (value) {
    parts.push(`<text x="${x + padding}" y="${valueY}" font-family="${VALUE_FONT}" font-size="28" fill="${palette.tonerBlack}">${escapeXml(value)}</text>`);
  } else {
    parts.push(`<rect x="${x + padding}" y="${valueY - 8}" width="${w - padding * 2}" height="2" fill="${palette.tonerBlack}" opacity="0.4"/>`);
  }
  return `<g>${parts.join('')}</g>`;
}
