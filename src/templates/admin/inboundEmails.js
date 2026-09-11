import { html } from '../../lib/escape.js';

/**
 * GET /admin/inbound-emails. Section 10.6.
 * @param {object[]} emails
 */
export function inboundEmailListPage(emails) {
  return html`
    <h1>Inbound emails</h1>
    ${emails.length ? '' : html`<p class="muted">Nothing here yet.</p>`}
    <table>
      <thead><tr><th>From</th><th>Subject</th><th>Received</th><th>State</th><th></th></tr></thead>
      <tbody>
        ${emails.map((email) => html`<tr>
          <td>${email.from_address}</td>
          <td>${email.subject || '(no subject)'}</td>
          <td>${email.received_at.slice(0, 10)}</td>
          <td>${email.state}</td>
          <td><a href="/admin/inbound-emails/${email.id}">View</a></td>
        </tr>`)}
      </tbody>
    </table>
  `;
}

/**
 * GET /admin/inbound-emails/:id. Section 10.6: plain text only, links in
 * the email are shown as text, never rendered as HTML or made clickable.
 * @param {object} email
 */
export function inboundEmailViewPage(email) {
  let attachments = [];
  try {
    attachments = JSON.parse(email.attachments_json || '[]');
  } catch {
    attachments = [];
  }

  return html`
    <h1>${email.subject || '(no subject)'}</h1>
    <p class="muted">From ${email.from_address}, received ${email.received_at.slice(0, 10)}</p>
    <pre style="white-space: pre-wrap; font-family: inherit; background: #fff; padding: 1rem; border: 1px solid var(--border);">${email.text_body || ''}</pre>

    ${attachments.length
      ? html`<h2>Attachments</h2>${attachments.map((attachment, index) => html`<p>
          <img src="/admin/api/inbound-emails/${email.id}/attachments/${index}" alt="${attachment.filename}" width="200">
        </p>`)}`
      : ''}

    ${email.state !== 'converted' && email.state !== 'dismissed'
      ? html`<div class="actions">
          <form method="post" action="/admin/inbound-emails/${email.id}/convert"><button type="submit">Convert to event</button></form>
          <form method="post" action="/admin/inbound-emails/${email.id}/dismiss"><button type="submit" class="secondary">Dismiss</button></form>
        </div>`
      : email.event_id
        ? html`<p><a href="/admin/events/${email.event_id}/edit">Go to the converted event</a></p>`
        : ''}
  `;
}
