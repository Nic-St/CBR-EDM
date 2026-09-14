// Template registry and genre routing, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 8.
//
// Owner decision (2026-09-13, then again 2026-09-14): stick purely to the
// real contour map. The other nine templates (medi, consignment,
// schematic, stencil, terminal, halftoneField, ransom, index-list,
// cymatic) were first archived from routing/admin selection, then removed
// from the codebase entirely -- they are not wanted in the live site at
// all, only as history. Nothing here deletes them from GitHub: they stay
// fully recoverable from git history/the archive branch, one revert away
// from coming back if that's ever wanted. See CHANGELOG.md for the commit.

import contour from './templates/contour.js';

export const TEMPLATES = {
  contour,
};

/**
 * Whether a normalised event satisfies a template's own requirements.
 * @param {object} template
 * @param {object} event - normalised event, see normalise.js
 */
function satisfies(template, event) {
  if (event.acts.length < (template.minLineup || 0)) return false;
  if (template.maxLineup !== undefined && event.acts.length > template.maxLineup) return false;
  for (const field of template.needs || []) {
    if (!event[field]) return false;
  }
  return true;
}

/**
 * Resolves which template renders a given (already normalised) event,
 * section 8's resolution order.
 * @param {object} event - normalised event, see normalise.js
 * @param {string|null} [explicitTemplate] - event.flyer_template, admin override
 * @param {{ exclude?: string }} [options] - exclude: skip this template id
 *   during auto-routing (section 8's anti-repetition nudge), computed at
 *   publish time by the caller. Has no effect now there is only one
 *   candidate, kept for signature compatibility with callers.
 */
export function resolveTemplate(event, explicitTemplate, options = {}) {
  if (explicitTemplate && TEMPLATES[explicitTemplate] && satisfies(TEMPLATES[explicitTemplate], event)) {
    return TEMPLATES[explicitTemplate];
  }
  return TEMPLATES.contour;
}
