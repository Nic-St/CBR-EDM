import { html } from '../lib/escape.js';

const FIELD_DEFS = [
  ['title', 'Title', 'text'],
  ['presented_by', 'Presented by', 'text'],
  ['start_at_local', 'Start (Canberra time)', 'datetime-local'],
  ['end_at_local', 'End (Canberra time, leave blank for "til late")', 'datetime-local'],
  ['venue_name', 'Venue name', 'text'],
  ['venue_address', 'Venue address', 'text'],
  ['genres', 'Genre', 'text'],
  ['price_text', 'Price', 'text'],
  ['lineup', 'Lineup (one act per line)', 'textarea'],
  ['ticket_url', 'Ticket URL', 'url'],
  ['notes', 'Anything else worth knowing', 'textarea'],
];

/**
 * GET /submit. Section 9.1: no field is required. The private contact
 * field sits visually apart from the public fields.
 * @param {string} turnstileSiteKey
 */
export function submitFormPage(turnstileSiteKey) {
  return html`
    <h1>Put an event on the wall</h1>
    <p>Share as much or as little as you like. Nothing here is required.</p>

    <form data-submit-form action="/api/submissions" method="post">
      ${FIELD_DEFS.map(([name, label, type]) => html`<div class="field">
        <label for="${name}">${label}</label>
        ${type === 'textarea'
          ? html`<textarea id="${name}" name="${name}"></textarea>`
          : html`<input type="${type}" id="${name}" name="${name}">`}
      </div>`)}

      <div class="field">
        <label><input type="checkbox" name="location_tba" value="1" data-tba-toggle> Location TBA</label>
      </div>
      <div class="field" data-tba-fields hidden>
        <label for="location_reveal_at">When will the location be announced?</label>
        <input type="text" id="location_reveal_at" name="location_reveal_at">
        <label for="location_how_to_find">How will people find out?</label>
        <input type="text" id="location_how_to_find" name="location_how_to_find">
      </div>

      <div class="field">
        <label for="age_restriction">Age restriction</label>
        <select id="age_restriction" name="age_restriction">
          <option value="unknown" selected>Not sure / not set</option>
          <option value="18+">18+</option>
          <option value="all_ages">All ages</option>
        </select>
      </div>

      <div class="field">
        <label for="flyer-file">Flyer image</label>
        <input type="file" id="flyer-file" name="flyer" accept="image/*">
      </div>

      <details class="field">
        <summary>Got a crew key?</summary>
        <label for="crew_key">Crew key</label>
        <input type="password" id="crew_key" name="crew_key" autocomplete="off">
        <p class="muted">If your crew is trusted, this publishes the event straight away.</p>
      </details>

      <div class="field" style="border-top: 2px solid var(--border); padding-top: 1rem;">
        <label for="submitter_contact">Your contact details (optional)</label>
        <input type="text" id="submitter_contact" name="submitter_contact">
        <p class="muted">Optional. Only the site admin sees this. It is never published.</p>
      </div>

      <p class="muted">
        What you fill in above (except your contact details) is published on the site.
        Your contact details, if you give them, are seen only by the admin, so they can
        reach you about this listing. You can ask for anything to be removed later.
      </p>

      <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}"></div>

      <button type="submit">Put it on the wall</button>
      <p data-submit-status role="status"></p>
      <noscript><p class="error">This form needs JavaScript, since it checks you are not a robot and resizes your flyer image before it uploads.</p></noscript>
    </form>
  `;
}

/**
 * The confirmation page shown once, section 9.2. JavaScript reads the edit
 * token from the URL fragment so it never reaches the server.
 */
export function submitConfirmationPage() {
  return html`
    <h1>On the wall</h1>
    <p>Thanks. Your event is in the queue for the admin to check.</p>
    <div data-edit-link-holder hidden>
      <p><strong>Save this link. It is the only way to change or cancel your listing.</strong></p>
      <p>Anyone with the link can suggest changes, so do not post it publicly.</p>
      <p><input type="text" readonly data-edit-link-value style="width: 100%;"></p>
      <button type="button" data-copy-edit-link>Copy link</button>
      <p data-copy-status role="status"></p>
    </div>
    <noscript><p class="error">Your private edit link could not be shown because JavaScript is off. Please contact the admin if you need to change this listing.</p></noscript>
  `;
}
