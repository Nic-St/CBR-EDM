import { buildCalendar } from '../lib/ics.js';
import { recordCount, isBotRequest } from '../lib/analytics.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * GET /calendar.ics. Section 11.1: the subscribable feed. Includes
 * published events starting from 90 days ago onwards, to keep the feed
 * small (the archive has everything).
 */
export async function handleCalendarFeed(request, env) {
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

  const { results } = await env.DB.prepare(
    `SELECT events.*, crews.name AS crew_name
     FROM events
     LEFT JOIN crews ON crews.id = events.crew_id
     WHERE events.visibility = 'published' AND events.start_at >= ?
     ORDER BY events.start_at`,
  ).bind(cutoff).all();

  if (!isBotRequest(request)) await recordCount(env, 'ics_feed_fetch');

  const domain = new URL(request.url).host;
  const body = buildCalendar(results, domain);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
