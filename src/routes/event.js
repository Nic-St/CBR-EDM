import { layout } from '../templates/layout.js';
import { eventPage, eventOgTags } from '../templates/eventPage.js';
import { buildCalendar } from '../lib/ics.js';
import { notFound } from '../lib/http.js';
import { recordCount, isBotRequest } from '../lib/analytics.js';

const EVENT_SELECT = `
  SELECT events.*, crews.name AS crew_name, crews.slug AS crew_slug
  FROM events
  LEFT JOIN crews ON crews.id = events.crew_id
  WHERE events.slug = ? AND events.visibility = 'published'
`;

/**
 * GET /e/:slug. Section 8.3. Pending, rejected and removed events return
 * 404 and are never previewable, so this never reveals whether a
 * non-published slug exists.
 */
export async function handleEventPage(request, env, slug) {
  const event = await env.DB.prepare(EVENT_SELECT).bind(slug).first();
  if (!event) return notFound();

  if (!isBotRequest(request)) await recordCount(env, 'event_view', event.id);

  const { body, dateText } = eventPage(event);
  const extraHead = String(eventOgTags(event, dateText));
  const page = String(layout({ title: event.title || 'Event', bodyContent: body, extraHead }));

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}

/**
 * GET /e/:slug.ics. Section 6 and 11.1: add a single event to a calendar.
 */
export async function handleEventIcs(request, env, slug) {
  const event = await env.DB.prepare(EVENT_SELECT).bind(slug).first();
  if (!event) return notFound();

  if (!isBotRequest(request)) await recordCount(env, 'ics_event_download', event.id);

  const domain = new URL(request.url).host;
  const body = buildCalendar([event], domain);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'public, max-age=60',
    },
  });
}
