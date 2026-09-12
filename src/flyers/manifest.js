// Template registry and genre routing, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md
// section 8. All ten templates, phase 2b.

import medi from './templates/medi.js';
import consignment from './templates/consignment.js';
import schematic from './templates/schematic.js';
import stencil from './templates/stencil.js';
import terminal from './templates/terminal.js';
import halftoneField from './templates/halftoneField.js';
import ransom from './templates/ransom.js';
import indexList from './templates/indexList.js';
import cymatic from './templates/cymatic.js';
import contour from './templates/contour.js';

export const TEMPLATES = {
  medi,
  consignment,
  schematic,
  stencil,
  terminal,
  halftoneField,
  ransom,
  'index-list': indexList,
  cymatic,
  contour,
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
 * @param {{ exclude?: string }} [options] - exclude: skip this template id
 *   during auto-routing (section 8's anti-repetition nudge), computed at
 *   publish time by the caller. Has no effect on an explicit choice.
 */
export function resolveTemplate(event, explicitTemplate, options = {}) {
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
    if (id === options.exclude && id !== explicitTemplate) continue;
    const template = TEMPLATES[id];
    if (template && satisfies(template, event)) return template;
  }

  return TEMPLATES.medi;
}
