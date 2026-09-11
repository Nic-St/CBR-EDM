/**
 * GET /robots.txt. Section 6.
 */
export function handleRobots() {
  const body = [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /edit',
    'Disallow: /crew',
    'Disallow: /go',
    'Disallow: /api',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
