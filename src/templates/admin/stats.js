import { html } from '../../lib/escape.js';

const METRIC_LABELS = {
  home_view: 'Home page views',
  event_view: 'Event page views',
  ticket_click: 'Ticket clicks',
  ics_feed_fetch: 'Calendar feed fetches',
  ics_event_download: 'Single event .ics downloads',
  submission: 'Submissions',
  contact_message: 'Contact messages',
};

/**
 * GET /admin/stats. Section 11.2: last 30 days and all time for each
 * metric, top events by views and ticket clicks, per-crew summary.
 * @param {{ metric: string, last30: number, allTime: number }[]} totals
 * @param {{ title: string, slug: string, count: number }[]} topByViews
 * @param {{ title: string, slug: string, count: number }[]} topByClicks
 * @param {{ name: string, views: number, clicks: number }[]} perCrew
 */
export function statsPage(totals, topByViews, topByClicks, perCrew) {
  return html`
    <h1>Stats</h1>
    <table>
      <thead><tr><th>Metric</th><th>Last 30 days</th><th>All time</th></tr></thead>
      <tbody>
        ${totals.map((row) => html`<tr><td>${METRIC_LABELS[row.metric] || row.metric}</td><td>${row.last30}</td><td>${row.allTime}</td></tr>`)}
      </tbody>
    </table>

    <h2>Top events by views</h2>
    ${topByViews.length
      ? html`<table><tbody>${topByViews.map((row) => html`<tr><td><a href="/e/${row.slug}">${row.title || 'Untitled'}</a></td><td>${row.count}</td></tr>`)}</tbody></table>`
      : html`<p class="muted">No data yet.</p>`}

    <h2>Top events by ticket clicks</h2>
    ${topByClicks.length
      ? html`<table><tbody>${topByClicks.map((row) => html`<tr><td><a href="/e/${row.slug}">${row.title || 'Untitled'}</a></td><td>${row.count}</td></tr>`)}</tbody></table>`
      : html`<p class="muted">No data yet.</p>`}

    <h2>Per crew</h2>
    ${perCrew.length
      ? html`<table><thead><tr><th>Crew</th><th>Views</th><th>Ticket clicks</th></tr></thead><tbody>${perCrew.map((row) => html`<tr><td>${row.name}</td><td>${row.views}</td><td>${row.clicks}</td></tr>`)}</tbody></table>`
      : html`<p class="muted">No data yet.</p>`}
  `;
}
