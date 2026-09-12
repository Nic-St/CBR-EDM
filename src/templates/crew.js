import { html } from '../lib/escape.js';

const FIELD_DEFS = [
  ['title', 'Title', 'text'],
  ['start_at_local', 'Start (Canberra time)', 'datetime-local'],
  ['end_at_local', 'End (Canberra time, leave blank for "til late")', 'datetime-local'],
  ['venue_name', 'Venue name', 'text'],
  ['venue_address', 'Venue address', 'text'],
  ['genres', 'Genre', 'text'],
  ['lineup', 'Lineup (one act per line)', 'textarea'],
  ['ticket_url', 'Ticket URL', 'url'],
  ['notes', 'Anything else worth knowing', 'textarea'],
];

/**
 * GET /crew. Section 9.3: the crew pastes their key, kept in
 * sessionStorage for the tab session only, never sent anywhere except
 * this site's own API.
 * @param {string} turnstileSiteKey
 */
export function crewDashboardPage(turnstileSiteKey) {
  return html`
    <h1>Crew dashboard</h1>

    <form data-crew-login>
      <div class="field">
        <label for="crew-key">Crew key</label>
        <input type="password" id="crew-key" name="key" autocomplete="off">
      </div>
      <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}"></div>
      <button type="submit">Sign in</button>
      <p data-login-status role="status"></p>
      <noscript><p class="error">The crew dashboard needs JavaScript, since your key is never sent as part of a normal page load.</p></noscript>
    </form>

    <div data-crew-area hidden>
      <p data-crew-greeting></p>
      <button type="button" data-crew-signout class="secondary">Sign out</button>

      <div data-crew-profile hidden>
        <h2>Your crew profile</h2>
        <div class="field">
          <label for="crew-blurb">Blurb</label>
          <textarea id="crew-blurb" data-profile-field="blurb"></textarea>
        </div>
        <div class="field">
          <label for="crew-links">Links (one per line, as "label, url")</label>
          <textarea id="crew-links" data-profile-field="links"></textarea>
        </div>
        <button type="button" data-crew-save-profile>Save profile</button>
        <p data-crew-profile-status role="status"></p>
      </div>

      <h2>Your events</h2>
      <ul class="link-list" data-crew-event-list></ul>

      <h2>Add an event</h2>
      ${eventFieldsMarkup('create')}
      ${flyerPickerMarkup('create', { withReroll: false })}
      <button type="button" data-crew-create>Add event</button>
      <p data-crew-create-status role="status"></p>
    </div>

    <div data-crew-edit hidden>
      <h2>Edit event</h2>
      ${eventFieldsMarkup('edit')}
      <div class="actions">
        <button type="button" data-crew-save>Save</button>
        <button type="button" data-crew-status-btn="cancelled" class="secondary">Mark cancelled</button>
        <button type="button" data-crew-status-btn="sold_out" class="secondary">Mark sold out</button>
        <button type="button" data-crew-status-btn="postponed" class="secondary">Mark postponed</button>
        <button type="button" data-crew-unpublish class="danger">Unpublish</button>
      </div>
      <p data-crew-edit-status role="status"></p>

      ${flyerPickerMarkup('edit', { withReroll: true })}
    </div>
  `;
}

/**
 * Shared markup for the "add" and "edit" flyer pickers, section 13.
 * Fields are id-prefixed by scope so both can exist in the DOM at once
 * without duplicate ids; behaviour is selected by data-scope in
 * crew-dashboard.js.
 * @param {'create'|'edit'} scope
 * @param {{ withReroll: boolean }} options - the create picker has
 *   nothing to reroll yet, since there's no saved event or seed_salt
 */
function flyerPickerMarkup(scope, { withReroll }) {
  return html`<div data-crew-flyer data-scope="${scope}" hidden>
    <h3>Generated flyer</h3>
    <p class="muted">Only shown while there is no uploaded flyer.</p>
    <img data-crew-flyer-preview alt="Generated flyer preview" style="max-width: 300px; display: block;">
    <div class="field">
      <label for="${scope}-flyer-template">Template</label>
      <select id="${scope}-flyer-template" data-crew-flyer-template></select>
    </div>
    ${withReroll ? html`<button type="button" data-crew-flyer-reroll class="secondary">Reroll (new random variation)</button>` : ''}
    ${withReroll
      ? html`<button type="button" data-crew-flyer-fetch-terrain class="secondary" hidden>Fetch real terrain (for the contour map template)</button>`
      : ''}
    <p data-crew-flyer-status role="status"></p>
  </div>`;
}

function eventFieldsMarkup(scope) {
  return html`<div data-scope="${scope}">
    ${FIELD_DEFS.map(([name, label, type]) => html`<div class="field">
      <label for="${scope}-${name}">${label}</label>
      ${type === 'textarea'
        ? html`<textarea id="${scope}-${name}" data-field="${name}"></textarea>`
        : type === 'url'
          ? html`<input type="text" inputmode="url" id="${scope}-${name}" data-field="${name}">`
          : html`<input type="${type}" id="${scope}-${name}" data-field="${name}">`}
    </div>`)}
  </div>`;
}
