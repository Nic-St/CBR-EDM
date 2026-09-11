import { html, raw } from '../../lib/escape.js';

/**
 * GET /admin/events. List with search by title, section 10.2.
 * @param {object[]} events
 * @param {string} query - current search text
 */
export function eventListPage(events, query) {
  return html`
    <h1>Events</h1>
    <form method="get" class="field">
      <label for="q">Search by title</label>
      <input type="search" id="q" name="q" value="${query || ''}">
      <button type="submit">Search</button>
    </form>
    <p><a href="/admin/events/new" class="button">Add an event</a></p>
    <table>
      <thead>
        <tr><th>Title</th><th>Start</th><th>Visibility</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        ${events.map((event) => html`<tr>
          <td>${event.title || 'Untitled'}</td>
          <td>${event.start_at ? event.start_at.slice(0, 10) : '-'}</td>
          <td>${event.visibility}</td>
          <td>${event.status}</td>
          <td><a href="/admin/events/${event.id}/edit">Edit</a></td>
        </tr>`)}
      </tbody>
    </table>
  `;
}

const FIELD_DEFS = [
  ['title', 'Title', 'text'],
  ['presented_by', 'Presented by (free text, leave blank if using the crew field below)', 'text'],
  ['start_at_local', 'Start (Canberra time)', 'datetime-local'],
  ['end_at_local', 'End (Canberra time, leave blank for "til late")', 'datetime-local'],
  ['venue_name', 'Venue name', 'text'],
  ['venue_address', 'Venue address', 'text'],
  ['location_reveal_at', 'Location reveal date (if TBA)', 'text'],
  ['location_how_to_find', 'How people will find out (if TBA)', 'text'],
  ['genres', 'Genre', 'text'],
  ['price_text', 'Price', 'text'],
  ['lineup', 'Lineup (one act per line)', 'textarea'],
  ['ticket_url', 'Ticket URL', 'url'],
  ['notes', 'Notes (event page only)', 'textarea'],
];

/**
 * GET/POST /admin/events/new and /admin/events/:id/edit. Section 10.2.
 * @param {object} event - existing event row, or an empty object for a new one
 * @param {object[]} crews - for the crew picker
 * @param {{ errors?: string[] }} [options]
 */
export function eventFormPage(event, crews, options = {}) {
  const isNew = !event.id;
  const action = isNew ? '/admin/events/new' : `/admin/events/${event.id}/edit`;

  return html`
    <h1>${isNew ? 'Add an event' : `Edit: ${event.title || 'Untitled'}`}</h1>
    ${event.submitter_contact
      ? html`<p class="error">Submitter contact (private, never published): ${event.submitter_contact}</p>`
      : ''}
    ${options.errors?.length
      ? html`<ul class="field-error">${options.errors.map((error) => html`<li>${error}</li>`)}</ul>`
      : ''}
    <form method="post" action="${action}">
      ${FIELD_DEFS.map(([name, label, type]) => html`<div class="field">
        <label for="${name}">${label}</label>
        ${type === 'textarea'
          ? html`<textarea id="${name}" name="${name}">${event[name] || ''}</textarea>`
          : html`<input type="${type}" id="${name}" name="${name}" value="${event[name] || ''}">`}
      </div>`)}

      <div class="field">
        <label for="crew_id">Crew</label>
        <select id="crew_id" name="crew_id">
          <option value="">None (use presented by, above)</option>
          ${crews.map((crew) => html`<option value="${crew.id}" ${crew.id === event.crew_id ? raw('selected') : ''}>${crew.name}</option>`)}
        </select>
      </div>

      <div class="field">
        <label><input type="checkbox" name="location_tba" value="1" ${event.location_tba ? raw('checked') : ''}> Location TBA</label>
      </div>

      <div class="field">
        <label for="age_restriction">Age restriction</label>
        <select id="age_restriction" name="age_restriction">
          ${['unknown', '18+', 'all_ages'].map((value) => html`<option value="${value}" ${event.age_restriction === value ? raw('selected') : ''}>${value}</option>`)}
        </select>
      </div>

      <div class="field">
        <label for="status">Status</label>
        <select id="status" name="status">
          ${['on', 'cancelled', 'sold_out', 'postponed'].map((value) => html`<option value="${value}" ${event.status === value ? raw('selected') : ''}>${value}</option>`)}
        </select>
      </div>

      <button type="submit">Save</button>
    </form>

    ${!isNew ? adminEventActions(event) : ''}
  `;
}

function adminEventActions(event) {
  return html`
    <h2>Flyer</h2>
    ${event.flyer_thumb_key ? html`<img src="/img/${event.flyer_thumb_key}" alt="Current flyer" width="200">` : html`<p class="muted">No flyer uploaded.</p>`}
    <form data-flyer-upload action="/admin/api/events/${event.id}/flyer" method="post" enctype="multipart/form-data">
      <div class="field">
        <label for="flyer-file">Upload a flyer image</label>
        <input type="file" id="flyer-file" name="file" accept="image/*">
      </div>
      <button type="submit">Upload flyer</button>
      <p data-flyer-status role="status"></p>
      <noscript><p class="error">Flyer upload needs JavaScript, since the image is resized in your browser before it uploads.</p></noscript>
    </form>

    <h2>Edit link</h2>
    ${event.newEditLink
      ? html`<p class="error">New edit link (shown once, copy it now): <code>${event.newEditLink}</code></p>`
      : ''}
    <div class="actions">
      <form method="post" action="/admin/events/${event.id}/reissue-edit-link">
        <button type="submit">${event.edit_token_hash ? 'Issue a new edit link' : 'Issue an edit link'}</button>
      </form>
      ${event.edit_token_hash
        ? html`<form method="post" action="/admin/events/${event.id}/revoke-edit-link" data-confirm="Revoke this event's edit link? The submitter will no longer be able to use it."><button type="submit" class="secondary">Revoke edit link</button></form>`
        : ''}
    </div>

    <h2>Actions</h2>
    <div class="actions">
      ${event.visibility === 'pending'
        ? html`<form method="post" action="/admin/events/${event.id}/publish"><button type="submit">Publish</button></form>
               <form method="post" action="/admin/events/${event.id}/reject"><button type="submit" class="secondary">Reject</button></form>`
        : ''}
      ${event.visibility === 'published'
        ? html`<form method="post" action="/admin/events/${event.id}/remove"><button type="submit" class="secondary">Unpublish</button></form>`
        : ''}
      ${event.visibility === 'removed' || event.visibility === 'rejected'
        ? html`<form method="post" action="/admin/events/${event.id}/restore"><button type="submit">Restore to published</button></form>`
        : ''}
      <form method="post" action="/admin/events/${event.id}/delete" data-confirm="Permanently delete this event and its images? This cannot be undone.">
        <button type="submit" class="danger">Delete permanently</button>
      </form>
    </div>
  `;
}
