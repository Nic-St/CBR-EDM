import { layout } from '../templates/layout.js';
import { archiveIndex, archiveYear } from '../templates/archive.js';
import { canberraDayKey, isEventPast } from '../lib/dates.js';

/**
 * GET /archive and GET /archive/:year. Section 6: the forever archive.
 */
export async function handleArchive(request, env, year) {
  const { results } = await env.DB.prepare(
    `SELECT events.*, crews.name AS crew_name, crews.slug AS crew_slug
     FROM events LEFT JOIN crews ON crews.id = events.crew_id
     WHERE events.visibility = 'published' AND events.start_at IS NOT NULL
     ORDER BY events.start_at DESC`,
  ).all();

  const past = results.filter((event) => isEventPast(event));

  const body = year
    ? archiveYear(year, past.filter((event) => Number(canberraDayKey(event.start_at).slice(0, 4)) === year))
    : archiveIndex([...new Set(past.map((event) => Number(canberraDayKey(event.start_at).slice(0, 4))))].sort((a, b) => b - a));

  const page = String(layout({ title: year ? `Archive: ${year}` : 'Archive', bodyContent: body }));

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
