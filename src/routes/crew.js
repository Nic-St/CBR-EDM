import { layout } from '../templates/layout.js';
import { crewDashboardPage } from '../templates/crew.js';
import { hashToken } from '../lib/tokens.js';
import { readEventFields, validateEventFields, asFormDataLike } from '../lib/eventFields.js';
import { utcToCanberraLocalInput } from '../lib/dates.js';
import { generateId, eventSlugFor } from '../lib/ids.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { sendAdminAlert } from '../lib/email.js';

const TURNSTILE_SCRIPT = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';
const NO_STORE_HEADERS = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export async function handleCrewPage(request, env) {
  const body = crewDashboardPage(env.TURNSTILE_SITE_KEY);
  const page = String(layout({ title: 'Crew dashboard', bodyContent: body, extraHead: TURNSTILE_SCRIPT }));
  return new Response(page, { headers: NO_STORE_HEADERS });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

async function requireCrew(request, env, body) {
  if (!body.key) return null;
  const keyHash = await hashToken(body.key);
  return env.DB.prepare('SELECT * FROM crews WHERE key_hash = ?').bind(keyHash).first();
}

/**
 * POST /api/crew/login. Section 9.3 and 9.4: rate limited and, when a
 * fresh Turnstile token is presented (an actual sign-in attempt rather
 * than the page re-checking a stored key), verified against it.
 */
export async function handleCrewLogin(request, env) {
  const allowed = await checkRateLimit(request, env, 'crew_key', 10);
  if (!allowed) return jsonResponse({ ok: false, error: 'Too many attempts today. Try again tomorrow.' }, 429);

  const body = await readJson(request);
  if (body.turnstileToken) {
    const turnstileOk = await verifyTurnstile(body.turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'));
    if (!turnstileOk) return jsonResponse({ ok: false, error: 'That check did not pass.' }, 400);
  }

  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'That key was not recognised.' }, 401);

  return jsonResponse({ ok: true, crew: { name: crew.name, trusted: Boolean(crew.trusted) } });
}

// Never select submitter_contact or edit_token_hash here: this data goes
// straight to the crew's own browser session, which is a lower-trust
// context than the admin panel, section 12.
const CREW_SAFE_EVENT_SELECT = `
  SELECT id, title, start_at, end_at, venue_name, venue_address, genres, price_text, lineup,
    ticket_url, notes, age_restriction, status, visibility
  FROM events WHERE crew_id = ? ORDER BY start_at DESC
`;

export async function handleCrewEventList(request, env) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const { results } = await env.DB.prepare(CREW_SAFE_EVENT_SELECT).bind(crew.id).all();
  const events = results.map((event) => ({
    ...event,
    start_at_local: utcToCanberraLocalInput(event.start_at),
    end_at_local: utcToCanberraLocalInput(event.end_at),
  }));
  return jsonResponse({ ok: true, events });
}

export async function handleCrewEventCreate(request, env) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const fields = readEventFields(asFormDataLike(body));
  const errors = validateEventFields(fields);
  if (errors.length) return jsonResponse({ ok: false, error: errors[0] }, 400);

  const willPublish = Boolean(crew.trusted && fields.title && fields.start_at);
  const now = new Date().toISOString();
  const id = generateId('evt');
  const slug = eventSlugFor(fields.title, fields.start_at);

  await env.DB.prepare(
    `INSERT INTO events (id, slug, title, crew_id, start_at, end_at, venue_name, venue_address, genres,
       price_text, lineup, ticket_url, notes, age_restriction, status, visibility, source, sequence,
       created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on', ?, 'crew', ?, ?, ?, ?)`,
  ).bind(
    id, slug, fields.title, crew.id, fields.start_at, fields.end_at, fields.venue_name, fields.venue_address,
    fields.genres, fields.price_text, fields.lineup, fields.ticket_url, fields.notes, fields.age_restriction,
    willPublish ? 'published' : 'pending', willPublish ? 1 : 0, now, now, willPublish ? now : null,
  ).run();

  await sendAdminAlert(env, {
    subject: `Crew ${willPublish ? 'publish' : 'submission'}: ${fields.title || 'untitled'}`,
    path: new URL(`/admin/events/${id}/edit`, request.url).toString(),
    summary: `${crew.name} ${willPublish ? 'published' : 'submitted'} "${fields.title || 'Untitled event'}".`,
  });

  return jsonResponse({ ok: true, published: willPublish });
}

async function ownedEvent(env, crew, id) {
  return env.DB.prepare('SELECT * FROM events WHERE id = ? AND crew_id = ?').bind(id, crew.id).first();
}

export async function handleCrewEventUpdate(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  const fields = readEventFields(asFormDataLike(body));
  const errors = validateEventFields(fields);
  if (errors.length) return jsonResponse({ ok: false, error: errors[0] }, 400);

  const now = new Date().toISOString();
  const canApplyDirectly = crew.trusted || event.visibility === 'pending';

  if (canApplyDirectly) {
    const sequenceBump = event.visibility === 'published' ? 'sequence + 1' : 'sequence';
    await env.DB.prepare(
      `UPDATE events SET title = ?, start_at = ?, end_at = ?, venue_name = ?, venue_address = ?, genres = ?,
         price_text = ?, lineup = ?, ticket_url = ?, notes = ?, age_restriction = ?, sequence = ${sequenceBump},
         updated_at = ? WHERE id = ?`,
    ).bind(
      fields.title, fields.start_at, fields.end_at, fields.venue_name, fields.venue_address, fields.genres,
      fields.price_text, fields.lineup, fields.ticket_url, fields.notes, fields.age_restriction, now, id,
    ).run();

    await sendAdminAlert(env, {
      subject: `Crew edit: ${fields.title || 'untitled'}`,
      path: new URL(`/admin/events/${id}/edit`, request.url).toString(),
      summary: `${crew.name} edited "${fields.title || 'Untitled event'}".`,
    });
    return jsonResponse({ ok: true, applied: 'direct' });
  }

  await env.DB.prepare(
    'INSERT INTO event_changes (id, event_id, kind, proposed_json, via, state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(generateId('chg'), id, 'edit', JSON.stringify(fields), 'crew_key', 'pending', now).run();

  await sendAdminAlert(env, {
    subject: `Crew change request: ${event.title || 'untitled'}`,
    path: new URL(`/admin/events/${id}/edit`, request.url).toString(),
    summary: `${crew.name} proposed changes to "${event.title || 'Untitled event'}" for review.`,
  });
  return jsonResponse({ ok: true, applied: 'pending_review' });
}

export async function handleCrewEventStatus(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  if (!['cancelled', 'sold_out', 'postponed'].includes(body.status)) {
    return jsonResponse({ ok: false, error: 'Not a valid status.' }, 400);
  }

  const now = new Date().toISOString();

  if (crew.trusted) {
    const sequenceBump = event.visibility === 'published' ? 'sequence + 1' : 'sequence';
    await env.DB.prepare(`UPDATE events SET status = ?, sequence = ${sequenceBump}, updated_at = ? WHERE id = ?`)
      .bind(body.status, now, id).run();

    await sendAdminAlert(env, {
      subject: `Crew status change: ${event.title || 'untitled'}`,
      path: new URL(`/admin/events/${id}/edit`, request.url).toString(),
      summary: `${crew.name} marked "${event.title || 'Untitled event'}" as ${body.status}.`,
    });
    return jsonResponse({ ok: true, applied: 'direct' });
  }

  await env.DB.prepare(
    'INSERT INTO event_changes (id, event_id, kind, proposed_json, via, state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(generateId('chg'), id, 'edit', JSON.stringify({ status: body.status }), 'crew_key', 'pending', now).run();

  return jsonResponse({ ok: true, applied: 'pending_review' });
}

/**
 * POST /api/crew/events/:id/unpublish. Section 9.4: the only non-admin
 * path to instant removal, always instant regardless of trust.
 */
export async function handleCrewEventUnpublish(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  await env.DB.prepare("UPDATE events SET visibility = 'removed', updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), id).run();

  await sendAdminAlert(env, {
    subject: `Crew removal: ${event.title || 'untitled'}`,
    path: new URL(`/admin/events/${id}/edit`, request.url).toString(),
    summary: `${crew.name} unpublished "${event.title || 'Untitled event'}".`,
  });

  return jsonResponse({ ok: true });
}
