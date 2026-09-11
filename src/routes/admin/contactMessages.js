import { adminLayout } from '../../templates/admin/layout.js';
import { html } from '../../lib/escape.js';
import { notFound } from '../../lib/http.js';

function page(admin, body) {
  return new Response(String(adminLayout({ title: 'Contact messages', bodyContent: body, email: admin.email })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleContactMessageList(request, env, admin) {
  const { results } = await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();

  const body = html`
    <h1>Contact messages</h1>
    ${results.length ? '' : html`<p class="muted">Nothing here yet.</p>`}
    ${results.map((msg) => html`<div style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
      <p class="muted">${msg.created_at.slice(0, 10)}${msg.state === 'done' ? html` (done)` : ''}</p>
      ${msg.name ? html`<p><strong>${msg.name}</strong></p>` : ''}
      ${msg.reply_contact ? html`<p>Reply to: ${msg.reply_contact}</p>` : ''}
      <p>${msg.message}</p>
      ${msg.event_id ? html`<p><a href="/admin/events/${msg.event_id}/edit">Related event</a></p>` : ''}
      ${msg.state !== 'done'
        ? html`<form method="post" action="/admin/contact-messages/${msg.id}/done"><button type="submit">Mark done</button></form>`
        : ''}
    </div>`)}
  `;

  return page(admin, body);
}

export async function handleContactMessageMarkDone(request, env, admin, id) {
  const msg = await env.DB.prepare('SELECT id FROM contact_messages WHERE id = ?').bind(id).first();
  if (!msg) return notFound();

  await env.DB.prepare("UPDATE contact_messages SET state = 'done' WHERE id = ?").bind(id).run();
  return Response.redirect(new URL('/admin/contact-messages', request.url), 303);
}
