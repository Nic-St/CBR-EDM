import { html } from '../lib/escape.js';
import { isEventPast } from '../lib/dates.js';
import { eventCard } from './eventCard.js';
import { calendar } from './calendar.js';
import { config } from '../config.js';

const PAST_LIMIT = 12;

/**
 * The home page: board (coming up / been and gone) and calendar, section 7.
 * @param {object[]} events - published events, visibility already filtered by the caller
 * @param {number} calendarYear
 * @param {number} calendarMonth - 1-indexed
 * @param {Date} [now]
 */
export function homePage(events, calendarYear, calendarMonth, now = new Date()) {
  const upcoming = events
    .filter((event) => !isEventPast(event, now))
    .sort((a, b) => new Date(a.start_at || 0) - new Date(b.start_at || 0));

  const past = events
    .filter((event) => isEventPast(event, now))
    .sort((a, b) => new Date(b.start_at || 0) - new Date(a.start_at || 0));

  const pastShown = past.slice(0, PAST_LIMIT);

  const body = html`
    <div class="view-toggle" role="group" aria-label="Show board or calendar">
      <button type="button" data-show="board" aria-pressed="true">Board</button>
      <button type="button" data-show="calendar" aria-pressed="false">Calendar</button>
    </div>

    <div class="home-layout">
      <div class="board" data-panel="board">
        <div class="board-column">
          <h2>${config.boardColumns.upcoming}</h2>
          ${upcoming.length
            ? html`<ul>${upcoming.map((event) => eventCard(event, now))}</ul>`
            : emptyUpcoming()}
        </div>
        <div class="board-column">
          <h2>${config.boardColumns.past}</h2>
          ${pastShown.length
            ? html`<ul>${pastShown.map((event) => eventCard(event, now))}</ul>`
            : ''}
          ${past.length > PAST_LIMIT ? html`<p><a href="/archive">See the full archive</a></p>` : ''}
        </div>
      </div>
      <div data-panel="calendar">
        ${calendar(events.filter((event) => event.start_at), calendarYear, calendarMonth)}
      </div>
    </div>
  `;

  return { body, hasUpcoming: upcoming.length > 0 };
}

function emptyUpcoming() {
  return html`<p class="empty-scrap">Nothing on the wall right now. Quiet month. Know of something? <a href="/submit">Put it up</a>.</p>`;
}
