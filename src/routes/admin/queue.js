import { adminLayout } from '../../templates/admin/layout.js';
import { html } from '../../lib/escape.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * GET /admin. The queue, section 10.2: newest first, with counts.
 */
export async function handleAdminQueue(request, env, admin) {
  const [pendingEvents, pendingChanges, newEmails, newMessages, staleLinks] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE visibility = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM event_changes WHERE state = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM inbound_emails WHERE state = 'new'").first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM contact_messages WHERE state = 'new'").first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM harm_reduction_links WHERE last_checked_at < ?')
      .bind(new Date(Date.now() - NINETY_DAYS_MS).toISOString()).first(),
  ]);

  const body = html`
    <h1>Queue</h1>
    ${staleLinks.n > 0
      ? html`<p class="error">${staleLinks.n} harm reduction link(s) have not been checked in over 90 days. <a href="/admin/harm-reduction">Review them</a>.</p>`
      : ''}
    <table>
      <tbody>
        <tr><td><a href="/admin/events?visibility=pending">Pending submissions</a></td><td>${pendingEvents.n}</td></tr>
        <tr><td><a href="/admin/changes">Pending changes and requests</a></td><td>${pendingChanges.n}</td></tr>
        <tr><td>New inbound emails</td><td>${newEmails.n}</td></tr>
        <tr><td><a href="/admin/contact-messages">New contact messages</a></td><td>${newMessages.n}</td></tr>
      </tbody>
    </table>
  `;

  return new Response(String(adminLayout({ title: 'Queue', bodyContent: body, email: admin.email })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
