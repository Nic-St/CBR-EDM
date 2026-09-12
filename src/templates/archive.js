import { html } from '../lib/escape.js';
import { eventCard } from './eventCard.js';

/**
 * /archive: a list of years that have past events, section 6.
 * @param {number[]} years - descending
 */
export function archiveIndex(years) {
  return html`
    <h1>Archive</h1>
    ${years.length
      ? html`<ul class="link-list">${years.map((year) => html`<li><a href="/archive/${year}">${year}</a></li>`)}</ul>`
      : html`<p>No past events yet.</p>`}
  `;
}

/**
 * /archive/:year: every past published event that started in that year,
 * most recent first, section 6.
 * @param {number} year
 * @param {object[]} events
 * @param {Date} [now]
 */
export function archiveYear(year, events, now = new Date()) {
  const sorted = [...events].sort((a, b) => new Date(b.start_at || 0) - new Date(a.start_at || 0));
  return html`
    <h1>Archive: ${year}</h1>
    ${sorted.length
      ? html`<ul class="card-list">${sorted.map((event) => eventCard(event, now))}</ul>`
      : html`<p>No events found for ${year}.</p>`}
    <p><a href="/archive">All years</a></p>
  `;
}
