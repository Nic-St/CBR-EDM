import { config } from './config.js';

/**
 * Worker entry point. Routing is built out in phase 1 (see SPEC.md section 17).
 * For now this just proves the Worker, D1 and assets bindings are wired up.
 * @type {ExportedHandler}
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM events').first();
      return new Response(
        JSON.stringify({ ok: true, site: config.siteName, events: row.count }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
