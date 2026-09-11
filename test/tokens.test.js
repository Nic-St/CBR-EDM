import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateToken, hashToken } from '../src/lib/tokens.js';
import { generateId, eventSlugFor, slugify } from '../src/lib/ids.js';

test('generateToken produces distinct, URL-safe values', () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(a, b);
  assert.doesNotMatch(a, /[+/=]/);
  assert.ok(a.length >= 32);
});

test('hashToken is deterministic and hex-encoded', async () => {
  const token = 'fixed-test-token';
  const first = await hashToken(token);
  const second = await hashToken(token);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test('generateId is at least 16 characters and URL-safe', () => {
  const id = generateId('evt');
  assert.ok(id.startsWith('evt_'));
  assert.ok(id.length >= 16);
  assert.doesNotMatch(id, /[^a-zA-Z0-9_]/);
});

test('slugify strips punctuation and lowercases', () => {
  assert.equal(slugify('Deep Signal!! (Warehouse Edition)'), 'deep-signal-warehouse-edition');
});

test('eventSlugFor includes the date and stays unique across calls', () => {
  const a = eventSlugFor('Deep Signal', '2026-03-14T11:00:00Z');
  const b = eventSlugFor('Deep Signal', '2026-03-14T11:00:00Z');
  assert.match(a, /^deep-signal-2026-03-14-[a-f0-9]{4}$/);
  assert.notEqual(a, b);
});
