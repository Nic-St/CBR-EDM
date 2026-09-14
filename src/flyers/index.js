// The flyer engine's public entry point. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 4.7: this must never break a page. contour is now the only
// template (see manifest.js), so it is its own fallback -- if it throws,
// or produces an invalid or oversized composition, this returns null and
// the caller falls back to the type-only scrap from the main spec.

import { rngFor } from './seed.js';
import { paletteFor } from './palette.js';
import { gridFor } from './layout.js';
import { normaliseEvent, flyerDataHash } from './normalise.js';
import { resolveTemplate } from './manifest.js';
import { stampTextFor, stamp } from './parts/stamp.js';
import { grain } from './parts/grain.js';
import { escapeXml } from './xml.js';
import { isEventPast } from '../lib/dates.js';

// Bump on any change that alters rendered output (a new template, a tweak
// to an existing one, a shared part changing). It is part of the cache
// key (section 4.2), so forgetting to bump it serves stale artwork. Record
// every bump under "## Flyers" in CHANGELOG.md.
export const FLYER_ENGINE_VERSION = '0.11.0';

// scrap now matches page/social/print (owner-reported bug: a real-terrain
// contour flyer with a full lineup could exceed the old 12KB budget,
// silently crash-falling back to "Deep field" below -- the board would
// show a different template than the admin preview for the same event,
// for no visible reason). A first fix raised this to 20KB, but
// measuring actual worst-case output (long title/presenter, real terrain,
// a long lineup of long names, contour's own scrap-surface terrain
// trimming already applied) shows byte size grows roughly linearly with
// act count -- about 290B/act at the long end -- and a genuinely large
// but plausible community lineup (20-30 named acts) already lands at
// 19-22KB on its own, before terrain or the title/presenter lines. 20KB
// had only a few hundred bytes of headroom at 25 acts and was already
// exceeded at 30 -- the same silent-fallback bug this was meant to fix,
// just at a higher act count. Since support acts are no longer truncated
// (every act has to show, owner request), there's no cap on how long
// this text block can get, so matching the already-safe page budget
// removes the risk category rather than picking another number that
// will eventually be wrong again. contour still trims its own terrain
// detail for the scrap surface (see contour.js) to keep the common case
// (a normal-length lineup) meaningfully lighter than a full-detail page
// render, even though the byte ceiling is now the same.
const SIZE_BUDGETS = {
  scrap: 60 * 1024,
  page: 60 * 1024,
  social: 60 * 1024,
  print: 60 * 1024,
};

function buildCtx(event, rawEvent, surface, now) {
  const random = rngFor(event.id, event.seedSalt);
  const isPast = isEventPast(rawEvent, now);
  return {
    event,
    random,
    palette: paletteFor(random, isPast),
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
    const svg = renderWithTemplate(template, buildCtx(event, rawEvent, surface, now));
    return { svg, templateId: template.id, dataHash };
  } catch (err) {
    console.error(`Flyer render failed for event ${rawEvent.id} (template ${template.id})`, err);
    return null; // contour is itself the only template; nothing left to fall back to
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
