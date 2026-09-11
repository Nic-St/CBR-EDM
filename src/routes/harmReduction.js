import { layout } from '../templates/layout.js';
import { harmReductionPage } from '../templates/harmReduction.js';

/**
 * GET /look-after-each-other. Section 6 and 15.4.
 */
export async function handleHarmReduction(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM harm_reduction_links').all();
  const body = harmReductionPage(results);
  const page = String(layout({ title: 'Look after each other', bodyContent: body }));

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
