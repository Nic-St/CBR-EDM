// Tagged template for building HTML safely. Every interpolated value is
// escaped by default; wrap a value in `raw()` only when it is already-built
// HTML from this same file (e.g. composing templates together).

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

const RAW = Symbol('raw html');

/**
 * Marks a string as already-safe HTML so the `html` tag does not escape it.
 * @param {string} value
 */
export function raw(value) {
  return { [RAW]: true, value: String(value), toString: () => String(value) };
}

/**
 * Tagged template: html`<p>${userInput}</p>` escapes userInput automatically.
 * Arrays are joined (each item escaped or passed through raw() individually).
 *
 * Returns a raw-marked value, not a plain string, so that composing one
 * template inside another (e.g. an event card inside the home page) does
 * not get double-escaped. Call String(...) on the final, outermost result
 * to get the actual HTML string for a Response body.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i]) + strings[i + 1];
  }
  return raw(out);
}

function renderValue(value) {
  if (value == null || value === false) return '';
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (typeof value === 'object' && value[RAW]) return value.value;
  return escapeHtml(value);
}
