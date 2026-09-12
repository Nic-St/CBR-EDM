// The flyer engine's public entry point. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 4.7: this must never break a page. A template that throws, or
// produces an invalid or oversized composition, falls back to medi; if
// medi also fails, this returns null and the caller falls back to the
// type-only scrap from the main spec.

import { rngFor } from './seed.js';
import { paletteFor } from './palette.js';
import { gridFor } from './layout.js';
import { normaliseEvent, flyerDataHash } from './normalise.js';
import { resolveTemplate, TEMPLATES } from './manifest.js';
import { stampTextFor, stamp } from './parts/stamp.js';
import { grain } from './parts/grain.js';
import { escapeXml } from './xml.js';
import { isEventPast } from '../lib/dates.js';

// Bump on any change that alters rendered output (a new template, a tweak
// to an existing one, a shared part changing). It is part of the cache
// key (section 4.2), so forgetting to bump it serves stale artwork. Record
// every bump under "## Flyers" in CHANGELOG.md.
export const FLYER_ENGINE_VERSION = '0.4.1';

const SIZE_BUDGETS = {
  scrap: 12 * 1024,
  page: 60 * 1024,
  social: 60 * 1024,
  print: 60 * 1024,
};

function buildCtx(event, rawEvent, surface, now, template) {
  const random = rngFor(event.id, event.seedSalt);
  const isPast = isEventPast(rawEvent, now);
  return {
    event,
    random,
    palette: paletteFor(random, isPast, { excludeYellowOnPaper: template?.paperField }),
    canvas: gridFor(1080, 1350),
    surface,
    isPast,
  };
}

function titleFor(event) {
  const parts = [];
  parts.push(event.headliner ? `Flyer for ${event.headliner}` : 'Flyer');
  if (event.venueName) parts.push(`at ${event.venueName}`);
  else if (event.locationTba) parts.push('location TBA');
  if (event.dateLong) parts.push(event.dateLong);
  return parts.join(', ');
}

function wrapSvg(ctx, innerContent) {
  const title = titleFor(ctx.event);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ctx.canvas.width} ${ctx.canvas.height}" role="img"><title>${escapeXml(title)}</title>${innerContent}</svg>`;
}

/**
 * Section 4.7's validation gate: single root svg, viewBox present, no
 * external href, no script, under the size budget for this surface.
 */
function validationError(svg, budget) {
  if (!svg.startsWith('<svg')) return 'does not start with <svg';
  if (!svg.includes('viewBox=')) return 'missing viewBox';
  if (/href\s*=\s*"https?:/i.test(svg)) return 'contains an external href';
  if (/<script/i.test(svg)) return 'contains a <script> element';
  const bytes = new TextEncoder().encode(svg).length;
  if (bytes > budget) return `exceeds size budget (${bytes} > ${budget} bytes)`;
  return null;
}

function renderWithTemplate(template, ctx) {
  const inner = [template.render(ctx)];

  // Section 11.4: past events get the faded palette (already applied in
  // buildCtx) plus one extra layer of grain over the whole canvas, on top
  // of whatever grain the template itself draws.
  if (ctx.isPast) {
    inner.push(grain(ctx, { opacity: 0.05, area: { x: 0, y: 0, width: ctx.canvas.width, height: ctx.canvas.height } }));
  }

  // Status stamps sit above everything and are drawn last, section 11.
  const stampText = stampTextFor(ctx.event.status);
  if (stampText) {
    inner.push(stamp(ctx, { text: stampText, x: ctx.canvas.centerX, y: ctx.canvas.height * 0.42 }));
  }

  const svg = wrapSvg(ctx, inner.join(''));
  const budget = SIZE_BUDGETS[ctx.surface] || SIZE_BUDGETS.page;
  const error = validationError(svg, budget);
  if (error) throw new Error(`${template.id}: ${error}`);
  return svg;
}

/**
 * @param {object} rawEvent - a row from `events`, ideally joined with crews.name AS crew_name
 * @param {{ surface?: 'scrap'|'page'|'social'|'print', now?: Date }} [options]
 * @returns {{ svg: string, templateId: string, dataHash: string }|null}
 */
export function render(rawEvent, options = {}) {
  const now = options.now || new Date();
  const surface = options.surface || 'page';
  const event = normaliseEvent(rawEvent, { now, surface });
  const template = resolveTemplate(event, rawEvent.flyer_template);
  const dataHash = flyerDataHash(rawEvent);

  try {
    const svg = renderWithTemplate(template, buildCtx(event, rawEvent, surface, now, template));
    return { svg, templateId: template.id, dataHash };
  } catch (err) {
    console.error(`Flyer render failed for event ${rawEvent.id} (template ${template.id})`, err);
  }

  if (template.id === 'medi') return null; // medi is itself the fallback; nothing left to try

  try {
    const svg = renderWithTemplate(TEMPLATES.medi, buildCtx(event, rawEvent, surface, now, TEMPLATES.medi));
    return { svg, templateId: 'medi', dataHash };
  } catch (err) {
    console.error(`Flyer fallback to medi also failed for event ${rawEvent.id}`, err);
    return null;
  }
}

/**
 * The cache key described in section 4.2. Editing a field the flyer
 * doesn't use must not bust the cache, which is why this is built from
 * flyerDataHash rather than an updated_at timestamp.
 */
export function cacheKeyFor(rawEvent, result, surface) {
  return `flyer:${rawEvent.id}:${result.templateId}:${rawEvent.seed_salt || 0}:${surface}:${FLYER_ENGINE_VERSION}:${result.dataHash}`;
}
