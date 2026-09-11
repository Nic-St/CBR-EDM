import { html } from '../lib/escape.js';

/**
 * GET /contact. Section 10.4: message is the only required field on the
 * whole site.
 * @param {string} turnstileSiteKey
 * @param {string|null} eventId - pre-filled when linked from "Something wrong with this listing?"
 */
export function contactFormPage(turnstileSiteKey, eventId) {
  return html`
    <h1>Get in touch</h1>
    <p>Messages go to whoever runs the site. We don't publish anything you send here.</p>

    <form data-contact-form action="/api/contact" method="post">
      ${eventId ? html`<input type="hidden" name="event_id" value="${eventId}">` : ''}
      <div class="field">
        <label for="name">Name (optional)</label>
        <input type="text" id="name" name="name">
      </div>
      <div class="field">
        <label for="reply_contact">How to reply (optional, private)</label>
        <input type="text" id="reply_contact" name="reply_contact">
      </div>
      <div class="field">
        <label for="message">Message</label>
        <textarea id="message" name="message" required></textarea>
      </div>
      <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}"></div>
      <button type="submit">Send message</button>
      <p data-contact-status role="status"></p>
      <noscript><p class="error">This form needs JavaScript, since it checks you are not a robot.</p></noscript>
    </form>
  `;
}

export function contactConfirmationPage() {
  return html`<h1>Message sent</h1><p>Thanks, someone will get back to you if needed.</p>`;
}
