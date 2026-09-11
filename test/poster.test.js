import assert from 'node:assert/strict';
import { test } from 'node:test';
import { posterPage } from '../src/templates/poster.js';

test('posterPage embeds a real SVG QR code pointing at the home URL', () => {
  const page = String(posterPage('https://example.com/', 'a4'));
  assert.match(page, /<svg/);
  assert.match(page, /<path d="/);
  assert.match(page, /example\.com/);
});

test('posterPage sizes the sheet and @page rule for A6', () => {
  const page = String(posterPage('https://example.com/', 'a6'));
  assert.match(page, /width: 105mm/);
  assert.match(page, /height: 148mm/);
  assert.match(page, /@page \{ size: A6/);
});

test('posterPage sizes the sheet and @page rule for A4', () => {
  const page = String(posterPage('https://example.com/', 'a4'));
  assert.match(page, /width: 210mm/);
  assert.match(page, /height: 297mm/);
  assert.match(page, /@page \{ size: A4/);
});
