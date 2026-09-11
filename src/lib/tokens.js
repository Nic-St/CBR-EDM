// Crew keys and edit tokens: 32 random bytes, stored only as SHA-256
// hashes, section 12. The raw value is shown once and never stored.

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * A new random token: 32 bytes, base64url encoded.
 */
export function generateToken() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * SHA-256 hash of a token, as lowercase hex, for storage and lookup.
 * @param {string} token
 */
export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}
