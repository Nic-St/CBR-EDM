import { config } from './config.js';
import { handleHome } from './routes/home.js';

/**
 * Worker entry point. More routes land through phase 1 (see SPEC.md section 17).
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

    if (url.pathname === '/') {
      return handleHome(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
