import { html, raw } from '../lib/escape.js';
import { formatEventDateTime, isEventPast } from '../lib/dates.js';
import { stampFor, venueTextFor, lineupPreview } from '../lib/eventDisplay.js';
import { config } from '../config.js';
import { render as renderFlyer } from '../flyers/index.js';

/**
 * Renders one event as a paper scrap, for the board and the archive.
 * Section 8.1: fields are shown when present, omitted cleanly when empty.
 * @param {object} event - a row from the events table
 * @param {Date} [now]
 */
export function eventCard(event, now = new Date()) {
  const isPast = isEventPast(event, now);
  const dateText = formatEventDateTime(event.start_at, event.end_at, { includeYear: isPast });
  const stamp = stampFor(event, isPast, now);
  const venueText = venueTextFor(event);
  const { acts, hasMore } = lineupPreview(event.lineup);
  const presentedBy = event.crew_slug
    ? html`<a href="/crews/${event.crew_slug}">${event.crew_name}</a>`
    : (event.crew_name || event.presented_by);

  // Every flyer is generated, owner request: uploads are gone, so this is
  // the only flyer a card ever has.
  const flyer = renderFlyer(event, { surface: 'scrap', now });

  return html`<li>
    <article class="scrap${isPast ? ' scrap--past' : ''}">
      <span class="scrap-tape" aria-hidden="true"></span>
      ${flyer ? html`<div class="generated-flyer">${raw(flyer.svg)}</div>` : ''}
      <h3 class="scrap-title"><a href="/e/${event.slug}">${event.title || 'Untitled event'}</a></h3>
      ${presentedBy ? html`<p class="scrap-meta">${presentedBy}</p>` : ''}
      ${dateText ? html`<p class="scrap-meta">${dateText}</p>` : ''}
      ${venueText ? html`<p class="scrap-meta">${venueText}</p>` : ''}
      ${event.genres ? html`<p class="scrap-meta">${event.genres}</p>` : ''}
      ${acts.length
        ? html`<p class="scrap-meta">${acts.join(', ')}${hasMore ? html` and more` : ''}</p>`
        : ''}
      ${event.ticket_url
        ? html`<p class="scrap-meta"><a href="/go/${event.id}">Tickets</a></p>`
        : ''}
      ${event.age_restriction === '18+' ? html`<p class="scrap-meta">18+</p>` : ''}
      ${stamp ? html`<p class="stamp">${stamp}</p>` : ''}
      <p class="scrap-meta"><a href="/look-after-each-other">${config.harmReductionTitle}</a></p>
    </article>
  </li>`;
}
