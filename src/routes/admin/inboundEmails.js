import { adminLayout } from '../../templates/admin/layout.js';
import { inboundEmailListPage, inboundEmailViewPage } from '../../templates/admin/inboundEmails.js';
import { generateId, eventSlugFor } from '../../lib/ids.js';
import { notFound } from '../../lib/http.js';

function page(admin, title, body) {
  return new Response(String(adminLayout({ title, bodyContent: body, email: admin.email })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleInboundEmailList(request, env, admin) {
  const { results } = await env.DB.prepare('SELECT * FROM inbound_emails ORDER BY received_at DESC').all();
  return page(admin, 'Inbound emails', inboundEmailListPage(results));
}

export async function handleInboundEmailView(request, env, admin, id) {
  const emailRow = await env.DB.prepare('SELECT * FROM inbound_emails WHERE id = ?').bind(id).first();
  if (!emailRow) return notFound();
  return page(admin, emailRow.subject || 'Inbound email', inboundEmailViewPage(emailRow));
}

/**
 * GET /admin/api/inbound-emails/:id/attachments/:index. Section 10.5:
 * attachments are stored raw in R2 but never served publicly; this route
 * is admin-only (gated by the admin router itself).
 */
export async function handleInboundEmailAttachment(request, env, id, index) {
  const emailRow = await env.DB.prepare('SELECT attachments_json FROM inbound_emails WHERE id = ?').bind(id).first();
  if (!emailRow) return notFound();

  const attachments = JSON.parse(emailRow.attachments_json || '[]');
  const attachment = attachments[Number(index)];
  if (!attachment) return new Response('Not found', { status: 404 });

  const object = await env.FLYERS.get(attachment.r2_key);
  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: { 'Content-Type': attachment.content_type, 'Cache-Control': 'no-store' },
  });
}

export async function handleInboundEmailDismiss(request, env, admin, id) {
  const emailRow = await env.DB.prepare('SELECT id FROM inbound_emails WHERE id = ?').bind(id).first();
  if (!emailRow) return notFound();

  await env.DB.prepare("UPDATE inbound_emails SET state = 'dismissed' WHERE id = ?").bind(id).run();
  return Response.redirect(new URL('/admin/inbound-emails', request.url), 303);
}

/**
 * POST /admin/inbound-emails/:id/convert. Section 10.6: opens the event
 * form pre-filled (subject as title). The first image attachment, if any,
 * can then be pulled in as the flyer from the event edit page, running
 * through the same browser resize pipeline as any other upload.
 */
export async function handleInboundEmailConvert(request, env, admin, id) {
  const emailRow = await env.DB.prepare('SELECT * FROM inbound_emails WHERE id = ?').bind(id).first();
  if (!emailRow) return notFound();

  const now = new Date().toISOString();
  const eventId = generateId('evt');
  const slug = eventSlugFor(emailRow.subject, null);
  const notes = `Converted from an email sent by ${emailRow.from_address}.`;

  await env.DB.prepare(
    `INSERT INTO events (id, slug, title, notes, age_restriction, status, visibility, source, sequence, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'unknown', 'on', 'pending', 'admin', 0, ?, ?)`,
  ).bind(eventId, slug, emailRow.subject || null, notes, now, now).run();

  await env.DB.prepare("UPDATE inbound_emails SET state = 'converted', event_id = ? WHERE id = ?")
    .bind(eventId, id).run();

  const attachments = JSON.parse(emailRow.attachments_json || '[]');
  const redirectUrl = new URL(`/admin/events/${eventId}/edit`, request.url);
  if (attachments.length) redirectUrl.searchParams.set('from_email', id);

  return Response.redirect(redirectUrl, 303);
}
