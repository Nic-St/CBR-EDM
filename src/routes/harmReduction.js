import { layout } from '../templates/layout.js';
import { harmReductionPage } from '../templates/harmReduction.js';
import { getSetting } from '../lib/settings.js';

export const HARM_REDUCTION_INTRO_KEY = 'harm_reduction_intro';
export const HARM_REDUCTION_INTRO_DEFAULT = 'In an emergency call 000.\nDrug checking in NSW is offered only at selected licensed festivals, not at underground events, so CanTEST is the local option before heading out.';

/**
 * GET /look-after-each-other. Section 6 and 15.4.
 */
export async function handleHarmReduction(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM harm_reduction_links').all();
  const intro = await getSetting(env, HARM_REDUCTION_INTRO_KEY, HARM_REDUCTION_INTRO_DEFAULT);
  const body = harmReductionPage(results, intro);
  const page = String(layout({ title: 'Look after each other', bodyContent: body }));

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
