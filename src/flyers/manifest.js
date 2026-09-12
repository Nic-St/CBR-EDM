// Template registry and genre routing, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 8. Phase 2a ships only medi and consignment; the routing table
// below is the full section 8 table so it needs no changes in phase 2b,
// but resolve() skips any match whose template isn't registered yet and
// falls through to the next rule.

import medi from './templates/medi.js';
import consignment from './templates/consignment.js';

export const TEMPLATES = {
  medi,
  consignment,
};

const ROUTES = [
  { match: ['dubstep', '140', 'halfstep', 'dub', 'sound system'], template: 'medi' },
  { match: ['dub techno', 'minimal', 'ambient', 'drone'], template: 'cymatic' },
  { match: ['hard techno', 'industrial', 'hardgroove', 'ebm'], template: 'stencil' },
  { match: ['techno', 'warehouse'], template: 'consignment' },
  { match: ['electro', 'idm', 'experimental', 'breakcore'], template: 'terminal' },
  { match: ['drum and bass', 'dnb', 'jungle'], template: 'terminal' },
  { match: ['hardcore', 'gabber', 'hard dance', 'rave'], template: 'ransom' },
  { match: ['house', 'disco', 'garage', 'ukg', '2-step', 'breaks'], template: 'halftoneField' },
  { match: ['outdoor', 'doof', 'bush', 'picnic'], template: 'contour' },
];

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
 */
export function resolveTemplate(event, explicitTemplate) {
  const candidates = [];

  if (explicitTemplate && TEMPLATES[explicitTemplate]) {
    candidates.push(explicitTemplate);
  }

  if (event.acts.length >= 6 && TEMPLATES['index-list']) {
    candidates.push('index-list');
  }

  for (const route of ROUTES) {
    if (!TEMPLATES[route.template]) continue;
    if (route.match.some((genre) => event.genres.includes(genre))) {
      candidates.push(route.template);
    }
  }

  if (event.headliner && event.venueName && event.acts.length >= 2 && TEMPLATES.schematic) {
    candidates.push('schematic');
  }

  candidates.push('medi');

  for (const id of candidates) {
    const template = TEMPLATES[id];
    if (template && satisfies(template, event)) return template;
  }

  return TEMPLATES.medi;
}
