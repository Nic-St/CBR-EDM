import { hashToken } from './tokens.js';
import { canberraDayKey } from './dates.js';

/**
 * Checks and increments a rate limit bucket, keyed by a daily-rotating
 * salted hash of the client IP, never the raw IP. Section 5 and 12.
 * @param {Request} request
 * @param {import('../env.js').Env} env
 * @param {string} bucket - e.g. "submit", "crew_key", "contact"
 * @param {number} limit - max allowed within the current Canberra day
 * @returns {Promise<boolean>} true if the request is allowed
 */
export async function checkRateLimit(request, env, bucket, limit) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const day = canberraDayKey(new Date().toISOString());
  const salt = env.RATE_LIMIT_SALT || 'local-dev-salt-not-for-production';
  const keyHash = await hashToken(`${salt}:${day}:${bucket}:${ip}`);

  const row = await env.DB.prepare(
    'SELECT count FROM rate_limits WHERE bucket = ? AND key_hash = ? AND day = ?',
  ).bind(bucket, keyHash, day).first();

  if (row && row.count >= limit) return false;

  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, key_hash, day, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(bucket, key_hash, day) DO UPDATE SET count = count + 1`,
  ).bind(bucket, keyHash, day).run();

  return true;
}
