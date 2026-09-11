import { layout } from '../templates/layout.js';
import { html } from './escape.js';

/**
 * A plain 404 response, styled with the same page shell. Used for unknown
 * routes and for pending/rejected/removed events (section 8.3), so a
 * private event never reveals its existence through a different error.
 */
export function notFound() {
  const body = html`<p>That page does not exist, or is not published.</p>`;
  return new Response(String(layout({ title: 'Not found', bodyContent: body })), {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}
