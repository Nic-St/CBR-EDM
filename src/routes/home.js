import { layout } from '../templates/layout.js';
import { homePage } from '../templates/home.js';
import { currentCanberraMonth } from '../lib/dates.js';
import { recordCount, isBotRequest } from '../lib/analytics.js';

/**
 * GET / and GET /?month=YYYY-MM. Section 6 and 7.
 * @param {Request} request
 * @param {import('../env.js').Env} env
 */
export async function handleHome(request, env) {
  const url = new URL(request.url);
  const { year, month } = parseMonthParam(url.searchParams.get('month'));

  const { results } = await env.DB.prepare(
    `SELECT events.*, crews.name AS crew_name, crews.slug AS crew_slug
     FROM events LEFT JOIN crews ON crews.id = events.crew_id
     WHERE events.visibility = 'published' ORDER BY events.start_at`,
  ).all();

  if (!isBotRequest(request)) await recordCount(env, 'home_view');

  const { body } = homePage(results, year, month);

  const page = String(layout({ title: null, bodyContent: body, bodyClass: 'page-home' }));

  return new Response(page, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

function parseMonthParam(param) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split('-').map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  return currentCanberraMonth();
}
