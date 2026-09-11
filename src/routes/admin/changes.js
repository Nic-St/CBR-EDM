import { adminLayout } from '../../templates/admin/layout.js';
import { changeListPage } from '../../templates/admin/changes.js';
import { notFound } from '../../lib/http.js';

const LIST_SQL = `
  SELECT event_changes.*, events.title AS event_title,
    events.title AS current_title, events.start_at AS current_start_at, events.end_at AS current_end_at,
    events.venue_name AS current_venue_name, events.venue_address AS current_venue_address,
    events.genres AS current_genres, events.price_text AS current_price_text, events.lineup AS current_lineup,
    events.ticket_url AS current_ticket_url, events.notes AS current_notes,
    events.age_restriction AS current_age_restriction, events.status AS current_status
  FROM event_changes JOIN events ON events.id = event_changes.event_id
  WHERE event_changes.state = 'pending'
  ORDER BY event_changes.created_at
`;

export async function handleChangeList(request, env, admin) {
  const { results } = await env.DB.prepare(LIST_SQL).all();
  const body = changeListPage(results);
  return new Response(String(adminLayout({ title: 'Pending changes', bodyContent: body, email: admin.email })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /admin/changes/:id/approve. Applies an edit's proposed_json to the
 * live event, or actions a cancel/removal request, section 10.2.
 */
export async function handleChangeApprove(request, env, admin, id) {
  const change = await env.DB.prepare('SELECT * FROM event_changes WHERE id = ?').bind(id).first();
  if (!change) return notFound();

  const now = new Date().toISOString();

  if (change.kind === 'edit') {
    const proposed = JSON.parse(change.proposed_json || '{}');
    const setClauses = Object.keys(proposed).map((field) => `${field} = ?`);
    const values = Object.values(proposed);
    await env.DB.prepare(
      `UPDATE events SET ${setClauses.join(', ')}, sequence = sequence + 1, updated_at = ? WHERE id = ?`,
    ).bind(...values, now, change.event_id).run();
  } else if (change.kind === 'cancel_request') {
    await env.DB.prepare("UPDATE events SET status = 'cancelled', sequence = sequence + 1, updated_at = ? WHERE id = ?")
      .bind(now, change.event_id).run();
  } else if (change.kind === 'removal_request') {
    await env.DB.prepare("UPDATE events SET visibility = 'removed', updated_at = ? WHERE id = ?")
      .bind(now, change.event_id).run();
  }

  await env.DB.prepare("UPDATE event_changes SET state = 'approved', decided_at = ? WHERE id = ?").bind(now, id).run();

  return Response.redirect(new URL('/admin/changes', request.url), 303);
}

export async function handleChangeReject(request, env, admin, id) {
  const change = await env.DB.prepare('SELECT id FROM event_changes WHERE id = ?').bind(id).first();
  if (!change) return notFound();

  await env.DB.prepare("UPDATE event_changes SET state = 'rejected', decided_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), id).run();

  return Response.redirect(new URL('/admin/changes', request.url), 303);
}
