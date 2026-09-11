import { adminLayout } from '../../templates/admin/layout.js';
import { statsPage } from '../../templates/admin/stats.js';
import { canberraDayKey } from '../../lib/dates.js';

const METRICS = ['home_view', 'event_view', 'ticket_click', 'ics_feed_fetch', 'ics_event_download', 'submission', 'contact_message'];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function handleStats(request, env, admin) {
  const since30 = canberraDayKey(new Date(Date.now() - THIRTY_DAYS_MS).toISOString());

  const totals = await Promise.all(METRICS.map(async (metric) => {
    const [last30, allTime] = await Promise.all([
      env.DB.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM daily_counts WHERE metric = ? AND day >= ?').bind(metric, since30).first(),
      env.DB.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM daily_counts WHERE metric = ?').bind(metric).first(),
    ]);
    return { metric, last30: last30.n, allTime: allTime.n };
  }));

  const { results: topByViews } = await env.DB.prepare(
    `SELECT events.title, events.slug, SUM(daily_counts.count) AS count
     FROM daily_counts JOIN events ON events.id = daily_counts.subject_id
     WHERE daily_counts.metric = 'event_view'
     GROUP BY daily_counts.subject_id ORDER BY count DESC LIMIT 10`,
  ).all();

  const { results: topByClicks } = await env.DB.prepare(
    `SELECT events.title, events.slug, SUM(daily_counts.count) AS count
     FROM daily_counts JOIN events ON events.id = daily_counts.subject_id
     WHERE daily_counts.metric = 'ticket_click'
     GROUP BY daily_counts.subject_id ORDER BY count DESC LIMIT 10`,
  ).all();

  const { results: perCrew } = await env.DB.prepare(
    `SELECT crews.name AS name,
       COALESCE(SUM(CASE WHEN daily_counts.metric = 'event_view' THEN daily_counts.count ELSE 0 END), 0) AS views,
       COALESCE(SUM(CASE WHEN daily_counts.metric = 'ticket_click' THEN daily_counts.count ELSE 0 END), 0) AS clicks
     FROM crews
     JOIN events ON events.crew_id = crews.id
     LEFT JOIN daily_counts ON daily_counts.subject_id = events.id AND daily_counts.metric IN ('event_view', 'ticket_click')
     GROUP BY crews.id ORDER BY crews.name`,
  ).all();

  const body = statsPage(totals, topByViews, topByClicks, perCrew);
  return new Response(String(adminLayout({ title: 'Stats', bodyContent: body, email: admin.email })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
