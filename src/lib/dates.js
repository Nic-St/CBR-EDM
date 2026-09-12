// Canberra-time date and time formatting. See SPEC.md section 3.4 and 3.5.
// Every event timestamp in D1 is a UTC ISO 8601 string; this file is the
// only place that converts them to Australia/Sydney for display.

const TIME_ZONE = 'Australia/Sydney';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Breaks a UTC ISO string into its Canberra local calendar and time parts.
 * @param {string} isoUtc
 */
function toCanberraParts(isoUtc) {
  const date = new Date(isoUtc);
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekdayIndex: WEEKDAYS_SHORT.indexOf(parts.weekday),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    // A sortable key for same-day comparisons, independent of UTC offset.
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/**
 * Formats a Canberra local time, e.g. "10pm", "10:30pm", "midnight", "midday".
 */
function formatTime({ hour, minute }) {
  if (hour === 0 && minute === 0) return 'midnight';
  if (hour === 12 && minute === 0) return 'midday';
  const period = hour < 12 ? 'am' : 'pm';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${String(minute).padStart(2, '0')}${period}`;
}

/**
 * Formats a Canberra local date, e.g. "Sat 14 Mar" or "Sat 14 Mar 2026".
 */
function formatDate(parts, { includeYear }) {
  const weekday = WEEKDAYS_SHORT[parts.weekdayIndex];
  const month = MONTHS_SHORT[parts.month - 1];
  return includeYear
    ? `${weekday} ${parts.day} ${month} ${parts.year}`
    : `${weekday} ${parts.day} ${month}`;
}

/**
 * Formats an event's date and time for display, per SPEC.md section 3.4.
 * @param {string|null} startAt - UTC ISO string
 * @param {string|null} endAt - UTC ISO string, or null for "til late"
 * @param {{ includeYear?: boolean }} [options] - pass includeYear for past/archive views
 */
export function formatEventDateTime(startAt, endAt, options = {}) {
  if (!startAt) return null;
  const includeYear = Boolean(options.includeYear);
  const start = toCanberraParts(startAt);
  const startText = `${formatDate(start, { includeYear })}, ${formatTime(start)}`;

  if (!endAt) return `${startText} til late`;

  const end = toCanberraParts(endAt);
  const spansMoreThanADay = new Date(endAt) - new Date(startAt) > 24 * 60 * 60 * 1000;

  if (spansMoreThanADay) {
    return `${startText} to ${formatDate(end, { includeYear })}, ${formatTime(end)}`;
  }

  // Same day, or runs past midnight into the next day: show the end time only.
  return `${startText} to ${formatTime(end)}`;
}

/**
 * Whether an event counts as "past" right now, per SPEC.md section 3.5.
 * Computed at render time; never stored.
 * @param {{ start_at: string|null, end_at: string|null }} event
 * @param {Date} [now]
 */
export function isEventPast(event, now = new Date()) {
  if (event.end_at) {
    return now > new Date(event.end_at);
  }
  if (!event.start_at) return false;

  // No end time: past at 6am Canberra time the morning after the start date.
  const start = toCanberraParts(event.start_at);
  const cutoffLocal = new Date(Date.UTC(start.year, start.month - 1, start.day + 1, 6, 0, 0));
  const cutoffUtc = canberraLocalToUtc(cutoffLocal);
  return now > cutoffUtc;
}

/**
 * Converts a Date holding Canberra "wall clock" fields (as if they were UTC)
 * into the real UTC instant, by measuring and correcting for the zone offset.
 * @param {Date} wallClockAsUtc
 */
function canberraLocalToUtc(wallClockAsUtc) {
  const offsetFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: TIME_ZONE,
    timeZoneName: 'shortOffset',
  });
  const offsetPart = offsetFormatter.formatToParts(wallClockAsUtc)
    .find((part) => part.type === 'timeZoneName').value;
  const match = offsetPart.match(/GMT([+-]\d+)(?::(\d+))?/);
  const offsetHours = match ? Number(match[1]) : 10;
  const offsetMinutes = match && match[2] ? Number(match[2]) : 0;
  const offsetMs = (offsetHours * 60 + Math.sign(offsetHours) * offsetMinutes) * 60 * 1000;
  return new Date(wallClockAsUtc.getTime() - offsetMs);
}

/**
 * The Monday-start weekday index (0 = Monday) for a UTC ISO string's
 * Canberra local date. Used to lay out the calendar grid.
 */
export function canberraWeekdayIndex(isoUtc) {
  return toCanberraParts(isoUtc).weekdayIndex;
}

/**
 * The Canberra local YYYY-MM-DD key for a UTC ISO string. Used to group
 * events by day on the calendar.
 */
export function canberraDayKey(isoUtc) {
  return toCanberraParts(isoUtc).dayKey;
}

/**
 * The current Canberra local {year, month} (1-indexed month), for the
 * calendar's default view.
 * @param {Date} [now]
 */
export function currentCanberraMonth(now = new Date()) {
  const parts = toCanberraParts(now.toISOString());
  return { year: parts.year, month: parts.month };
}

/**
 * A human label for a calendar month, e.g. "March 2026".
 * @param {number} year
 * @param {number} month - 1-indexed
 */
export function monthLabel(year, month) {
  return `${MONTHS_FULL[month - 1]} ${year}`;
}

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Converts a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm"),
 * read as Canberra local time, to a UTC ISO string. Section 3.4: "Admin and
 * submission forms take local Canberra time and convert to UTC on save."
 * @param {string} localDateTimeString
 * @returns {string|null}
 */
export function canberraLocalInputToUtc(localDateTimeString) {
  if (!localDateTimeString) return null;
  const [datePart, timePart] = localDateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);
  const wallClockAsUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  return canberraLocalToUtc(wallClockAsUtc).toISOString();
}

/**
 * The reverse of canberraLocalInputToUtc: a UTC ISO string to a
 * "YYYY-MM-DDTHH:mm" value for pre-filling a datetime-local input.
 * @param {string|null} isoUtc
 */
export function utcToCanberraLocalInput(isoUtc) {
  if (!isoUtc) return '';
  const parts = toCanberraParts(isoUtc);
  const pad = (n) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export { WEEKDAYS_SHORT, MONTHS_SHORT, toCanberraParts };
