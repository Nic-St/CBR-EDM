import { adminLayout } from '../../templates/admin/layout.js';
import { harmReductionAdminPage } from '../../templates/admin/harmReduction.js';
import { generateId } from '../../lib/ids.js';
import { notFound } from '../../lib/http.js';
import { getSetting, setSetting } from '../../lib/settings.js';
import { HARM_REDUCTION_INTRO_KEY, HARM_REDUCTION_INTRO_DEFAULT } from '../harmReduction.js';

function page(admin, body) {
  return new Response(String(adminLayout({ title: 'Harm reduction links', bodyContent: body, email: admin.email })), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleHarmReductionList(request, env, admin) {
  const { results } = await env.DB.prepare('SELECT * FROM harm_reduction_links').all();
  const intro = await getSetting(env, HARM_REDUCTION_INTRO_KEY, HARM_REDUCTION_INTRO_DEFAULT);
  return page(admin, harmReductionAdminPage(results, intro));
}

export async function handleHarmReductionIntroUpdate(request, env, admin) {
  const formData = await request.formData();
  const intro = (formData.get('intro') || '').trim();
  await setSetting(env, HARM_REDUCTION_INTRO_KEY, intro || HARM_REDUCTION_INTRO_DEFAULT);
  return Response.redirect(new URL('/admin/harm-reduction', request.url), 303);
}

function readLinkFields(formData) {
  return {
    title: formData.get('title') || '',
    url: formData.get('url') || null,
    phone: formData.get('phone') || null,
    description: formData.get('description') || null,
    region: formData.get('region') || 'National',
    sort_order: Number(formData.get('sort_order')) || 0,
  };
}

export async function handleHarmReductionCreate(request, env, admin) {
  const formData = await request.formData();
  const fields = readLinkFields(formData);
  const id = generateId('hrl');

  await env.DB.prepare(
    'INSERT INTO harm_reduction_links (id, title, url, phone, description, region, sort_order, last_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, fields.title, fields.url, fields.phone, fields.description, fields.region, fields.sort_order, new Date().toISOString()).run();

  return Response.redirect(new URL('/admin/harm-reduction', request.url), 303);
}

export async function handleHarmReductionUpdate(request, env, admin, id) {
  const link = await env.DB.prepare('SELECT id, last_checked_at FROM harm_reduction_links WHERE id = ?').bind(id).first();
  if (!link) return notFound();

  const formData = await request.formData();
  const fields = readLinkFields(formData);
  const lastCheckedAt = formData.get('mark_checked') ? new Date().toISOString() : link.last_checked_at;

  await env.DB.prepare(
    'UPDATE harm_reduction_links SET title = ?, url = ?, phone = ?, description = ?, region = ?, sort_order = ?, last_checked_at = ? WHERE id = ?',
  ).bind(fields.title, fields.url, fields.phone, fields.description, fields.region, fields.sort_order, lastCheckedAt, id).run();

  return Response.redirect(new URL('/admin/harm-reduction', request.url), 303);
}
