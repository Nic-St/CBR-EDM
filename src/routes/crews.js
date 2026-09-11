import { layout } from '../templates/layout.js';
import { crewsDirectoryPage, crewProfilePage } from '../templates/crews.js';
import { isEventPast } from '../lib/dates.js';
import { notFound } from '../lib/http.js';

/**
 * GET /crews. Section 16.
 */
export async function handleCrewsDirectory(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT crews.*, COUNT(events.id) AS eventCount
     FROM crews LEFT JOIN events ON events.crew_id = crews.id AND events.visibility = 'published'
     WHERE crews.listed = 1
     GROUP BY crews.id ORDER BY crews.name`,
  ).all();

  const page = String(layout({ title: 'Crews', bodyContent: crewsDirectoryPage(results) }));
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}

/**
 * GET /crews/:slug. Section 16.
 */
export async function handleCrewProfile(request, env, slug) {
  const crew = await env.DB.prepare('SELECT * FROM crews WHERE slug = ?').bind(slug).first();
  if (!crew) return notFound();

  const { results } = await env.DB.prepare(
    "SELECT * FROM events WHERE crew_id = ? AND visibility = 'published' ORDER BY start_at",
  ).bind(crew.id).all();

  const upcoming = results.filter((event) => !isEventPast(event));
  const past = results.filter((event) => isEventPast(event)).reverse();

  const page = String(layout({ title: crew.name, bodyContent: crewProfilePage(crew, upcoming, past) }));
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}
