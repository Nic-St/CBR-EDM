import { html } from '../../lib/escape.js';

const LABELS = {
  edit: 'Proposed edit',
  cancel_request: 'Cancellation request',
  removal_request: 'Removal request',
};

const COMPARE_FIELDS = [
  'title', 'start_at', 'end_at', 'venue_name', 'venue_address', 'genres',
  'lineup', 'ticket_url', 'notes', 'age_restriction', 'status',
];

/**
 * GET /admin/changes. Section 10.2: pending changes and requests, with a
 * clear before/after comparison for edits.
 * @param {object[]} changes - event_changes rows joined with event title/slug
 */
export function changeListPage(changes) {
  return html`
    <h1>Pending changes and requests</h1>
    ${changes.length ? '' : html`<p class="muted">Nothing pending.</p>`}
    ${changes.map((change) => html`<div style="border-bottom: 2px solid var(--border); padding-bottom: 1rem; margin-bottom: 1rem;">
      <h2>${LABELS[change.kind] || change.kind}: ${change.event_title || 'Untitled'}</h2>
      <p class="muted">Via ${change.via}, ${change.created_at.slice(0, 10)}</p>
      ${change.reason ? html`<p>Reason given: ${change.reason}</p>` : ''}
      ${change.kind === 'edit' ? renderComparison(change) : ''}
      <div class="actions">
        <form method="post" action="/admin/changes/${change.id}/approve"><button type="submit">Approve</button></form>
        <form method="post" action="/admin/changes/${change.id}/reject"><button type="submit" class="secondary">Reject</button></form>
        <a href="/admin/events/${change.event_id}/edit" class="button secondary">View event</a>
      </div>
    </div>`)}
  `;
}

function renderComparison(change) {
  let proposed;
  try {
    proposed = JSON.parse(change.proposed_json || '{}');
  } catch {
    proposed = {};
  }

  return html`<table>
    <thead><tr><th>Field</th><th>Current</th><th>Proposed</th></tr></thead>
    <tbody>
      ${COMPARE_FIELDS.filter((field) => field in proposed).map((field) => html`<tr>
        <td>${field}</td>
        <td>${change[`current_${field}`] ?? ''}</td>
        <td>${proposed[field] ?? ''}</td>
      </tr>`)}
    </tbody>
  </table>`;
}
