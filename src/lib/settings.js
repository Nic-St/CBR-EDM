// A small generic key/value store (site_settings, migration 0006) for
// page copy that's admin-editable rather than hardcoded. Only used for a
// handful of values, so no caching -- callers already sit behind D1 and
// a short Cache-Control on the page itself.

/**
 * @param {object} env
 * @param {string} key
 * @param {string} fallback - used when the row doesn't exist yet
 */
export async function getSetting(env, key, fallback) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : fallback;
}

/**
 * @param {object} env
 * @param {string} key
 * @param {string} value
 */
export async function setSetting(env, key, value) {
  await env.DB.prepare(
    'INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
  ).bind(key, value).run();
}
