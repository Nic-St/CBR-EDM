// Security headers, section 12. Applied to HTML responses only, since
// forcing these onto an image or calendar file response serves no purpose
// and risks breaking their own Content-Type handling.

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  // The Turnstile widget injects its own inline styles into its iframe/host
  // elements, so style-src needs 'unsafe-inline'. This is far lower risk
  // than allowing inline scripts (still fully blocked above): styles can't
  // execute code or exfiltrate data on their own.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
].join('; ');

/**
 * @param {Response} response
 * @param {{ noReferrer?: boolean }} [options] - pass noReferrer on edit and crew pages, section 12
 */
export function withSecurityHeaders(response, options = {}) {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return response;

  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', options.noReferrer ? 'no-referrer' : 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
