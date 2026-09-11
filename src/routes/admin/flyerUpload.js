import { validateFlyerUpload, MAX_LARGE_BYTES, MAX_THUMB_BYTES } from '../../lib/imagePipeline.js';
import { generateId } from '../../lib/ids.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * POST /admin/api/events/:id/flyer. Section 10.5: the server validates
 * what the browser already resized and re-encoded, then stores it to R2
 * under random keys.
 */
export async function handleFlyerUpload(request, env, eventId) {
  const event = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(eventId).first();
  if (!event) return jsonResponse({ ok: false, error: 'Event not found.' }, 404);

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: 'Could not read the upload.' }, 400);
  }

  const large = await validateFlyerUpload(form.get('large'), MAX_LARGE_BYTES);
  if (!large.ok) return jsonResponse({ ok: false, error: `Large image: ${large.error}` }, 400);

  const thumb = await validateFlyerUpload(form.get('thumb'), MAX_THUMB_BYTES);
  if (!thumb.ok) return jsonResponse({ ok: false, error: `Thumbnail: ${thumb.error}` }, 400);

  const largeKey = `flyers/${generateId()}.webp`;
  const thumbKey = `flyers/${generateId()}.webp`;

  await Promise.all([
    env.FLYERS.put(largeKey, large.buffer, { httpMetadata: { contentType: 'image/webp' } }),
    env.FLYERS.put(thumbKey, thumb.buffer, { httpMetadata: { contentType: 'image/webp' } }),
  ]);

  await env.DB.prepare(
    'UPDATE events SET flyer_key = ?, flyer_thumb_key = ?, updated_at = ? WHERE id = ?',
  ).bind(largeKey, thumbKey, new Date().toISOString(), eventId).run();

  return jsonResponse({ ok: true, flyer_key: largeKey, flyer_thumb_key: thumbKey });
}
