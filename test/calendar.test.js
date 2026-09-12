import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calendar } from '../src/templates/calendar.js';

test('marks todays date in the rendered month', () => {
  const now = new Date('2026-09-19T05:00:00Z'); // 2026-09-19 in Canberra (AEST, UTC+10)
  const page = String(calendar([], 2026, 9, now));
  assert.match(page, /class="is-today"[^>]*>(?:(?!<\/td>).)*>19</s);
});

test('does not mark any other date as today', () => {
  const now = new Date('2026-09-19T05:00:00Z');
  const page = String(calendar([], 2026, 9, now));
  const matches = page.match(/class="is-today"/g) || [];
  assert.equal(matches.length, 1);
});

test('marks nothing when viewing a different month than today', () => {
  const now = new Date('2026-09-19T05:00:00Z');
  const page = String(calendar([], 2026, 10, now));
  assert.doesNotMatch(page, /is-today/);
});

test('a today with no events still gets aria-current, not aria-hidden', () => {
  const now = new Date('2026-09-19T05:00:00Z');
  const page = String(calendar([], 2026, 9, now));
  assert.match(page, /<span aria-current="date">19/);
});
