/**
 * GET /img/:key. Section 6 and 10.5: serve flyer images from R2, only for
 * events that are still published. Long cache headers since keys are
 * random and content never changes once uploaded.
 */
export async function handleImg(request, env, key) {
  const linkedToPublished = await env.DB.prepare(
    "SELECT 1 FROM events WHERE visibility = 'published' AND (flyer_key = ?1 OR flyer_thumb_key = ?1) LIMIT 1",
  ).bind(key).first();

  if (!linkedToPublished) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.FLYERS.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
