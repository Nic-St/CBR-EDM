import { html } from '../lib/escape.js';
import { formatEventDateTime, isEventPast } from '../lib/dates.js';
import { scrapShapeFor } from '../lib/scrapShape.js';
import { stampFor, venueTextFor } from '../lib/eventDisplay.js';
import { config } from '../config.js';

/**
 * The full event page /e/:slug. Section 8.3: everything on the card, plus
 * full lineup, full address, notes and full-size flyer.
 * @param {object} event
 * @param {Date} [now]
 */
export function eventPage(event, now = new Date()) {
  const isPast = isEventPast(event, now);
  const { rotationDeg, clipPath } = scrapShapeFor(event.id);
  const dateText = formatEventDateTime(event.start_at, event.end_at, { includeYear: isPast });
  const stamp = stampFor(event, isPast, now);
  const venueText = venueTextFor(event);
  const presentedBy = event.crew_name || event.presented_by;
  const lineupActs = (event.lineup || '').split('\n').map((line) => line.trim()).filter(Boolean);

  const body = html`
    <article class="scrap${isPast ? ' scrap--past' : ''}"
      style="transform: rotate(${rotationDeg.toFixed(2)}deg); clip-path: ${clipPath};">
      <span class="scrap-tape" aria-hidden="true"></span>
      ${event.flyer_key
        ? html`<img src="/img/${event.flyer_key}" alt="Flyer for ${event.title || 'this event'}${dateText ? `, ${dateText}` : ''}${venueText ? `, ${venueText}` : ''}" width="600">`
        : ''}
      <h1 class="scrap-title">${event.title || 'Untitled event'}</h1>
      ${presentedBy ? html`<p class="scrap-meta">${presentedBy}</p>` : ''}
      ${dateText ? html`<p class="scrap-meta">${dateText}</p>` : ''}
      ${venueText ? html`<p class="scrap-meta">${venueText}</p>` : ''}
      ${event.genres ? html`<p class="scrap-meta">${event.genres}</p>` : ''}
      ${event.price_text ? html`<p class="scrap-meta">${event.price_text}</p>` : ''}
      ${lineupActs.length
        ? html`<ul>${lineupActs.map((act) => html`<li>${act}</li>`)}</ul>`
        : ''}
      ${event.ticket_url ? html`<p><a href="/go/${event.id}">Tickets</a></p>` : ''}
      ${event.age_restriction === '18+' ? html`<p class="scrap-meta">18+</p>` : ''}
      ${stamp ? html`<p class="stamp">${stamp}</p>` : ''}
      ${event.notes ? html`<p>${event.notes}</p>` : ''}
      <p><a href="/e/${event.slug}.ics">Add to calendar</a></p>
      <p><a href="/contact?event=${event.id}">Something wrong with this listing?</a></p>
      <p class="scrap-meta"><a href="/look-after-each-other">${config.harmReductionTitle}</a></p>
    </article>
  `;

  return { body, dateText, venueText };
}

/**
 * Open Graph and Twitter card meta tags for an event page, section 8.3.
 * @param {object} event
 * @param {string} dateText
 */
export function eventOgTags(event, dateText) {
  const description = [dateText, event.venue_name].filter(Boolean).join(' - ');
  return html`
    <meta property="og:type" content="website">
    <meta property="og:title" content="${event.title || 'Untitled event'}">
    ${description ? html`<meta property="og:description" content="${description}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    ${event.flyer_key ? html`<meta property="og:image" content="/img/${event.flyer_key}">` : ''}
  `;
}
