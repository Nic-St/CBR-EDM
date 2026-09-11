import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatEventDateTime, isEventPast, canberraLocalInputToUtc, utcToCanberraLocalInput } from '../src/lib/dates.js';

test('on-the-hour start formats without minutes', () => {
  assert.equal(
    formatEventDateTime('2026-03-14T11:00:00Z', '2026-03-14T17:00:00Z'),
    'Sat 14 Mar, 10pm to 4am',
  );
});

test('no end time reads "til late"', () => {
  assert.equal(formatEventDateTime('2026-03-14T11:00:00Z', null), 'Sat 14 Mar, 10pm til late');
});

test('past and archive views include the year', () => {
  assert.equal(
    formatEventDateTime('2026-03-14T11:00:00Z', '2026-03-14T17:00:00Z', { includeYear: true }),
    'Sat 14 Mar 2026, 10pm to 4am',
  );
});

test('midnight, midday and non-hour minutes', () => {
  assert.equal(
    formatEventDateTime('2026-03-14T13:00:00Z', '2026-03-14T13:30:00Z'),
    'Sun 15 Mar, midnight to 12:30am',
  );
});

test('multi-day events show both dates', () => {
  assert.equal(
    formatEventDateTime('2026-10-24T05:00:00Z', '2026-10-26T04:00:00Z'),
    'Sat 24 Oct, 4pm to Mon 26 Oct, 3pm',
  );
});

test('no-end-time event becomes past at 6am Canberra the next day (AEDT)', () => {
  const event = { start_at: '2026-03-14T11:00:00Z', end_at: null };
  assert.equal(isEventPast(event, new Date('2026-03-14T18:59:00Z')), false);
  assert.equal(isEventPast(event, new Date('2026-03-14T19:01:00Z')), true);
});

test('no-end-time event becomes past at 6am Canberra the next day (AEST)', () => {
  const event = { start_at: '2026-07-25T11:00:00Z', end_at: null };
  assert.equal(isEventPast(event, new Date('2026-07-25T19:59:00Z')), false);
  assert.equal(isEventPast(event, new Date('2026-07-25T20:01:00Z')), true);
});

test('admin datetime-local input converts Canberra local time to UTC (AEDT)', () => {
  assert.equal(canberraLocalInputToUtc('2026-03-14T22:00'), '2026-03-14T11:00:00.000Z');
});

test('admin datetime-local input converts Canberra local time to UTC (AEST)', () => {
  assert.equal(canberraLocalInputToUtc('2026-07-25T21:00'), '2026-07-25T11:00:00.000Z');
});

test('utcToCanberraLocalInput is the reverse of canberraLocalInputToUtc', () => {
  assert.equal(utcToCanberraLocalInput('2026-03-14T11:00:00.000Z'), '2026-03-14T22:00');
  assert.equal(utcToCanberraLocalInput(null), '');
});

test('an end time overrides the 6am rule', () => {
  const event = { start_at: '2026-03-14T11:00:00Z', end_at: '2026-03-14T17:00:00Z' };
  assert.equal(isEventPast(event, new Date('2026-03-14T16:59:00Z')), false);
  assert.equal(isEventPast(event, new Date('2026-03-14T17:01:00Z')), true);
});
