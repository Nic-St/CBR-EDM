import { html } from '../lib/escape.js';
import { eventCard } from './eventCard.js';

/**
 * GET /crews. Section 16: all listed crews, alphabetical, each a small
 * paste-up with name, blurb and event count.
 * @param {object[]} crews - each with an eventCount
 */
export function crewsDirectoryPage(crews) {
  return html`
    <h1>Crews</h1>
    ${crews.length
      ? html`<ul>${crews.map((crew) => html`<li class="scrap" style="margin-bottom: 1rem;">
          <h2 class="scrap-title"><a href="/crews/${crew.slug}">${crew.name}</a></h2>
          ${crew.blurb ? html`<p class="scrap-meta">${crew.blurb}</p>` : ''}
          <p class="scrap-meta">${crew.eventCount} event${crew.eventCount === 1 ? '' : 's'}</p>
        </li>`)}</ul>`
      : html`<p class="muted">No crews listed yet.</p>`}
  `;
}

/**
 * GET /crews/:slug. Section 16: name, blurb, links, upcoming and full past
 * events.
 * @param {object} crew
 * @param {object[]} upcoming
 * @param {object[]} past
 */
export function crewProfilePage(crew, upcoming, past) {
  let links = [];
  try {
    links = JSON.parse(crew.links_json || '[]');
  } catch {
    links = [];
  }

  return html`
    <h1>${crew.name}</h1>
    ${crew.blurb ? html`<p>${crew.blurb}</p>` : ''}
    ${links.length
      ? html`<ul>${links.map((link) => html`<li><a href="${link.url}">${link.label}</a></li>`)}</ul>`
      : ''}

    <h2>Coming up</h2>
    ${upcoming.length
      ? html`<ul>${upcoming.map((event) => eventCard(event))}</ul>`
      : html`<p class="muted">Nothing coming up right now.</p>`}

    <h2>Been and gone</h2>
    ${past.length
      ? html`<ul>${past.map((event) => eventCard(event))}</ul>`
      : html`<p class="muted">No past events yet.</p>`}
  `;
}
