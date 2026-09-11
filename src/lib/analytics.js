import { canberraDayKey } from './dates.js';

/**
 * Increments a first-party daily counter, section 11.2. No IP addresses,
 * cookies or identifiers are stored, only a day/metric/subject tally.
 * @param {import('../env.js').Env} env
 * @param {string} metric
 * @param {string} [subjectId]
 * @param {Date} [now]
 */
export async function recordCount(env, metric, subjectId = '', now = new Date()) {
  const day = canberraDayKey(now.toISOString());
  await env.DB.prepare(
    `INSERT INTO daily_counts (day, metric, subject_id, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(day, metric, subject_id) DO UPDATE SET count = count + 1`,
  ).bind(day, metric, subjectId).run();
}

const BOT_PATTERN = /bot|crawler|spider/i;

/**
 * Whether a request looks like an obvious bot, section 11.2. Not counted.
 * @param {Request} request
 */
export function isBotRequest(request) {
  return BOT_PATTERN.test(request.headers.get('User-Agent') || '');
}
