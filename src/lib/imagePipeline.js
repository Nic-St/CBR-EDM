// Server-side half of the image pipeline, section 10.5. The browser does
// the resizing and WebP encoding (public/js/admin-flyer-upload.js); this
// file only validates what lands here, by magic bytes rather than trusting
// the declared content type.

export const MAX_LARGE_BYTES = 2 * 1024 * 1024;
export const MAX_THUMB_BYTES = 400 * 1024;

/**
 * Whether a buffer starts with the WebP magic bytes (RIFF....WEBP).
 * @param {ArrayBuffer} buffer
 */
export function isWebp(buffer) {
  if (buffer.byteLength < 12) return false;
  const bytes = new Uint8Array(buffer, 0, 12);
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  return riff === 'RIFF' && webp === 'WEBP';
}

/**
 * @param {File} file
 * @param {number} maxBytes
 * @returns {Promise<{ ok: true, buffer: ArrayBuffer } | { ok: false, error: string }>}
 */
export async function validateFlyerUpload(file, maxBytes) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return { ok: false, error: 'No file was uploaded.' };
  }
  if (file.size > maxBytes) {
    return { ok: false, error: `File is too large (max ${Math.round(maxBytes / 1024)}KB).` };
  }
  const buffer = await file.arrayBuffer();
  if (!isWebp(buffer)) {
    return { ok: false, error: 'File is not a valid WebP image.' };
  }
  return { ok: true, buffer };
}
