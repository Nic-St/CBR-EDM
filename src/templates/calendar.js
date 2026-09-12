import { html } from '../lib/escape.js';
import { canberraDayKey, canberraWeekdayIndex, monthLabel, WEEKDAYS_SHORT } from '../lib/dates.js';

/**
 * Renders the month calendar grid, section 7.1. Works without JavaScript:
 * previous/next are plain links to ?month=YYYY-MM, and each day with
 * events links to that day's list further down the page via an anchor.
 * @param {object[]} events - published, non-removed events with a start_at
 * @param {number} year
 * @param {number} month - 1-indexed
 * @param {Date} [now]
 */
export function calendar(events, year, month, now = new Date()) {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const eventsInMonth = events.filter(
    (event) => event.start_at && canberraDayKey(event.start_at).startsWith(monthPrefix),
  );
  const eventsByDay = groupByDay(eventsInMonth);
  const todayKey = canberraDayKey(now.toISOString());
  const weeks = buildWeeks(year, month, eventsByDay, todayKey);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return html`<section class="calendar-panel">
    <div class="calendar">
      <nav class="calendar-nav" aria-label="Change month">
        <a href="/?month=${monthParam(prev.year, prev.month)}" aria-label="Previous month">&lt;</a>
        <span class="calendar-nav-label">${monthLabel(year, month)}</span>
        <a href="/?month=${monthParam(next.year, next.month)}" aria-label="Next month">&gt;</a>
      </nav>
      <table>
        <caption class="sr-only">${monthLabel(year, month)}</caption>
        <thead>
          <tr>
            ${WEEKDAYS_SHORT.map((day) => html`<th scope="col">${day}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${weeks.map((week) => html`<tr>
            ${week.map((day) => day
              ? html`<td class="${day.isToday ? 'is-today' : ''}">${day.hasEvents
                  ? html`<a href="#day-${day.key}" aria-label="${day.count} event${day.count === 1 ? '' : 's'} on ${day.key}${day.isToday ? ', today' : ''}" ${day.isToday ? html`aria-current="date"` : ''}>${day.dayOfMonth}</a>`
                  : day.isToday
                    ? html`<span aria-current="date">${day.dayOfMonth}<span class="sr-only"> (today)</span></span>`
                    : html`<span aria-hidden="true">${day.dayOfMonth}</span>`}</td>`
              : html`<td></td>`)}
          </tr>`)}
        </tbody>
      </table>
    </div>
    ${Object.keys(eventsByDay).length
      ? html`<div class="calendar-day-lists">
          ${Object.entries(eventsByDay).map(([dayKey, dayEvents]) => html`<div id="day-${dayKey}">
            <h3>${dayKey}</h3>
            <ul>
              ${dayEvents.map((event) => html`<li><a href="/e/${event.slug}">${event.title || 'Untitled event'}</a></li>`)}
            </ul>
          </div>`)}
        </div>`
      : ''}
  </section>`;
}

function groupByDay(events) {
  const byDay = {};
  for (const event of events) {
    if (!event.start_at) continue;
    const key = canberraDayKey(event.start_at);
    (byDay[key] ||= []).push(event);
  }
  return byDay;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildWeeks(year, month, eventsByDay, todayKey) {
  const total = daysInMonth(year, month);
  const days = [];
  for (let dayOfMonth = 1; dayOfMonth <= total; dayOfMonth++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
    const iso = `${key}T12:00:00Z`; // midday UTC is always the same Canberra calendar day
    const weekdayIndex = canberraWeekdayIndex(iso);
    const dayEvents = eventsByDay[key] || [];
    days.push({
      dayOfMonth, key, weekdayIndex, hasEvents: dayEvents.length > 0, count: dayEvents.length,
      isToday: key === todayKey,
    });
  }

  const weeks = [];
  let week = new Array(days[0].weekdayIndex).fill(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

function shiftMonth(year, month, delta) {
  const total = month + delta;
  const newYear = year + Math.floor((total - 1) / 12);
  const newMonth = ((total - 1) % 12 + 12) % 12 + 1;
  return { year: newYear, month: newMonth };
}

function monthParam(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}
