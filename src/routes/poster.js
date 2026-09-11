import { posterPage } from '../templates/poster.js';

/**
 * GET /poster?size=a4|a6. Section 17 phase 4.
 */
export async function handlePoster(request, env) {
  const url = new URL(request.url);
  const size = url.searchParams.get('size') === 'a6' ? 'a6' : 'a4';
  const homeUrl = `${url.origin}/`;

  const page = String(posterPage(homeUrl, size));

  return new Response(page, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
