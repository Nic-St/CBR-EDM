import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCalendar, eventToVEvent } from '../src/lib/ics.js';

const baseEvent = {
  id: 'evt_test123',
  slug: 'test-event',
  title: 'Deep Signal',
  sequence: 2,
  start_at: '2026-03-14T11:00:00Z',
  end_at: '2026-03-14T17:00:00Z',
  venue_name: 'The Basement',
  venue_address: '1 Example St',
  location_tba: 0,
  crew_name: 'Static Frequency',
  lineup: 'DJ Fictional',
  status: 'on',
};

test('VEVENT includes required fields with UTC dates', () => {
  const block = eventToVEvent(baseEvent, 'example.com', new Date('2026-01-01T00:00:00Z'));
  assert.match(block, /UID:evt_test123@example\.com/);
  assert.match(block, /SEQUENCE:2/);
  assert.match(block, /DTSTART:20260314T110000Z/);
  assert.match(block, /DTEND:20260314T170000Z/);
  assert.match(block, /SUMMARY:Deep Signal/);
  assert.match(block, /LOCATION:The Basement\\, 1 Example St/);
  assert.match(block, /URL:https:\/\/example\.com\/e\/test-event/);
});

test('no end time defaults to a 6 hour duration', () => {
  const block = eventToVEvent({ ...baseEvent, end_at: null }, 'example.com');
  assert.match(block, /DTSTART:20260314T110000Z/);
  assert.match(block, /DTEND:20260314T170000Z/);
});

test('location TBA is described rather than left blank', () => {
  const block = eventToVEvent({ ...baseEvent, location_tba: 1, venue_name: null, venue_address: null }, 'example.com');
  assert.match(block, /LOCATION:Location TBA\\, see event page/);
});

test('cancelled events carry STATUS:CANCELLED', () => {
  const block = eventToVEvent({ ...baseEvent, status: 'cancelled' }, 'example.com');
  assert.match(block, /STATUS:CANCELLED/);
});

test('special characters are escaped per RFC 5545', () => {
  const block = eventToVEvent({ ...baseEvent, title: 'Comma, semicolon; back\\slash' }, 'example.com');
  assert.match(block, /SUMMARY:Comma\\, semicolon\\; back\\\\slash/);
});

test('a long line gets folded with a leading space continuation', () => {
  const longLineup = 'A'.repeat(200);
  const block = eventToVEvent({ ...baseEvent, lineup: longLineup }, 'example.com');
  const rawLines = block.split('\r\n');
  for (const line of rawLines) {
    assert.ok(line.length <= 75 || line.startsWith(' '), `unfolded long line: ${line.slice(0, 20)}...`);
  }
});

test('buildCalendar wraps events in a VCALENDAR with events missing start_at skipped', () => {
  const calendarText = buildCalendar([baseEvent, { ...baseEvent, id: 'evt_no_start', start_at: null }], 'example.com');
  assert.match(calendarText, /^BEGIN:VCALENDAR\r\n/);
  assert.match(calendarText, /END:VCALENDAR\r\n$/);
  assert.equal((calendarText.match(/BEGIN:VEVENT/g) || []).length, 1);
});
