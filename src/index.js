import { config } from './config.js';
import { router } from './router.js';
import { withSecurityHeaders } from './lib/securityHeaders.js';

/**
 * Worker entry point. More routes land through phase 2/3 (see SPEC.md
 * section 17).
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

    const response = await router(request, env);
    return withSecurityHeaders(response);
  },
};
