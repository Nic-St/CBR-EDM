import { config } from './config.js';
import { router } from './router.js';
import { withSecurityHeaders } from './lib/securityHeaders.js';
import { handleInboundEmail } from './lib/inboundEmail.js';

/**
 * Worker entry point.
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

  /**
   * Handles mail arriving at events@domain via Email Routing, section 10.6.
   */
  async email(message, env) {
    await handleInboundEmail(message, env);
  },
};
