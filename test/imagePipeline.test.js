import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isWebp, validateFlyerUpload, MAX_LARGE_BYTES } from '../src/lib/imagePipeline.js';

function webpBuffer(extraBytes = 100) {
  const buf = new Uint8Array(12 + extraBytes);
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  buf.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  return buf.buffer;
}

test('isWebp recognises a valid RIFF/WEBP header', () => {
  assert.equal(isWebp(webpBuffer()), true);
});

test('isWebp rejects a non-WebP buffer', () => {
  const buf = new Uint8Array(20).fill(0);
  assert.equal(isWebp(buf.buffer), false);
});

test('isWebp rejects a too-short buffer', () => {
  assert.equal(isWebp(new Uint8Array(4).buffer), false);
});

function fakeFile(buffer, size = buffer.byteLength) {
  return {
    size,
    arrayBuffer: async () => buffer,
  };
}

test('validateFlyerUpload accepts a valid, small enough WebP file', async () => {
  const result = await validateFlyerUpload(fakeFile(webpBuffer()), MAX_LARGE_BYTES);
  assert.equal(result.ok, true);
});

test('validateFlyerUpload rejects an oversized file before reading it', async () => {
  const result = await validateFlyerUpload(fakeFile(webpBuffer(), MAX_LARGE_BYTES + 1), MAX_LARGE_BYTES);
  assert.equal(result.ok, false);
  assert.match(result.error, /too large/);
});

test('validateFlyerUpload rejects a non-WebP file even if small', async () => {
  const notWebp = new Uint8Array(50).fill(1).buffer;
  const result = await validateFlyerUpload(fakeFile(notWebp), MAX_LARGE_BYTES);
  assert.equal(result.ok, false);
  assert.match(result.error, /not a valid WebP/);
});

test('validateFlyerUpload rejects a missing file', async () => {
  const result = await validateFlyerUpload(null, MAX_LARGE_BYTES);
  assert.equal(result.ok, false);
});
