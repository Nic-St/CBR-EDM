import { layout } from '../templates/layout.js';
import { crewDashboardPage } from '../templates/crew.js';
import { hashToken } from '../lib/tokens.js';
import { readEventFields, validateEventFields, asFormDataLike } from '../lib/eventFields.js';
import { utcToCanberraLocalInput } from '../lib/dates.js';
import { generateId, eventSlugFor } from '../lib/ids.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { sendAdminAlert } from '../lib/email.js';
import { render } from '../flyers/index.js';
import { resolveTemplate, TEMPLATES } from '../flyers/manifest.js';
import { normaliseEvent } from '../flyers/normalise.js';
import { freezeFlyerTemplate } from './admin/events.js';
import { fetchRealTerrain } from '../lib/geocode.js';

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

  let links = [];
  try {
    links = JSON.parse(crew.links_json || '[]');
  } catch {
    links = [];
  }

  return jsonResponse({
    ok: true,
    crew: { name: crew.name, trusted: Boolean(crew.trusted), blurb: crew.blurb, links },
  });
}

/**
 * POST /api/crew/profile. Section 16: trusted crews edit their own profile
 * from the dashboard.
 */
export async function handleCrewProfileUpdate(request, env) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);
  if (!crew.trusted) return jsonResponse({ ok: false, error: 'Only trusted crews can edit their profile.' }, 403);

  const blurb = String(body.blurb || '').slice(0, 1000);
  const links = Array.isArray(body.links)
    ? body.links.slice(0, 20).map((link) => ({ label: String(link.label || '').slice(0, 100), url: String(link.url || '').slice(0, 500) }))
    : [];

  await env.DB.prepare('UPDATE crews SET blurb = ?, links_json = ?, updated_at = ? WHERE id = ?')
    .bind(blurb, JSON.stringify(links), new Date().toISOString(), crew.id).run();

  return jsonResponse({ ok: true });
}

// Never select submitter_contact or edit_token_hash here: this data goes
// straight to the crew's own browser session, which is a lower-trust
// context than the admin panel, section 12.
const CREW_SAFE_EVENT_SELECT = `
  SELECT id, title, start_at, end_at, venue_name, venue_address, genres, lineup,
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

  const flyerTemplate = TEMPLATES[body.flyer_template] ? body.flyer_template : null;
  const willPublish = Boolean(crew.trusted && fields.title && fields.start_at);
  const now = new Date().toISOString();
  const id = generateId('evt');
  const slug = eventSlugFor(fields.title, fields.start_at);

  await env.DB.prepare(
    `INSERT INTO events (id, slug, title, crew_id, start_at, end_at, venue_name, venue_address, genres,
       lineup, ticket_url, notes, age_restriction, status, visibility, source, sequence,
       created_at, updated_at, published_at, flyer_template)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on', ?, 'crew', ?, ?, ?, ?, ?)`,
  ).bind(
    id, slug, fields.title, crew.id, fields.start_at, fields.end_at, fields.venue_name, fields.venue_address,
    fields.genres, fields.lineup, fields.ticket_url, fields.notes, fields.age_restriction,
    willPublish ? 'published' : 'pending', willPublish ? 1 : 0, now, now, willPublish ? now : null, flyerTemplate,
  ).run();

  // FLYER-ENGINE-SPEC.md section 8: a trusted crew publishing straight
  // from creation skips the admin publish handler entirely, so the
  // anti-repetition freeze has to run here too -- it only acts when
  // there's no explicit flyer_template, so a crew's own pick (above)
  // always wins over it.
  if (willPublish) {
    await freezeFlyerTemplate(env, { id, title: fields.title, genres: fields.genres, lineup: fields.lineup,
      start_at: fields.start_at, end_at: fields.end_at, venue_name: fields.venue_name,
      age_restriction: fields.age_restriction, status: fields.status, flyer_template: flyerTemplate });
  }

  await sendAdminAlert(env, {
    subject: `Crew ${willPublish ? 'publish' : 'submission'}: ${fields.title || 'untitled'}`,
    path: new URL(`/admin/events/${id}/edit`, request.url).toString(),
    summary: `${crew.name} ${willPublish ? 'published' : 'submitted'} "${fields.title || 'Untitled event'}".`,
  });

  return jsonResponse({ ok: true, published: willPublish });
}

/**
 * POST /api/crew/flyer-preview. A live preview for the "Add an event" form,
 * before the event has been saved -- so there's no owned row to check,
 * just the crew's own key and whatever they've typed so far. The preview
 * id is stable per crew (not random per request) so the seed stays put
 * while they're iterating on the same draft; it has no bearing on the
 * real event's id or its own seed once actually created.
 */
export async function handleCrewFlyerPreview(request, env) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const fields = readEventFields(asFormDataLike(body));
  const event = {
    ...fields,
    presented_by: fields.presented_by || crew.name,
    id: `preview_${crew.id}`,
    flyer_template: TEMPLATES[body.flyer_template] ? body.flyer_template : null,
    flyer_thumb_key: null,
    seed_salt: 0,
  };

  return jsonResponse(flyerPayload(event));
}

async function ownedEvent(env, crew, id) {
  return env.DB.prepare(
    'SELECT events.*, crews.name AS crew_name FROM events LEFT JOIN crews ON crews.id = events.crew_id WHERE events.id = ? AND events.crew_id = ?',
  ).bind(id, crew.id).first();
}

/**
 * FLYER-ENGINE-SPEC.md section 13's admin picker, for crews: a preview,
 * the auto choice, and the full template list, so a crew can see and pick
 * their own generated flyer without an admin. Sent as an SVG string
 * rather than rendered server-side into the page, since the dashboard is
 * a JSON API -- the client sets it as an <img> src (never innerHTML), so
 * an untrusted title or lineup landing in the markup can't run as script.
 */
function flyerPayload(event) {
  const normalised = normaliseEvent(event, {});
  const auto = resolveTemplate(normalised, null);
  // Matches eventCard.js/eventPage.js: an uploaded flyer always wins, so
  // there is nothing useful to preview or pick a template for here.
  const result = event.flyer_thumb_key ? null : render(event, { surface: 'page' });
  return {
    ok: true,
    current: event.flyer_template || null,
    auto: { id: auto.id, name: auto.name },
    templates: Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name, blurb: t.blurb })),
    svg: result ? result.svg : null,
    // The contour template's real terrain, owner request: only offered
    // for a disclosed venue, same rule the template itself follows.
    canFetchTerrain: !event.location_tba && Boolean(event.venue_name || event.venue_address),
    terrainFetched: Boolean(event.elevation_grid),
  };
}

/**
 * POST /api/crew/events/:id/flyer. Read-only: current pick, auto choice,
 * preview, and the template list to build a dropdown from.
 */
export async function handleCrewEventFlyer(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  return jsonResponse(flyerPayload(event));
}

/**
 * POST /api/crew/events/:id/flyer-template. Applied directly regardless
 * of trust level, unlike other edits: it only changes which of the ten
 * approved templates draws the same factual data, never the facts
 * themselves, so it carries none of the risk the review queue exists for.
 */
export async function handleCrewEventFlyerTemplate(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  const value = TEMPLATES[body.template] ? body.template : null;
  await env.DB.prepare('UPDATE events SET flyer_template = ? WHERE id = ?').bind(value, id).run();

  return jsonResponse(flyerPayload({ ...event, flyer_template: value }));
}

/**
 * POST /api/crew/events/:id/reroll-flyer. Section 13: the only way a
 * generated flyer changes appearance without a data or engine change.
 */
export async function handleCrewEventRerollFlyer(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  const nextSalt = (event.seed_salt || 0) + 1;
  await env.DB.prepare('UPDATE events SET seed_salt = ? WHERE id = ?').bind(nextSalt, id).run();

  return jsonResponse(flyerPayload({ ...event, seed_salt: nextSalt }));
}

/**
 * POST /api/crew/events/:id/fetch-terrain. Geocodes the venue and fetches
 * its real elevation grid once, for the contour template. Never for a
 * location_tba event. Best-effort: fetchRealTerrain never throws, a
 * failed lookup just leaves the columns as they were.
 */
export async function handleCrewEventFetchTerrain(request, env, id) {
  const body = await readJson(request);
  const crew = await requireCrew(request, env, body);
  if (!crew) return jsonResponse({ ok: false, error: 'Not signed in.' }, 401);

  const event = await ownedEvent(env, crew, id);
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);
  if (event.location_tba) return jsonResponse({ ok: false, error: 'Location is TBA for this event.' }, 400);

  const terrain = await fetchRealTerrain(event.venue_name, event.venue_address);
  if (!terrain) return jsonResponse({ ok: false, error: 'Could not find that venue. Try a more specific address.' }, 422);

  const gridJson = JSON.stringify(terrain.grid);
  await env.DB.prepare('UPDATE events SET venue_lat = ?, venue_lng = ?, elevation_grid = ? WHERE id = ?')
    .bind(terrain.lat, terrain.lng, gridJson, id).run();

  return jsonResponse(flyerPayload({ ...event, elevation_grid: gridJson }));
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
         lineup = ?, ticket_url = ?, notes = ?, age_restriction = ?, sequence = ${sequenceBump},
         updated_at = ? WHERE id = ?`,
    ).bind(
      fields.title, fields.start_at, fields.end_at, fields.venue_name, fields.venue_address, fields.genres,
      fields.lineup, fields.ticket_url, fields.notes, fields.age_restriction, now, id,
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
