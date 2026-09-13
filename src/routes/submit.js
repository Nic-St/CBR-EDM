import { layout } from '../templates/layout.js';
import { submitFormPage, submitConfirmationPage } from '../templates/submit.js';
import { readEventFields, validateEventFields } from '../lib/eventFields.js';
import { validateFlyerUpload, MAX_LARGE_BYTES, MAX_THUMB_BYTES } from '../lib/imagePipeline.js';
import { generateId, eventSlugFor } from '../lib/ids.js';
import { generateToken, hashToken } from '../lib/tokens.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { sendAdminAlert } from '../lib/email.js';

const TURNSTILE_SCRIPT = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';

export async function handleSubmitForm(request, env) {
  const body = submitFormPage(env.TURNSTILE_SITE_KEY);
  const page = String(layout({ title: 'Submit an event', bodyContent: body, extraHead: TURNSTILE_SCRIPT }));
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}

export async function handleSubmitConfirmation(request, env) {
  const body = submitConfirmationPage();
  const page = String(layout({ title: 'On the wall', bodyContent: body }));
  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /api/submissions. Section 9.1, 9.3 (crew key does the same as the
 * dashboard for a single event) and 9.4 (wrong crew keys are rate limited).
 */
export async function handleSubmissionApi(request, env) {
  const allowed = await checkRateLimit(request, env, 'submit', 20);
  if (!allowed) return jsonResponse({ ok: false, error: 'Too many submissions from this connection today. Try again tomorrow.' }, 429);

  const formData = await request.formData();

  const turnstileOk = await verifyTurnstile(
    formData.get('cf-turnstile-response'), env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'),
  );
  if (!turnstileOk) return jsonResponse({ ok: false, error: 'That check did not pass. Please try again.' }, 400);

  const fields = readEventFields(formData);
  const errors = validateEventFields(fields);
  if (errors.length) return jsonResponse({ ok: false, error: errors[0] }, 400);

  const submitterContact = (formData.get('submitter_contact') || '').slice(0, 300) || null;
  const crewKey = formData.get('crew_key');

  let crew = null;
  if (crewKey) {
    const crewKeyAllowed = await checkRateLimit(request, env, 'crew_key', 10);
    if (!crewKeyAllowed) return jsonResponse({ ok: false, error: 'Too many crew key attempts today. Try again tomorrow.' }, 429);

    const keyHash = await hashToken(crewKey);
    crew = await env.DB.prepare('SELECT * FROM crews WHERE key_hash = ?').bind(keyHash).first();
    if (!crew) return jsonResponse({ ok: false, error: 'That crew key is not recognised.' }, 400);
  }

  let flyerKey = null;
  let flyerThumbKey = null;
  const largeFile = formData.get('flyer_large');
  if (largeFile && typeof largeFile.arrayBuffer === 'function') {
    const large = await validateFlyerUpload(largeFile, MAX_LARGE_BYTES);
    const thumb = await validateFlyerUpload(formData.get('flyer_thumb'), MAX_THUMB_BYTES);
    if (!large.ok) return jsonResponse({ ok: false, error: `Flyer: ${large.error}` }, 400);
    if (!thumb.ok) return jsonResponse({ ok: false, error: `Flyer thumbnail: ${thumb.error}` }, 400);

    flyerKey = `flyers/${generateId()}.webp`;
    flyerThumbKey = `flyers/${generateId()}.webp`;
    await Promise.all([
      env.FLYERS.put(flyerKey, large.buffer, { httpMetadata: { contentType: 'image/webp' } }),
      env.FLYERS.put(flyerThumbKey, thumb.buffer, { httpMetadata: { contentType: 'image/webp' } }),
    ]);
  }

  const now = new Date().toISOString();
  const id = generateId('evt');
  const slug = eventSlugFor(fields.title, fields.start_at);
  const source = crew ? 'crew' : 'public';
  const willPublish = crew?.trusted && fields.title && fields.start_at;
  const visibility = willPublish ? 'published' : 'pending';

  let editToken = null;
  let editTokenHash = null;
  if (!crew) {
    editToken = generateToken();
    editTokenHash = await hashToken(editToken);
  }

  await env.DB.prepare(
    `INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address,
       location_tba, location_reveal_at, location_how_to_find, genres, lineup, lineup_equal_billing, ticket_url, notes,
       flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact,
       edit_token_hash, sequence, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on', ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, slug, fields.title, crew?.id || null, fields.presented_by, fields.start_at, fields.end_at,
    fields.venue_name, fields.venue_address, fields.location_tba, fields.location_reveal_at,
    fields.location_how_to_find, fields.genres, fields.lineup, fields.lineup_equal_billing, fields.ticket_url,
    fields.notes, flyerKey, flyerThumbKey, fields.age_restriction, visibility, source, submitterContact,
    editTokenHash, willPublish ? 1 : 0, now, now, willPublish ? now : null,
  ).run();

  const adminUrl = new URL(`/admin/events/${id}/edit`, request.url).toString();
  await sendAdminAlert(env, {
    subject: crew
      ? `Crew ${willPublish ? 'publish' : 'submission'}: ${fields.title || 'untitled'}`
      : `New submission: ${fields.title || 'untitled'}`,
    path: adminUrl,
    summary: crew
      ? `${crew.name} ${willPublish ? 'published' : 'submitted'} "${fields.title || 'Untitled event'}".`
      : `A new public submission arrived: "${fields.title || 'Untitled event'}".`,
  });

  return jsonResponse({ ok: true, editToken: editToken || undefined });
}
