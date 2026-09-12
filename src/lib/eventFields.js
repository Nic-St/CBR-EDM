import { canberraLocalInputToUtc } from './dates.js';

const MAX_LENGTHS = {
  title: 200,
  presented_by: 200,
  venue_name: 200,
  venue_address: 300,
  location_reveal_at: 200,
  location_how_to_find: 300,
  genres: 200,
  price_text: 100,
  lineup: 2000,
  ticket_url: 500,
  notes: 2000,
};

/**
 * Input length limits and URL scheme checks, section 12. Returns a list of
 * plain-English error strings, empty if the fields are all valid.
 * @param {object} fields - the object returned by readEventFields
 */
export function validateEventFields(fields) {
  const errors = [];

  for (const [key, max] of Object.entries(MAX_LENGTHS)) {
    if (fields[key] && fields[key].length > max) {
      errors.push(`That's too long (max ${max} characters).`);
    }
  }

  if (fields.ticket_url && !isHttpUrl(fields.ticket_url)) {
    errors.push('Ticket URL must start with http:// or https://.');
  }

  return errors;
}

/**
 * Whether a string is an http(s) URL, section 12: ticket URLs and crew
 * links must be http: or https:, so they can never be used to redirect
 * somewhere unsafe (e.g. a javascript: URL).
 * @param {string} value
 */
export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Wraps a plain object so it can be passed to readEventFields wherever a
 * FormData would normally go (e.g. a JSON request body).
 * @param {object} obj
 */
export function asFormDataLike(obj) {
  return { get: (key) => obj[key] };
}

/**
 * Assumes https:// for a URL typed without a scheme (e.g. "cbredm.org"),
 * so people submitting a ticket link don't need to know to type it, per
 * owner request. isHttpUrl still rejects anything that isn't a valid
 * http(s) URL once this has had a chance to add the scheme.
 * @param {string} value
 */
function withAssumedScheme(value) {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Reads the shared event fields (section 8.1) from a submitted form, used
 * by both the admin event form and the public submission form. Both take
 * local Canberra time and convert to UTC on save, section 3.4.
 * @param {FormData} formData
 */
export function readEventFields(formData) {
  return {
    title: formData.get('title') || null,
    presented_by: formData.get('presented_by') || null,
    crew_id: formData.get('crew_id') || null,
    start_at: canberraLocalInputToUtc(formData.get('start_at_local')),
    end_at: canberraLocalInputToUtc(formData.get('end_at_local')),
    venue_name: formData.get('venue_name') || null,
    venue_address: formData.get('venue_address') || null,
    location_tba: formData.get('location_tba') ? 1 : 0,
    location_reveal_at: formData.get('location_reveal_at') || null,
    location_how_to_find: formData.get('location_how_to_find') || null,
    genres: formData.get('genres') || null,
    price_text: formData.get('price_text') || null,
    lineup: formData.get('lineup') || null,
    ticket_url: withAssumedScheme(formData.get('ticket_url')) || null,
    notes: formData.get('notes') || null,
    age_restriction: formData.get('age_restriction') || 'unknown',
    status: formData.get('status') || 'on',
  };
}
