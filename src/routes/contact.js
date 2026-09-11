import { layout } from '../templates/layout.js';
import { contactFormPage, contactConfirmationPage } from '../templates/contact.js';
import { verifyTurnstile } from '../lib/turnstile.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { recordCount } from '../lib/analytics.js';
import { sendAdminAlert } from '../lib/email.js';
import { generateId } from '../lib/ids.js';

const TURNSTILE_SCRIPT = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>';

export async function handleContactForm(request, env) {
  const eventId = new URL(request.url).searchParams.get('event');
  const body = contactFormPage(env.TURNSTILE_SITE_KEY, eventId);
  const page = String(layout({ title: 'Get in touch', bodyContent: body, extraHead: TURNSTILE_SCRIPT }));
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}

export async function handleContactSent(request, env) {
  const page = String(layout({ title: 'Message sent', bodyContent: contactConfirmationPage() }));
  return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /api/contact. Section 10.4: message is the only required field on
 * the site.
 */
export async function handleContactApi(request, env) {
  const allowed = await checkRateLimit(request, env, 'contact', 20);
  if (!allowed) return jsonResponse({ ok: false, error: 'Too many messages from this connection today. Try again tomorrow.' }, 429);

  const formData = await request.formData();

  const turnstileOk = await verifyTurnstile(
    formData.get('cf-turnstile-response'), env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP'),
  );
  if (!turnstileOk) return jsonResponse({ ok: false, error: 'That check did not pass. Please try again.' }, 400);

  const message = (formData.get('message') || '').trim();
  if (!message) return jsonResponse({ ok: false, error: 'Message is required.' }, 400);
  if (message.length > 4000) return jsonResponse({ ok: false, error: 'That message is too long.' }, 400);

  const name = (formData.get('name') || '').slice(0, 200) || null;
  const replyContact = (formData.get('reply_contact') || '').slice(0, 300) || null;
  const eventId = formData.get('event_id') || null;

  const id = generateId('msg');
  await env.DB.prepare(
    'INSERT INTO contact_messages (id, created_at, name, reply_contact, message, event_id, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, new Date().toISOString(), name, replyContact, message, eventId, 'new').run();

  await recordCount(env, 'contact_message');

  await sendAdminAlert(env, {
    subject: 'New contact message',
    path: new URL('/admin', request.url).toString(),
    summary: 'A new contact message arrived. Check the queue to read it.',
  });

  return jsonResponse({ ok: true });
}
