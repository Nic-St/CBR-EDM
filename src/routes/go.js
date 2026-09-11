import { recordCount, isBotRequest } from '../lib/analytics.js';
import { isHttpUrl } from '../lib/eventFields.js';

/**
 * GET /go/:eventId. Section 6 and 12: a counted redirect to the stored
 * ticket URL. Only ever redirects to the URL on that exact event, so it
 * cannot be used as an open redirect, and only http/https URLs are honoured.
 */
export async function handleGo(request, env, eventId) {
  const event = await env.DB.prepare(
    "SELECT ticket_url FROM events WHERE id = ? AND visibility = 'published'",
  ).bind(eventId).first();

  if (!event?.ticket_url || !isHttpUrl(event.ticket_url)) {
    return new Response('Not found', { status: 404 });
  }

  if (!isBotRequest(request)) await recordCount(env, 'ticket_click', eventId);

  return Response.redirect(event.ticket_url, 302);
}
