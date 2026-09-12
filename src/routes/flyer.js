import { render, cacheKeyFor } from '../flyers/index.js';

/**
 * GET /flyer/:eventId.svg. PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 4.2.
 * Standalone raw-SVG access to a generated flyer (the board and event page
 * inline the SVG directly instead of fetching this, section 4.5). Only
 * for published events, matching handleImg's precedent for uploaded
 * flyers -- a generated flyer is not published data until the event is.
 * @param {Request} request
 * @param {import('../env.js').Env} env
 * @param {string} eventId
 */
export async function handleFlyer(request, env, eventId) {
  const event = await env.DB.prepare(
    `SELECT events.*, crews.name AS crew_name FROM events
     LEFT JOIN crews ON crews.id = events.crew_id
     WHERE events.id = ? AND events.visibility = 'published'`,
  ).bind(eventId).first();

  if (!event) return new Response('Not found', { status: 404 });

  const url = new URL(request.url);
  const surface = ['scrap', 'page', 'social', 'print'].includes(url.searchParams.get('surface'))
    ? url.searchParams.get('surface')
    : 'page';

  const result = render(event, { surface });
  if (!result) return new Response('Not found', { status: 404 });

  return new Response(result.svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Flyer-Cache-Key': cacheKeyFor(event, result, surface),
    },
  });
}
