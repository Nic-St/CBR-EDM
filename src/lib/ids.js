// Random ID and slug generation, section 5: "IDs are random, URL-safe
// strings (at least 16 characters)."

/**
 * @param {string} [prefix]
 */
export function generateId(prefix) {
  const id = crypto.randomUUID().replace(/-/g, '');
  return prefix ? `${prefix}_${id}` : id;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * A readable, unique slug for an event, e.g. "deep-signal-2026-03-14-a1b2".
 * @param {string|null} title
 * @param {string|null} startAt - UTC ISO string
 */
export function eventSlugFor(title, startAt) {
  const base = slugify(title) || 'untitled';
  const datePart = startAt ? startAt.slice(0, 10) : null;
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 4);
  return [base, datePart, suffix].filter(Boolean).join('-');
}

export { slugify };
