import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEventFields, isHttpUrl, asFormDataLike, readEventFields } from '../src/lib/eventFields.js';

test('validateEventFields rejects overly long fields', () => {
  const errors = validateEventFields({ title: 'a'.repeat(201) });
  assert.equal(errors.length, 1);
});

test('validateEventFields rejects a non-http(s) ticket URL', () => {
  const errors = validateEventFields({ ticket_url: 'javascript:alert(1)' });
  assert.ok(errors.some((e) => e.includes('Ticket URL')));
});

test('validateEventFields accepts valid fields', () => {
  const errors = validateEventFields({ title: 'Deep Signal', ticket_url: 'https://example.com/tickets' });
  assert.deepEqual(errors, []);
});

test('isHttpUrl accepts http/https and rejects other schemes', () => {
  assert.equal(isHttpUrl('https://example.com'), true);
  assert.equal(isHttpUrl('http://example.com'), true);
  assert.equal(isHttpUrl('javascript:alert(1)'), false);
  assert.equal(isHttpUrl('not a url'), false);
});

test('asFormDataLike lets a plain object be read with readEventFields', () => {
  const fields = readEventFields(asFormDataLike({ title: 'From JSON', start_at_local: '2026-03-14T22:00' }));
  assert.equal(fields.title, 'From JSON');
  assert.equal(fields.start_at, '2026-03-14T11:00:00.000Z');
});

test('readEventFields assumes https:// for a ticket URL typed without a scheme', () => {
  const fields = readEventFields(asFormDataLike({ ticket_url: 'cbredm.org' }));
  assert.equal(fields.ticket_url, 'https://cbredm.org');
});

test('readEventFields leaves an explicit scheme alone, http included', () => {
  assert.equal(readEventFields(asFormDataLike({ ticket_url: 'https://example.com' })).ticket_url, 'https://example.com');
  assert.equal(readEventFields(asFormDataLike({ ticket_url: 'http://example.com' })).ticket_url, 'http://example.com');
});

test('readEventFields leaves an empty ticket URL as null', () => {
  assert.equal(readEventFields(asFormDataLike({ ticket_url: '' })).ticket_url, null);
});
