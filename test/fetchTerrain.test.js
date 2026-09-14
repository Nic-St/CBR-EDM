import assert from 'node:assert/strict';
import { test } from 'node:test';
import { terrainFieldsFor } from '../src/lib/geocode.js';

function withFetch(impl, fn) {
  const original = global.fetch;
  global.fetch = impl;
  return fn().finally(() => {
    global.fetch = original;
  });
}

const OK_GEOCODE_AND_ELEVATION = async (url) => {
  if (String(url).includes('nominatim')) {
    return { ok: true, json: async () => [{ lat: '-35.30', lon: '149.12', place_rank: 26, addresstype: 'road' }] };
  }
  const points = new URL(url).searchParams.get('locations').split('|');
  return { ok: true, json: async () => ({ status: 'OK', results: points.map(() => ({ elevation: 580 })) }) };
};

// terrainFieldsFor replaces the old manual "Fetch real terrain" button
// (owner decision, 2026-09-14): every save with a real, disclosed venue
// tries to fetch real terrain automatically; only location_tba skips it.
// Called from handleEventCreate/handleEventUpdate (admin), handleCrewEventCreate/
// handleCrewEventUpdate (crew), the public submission and self-edit routes,
// and the change-approval flow -- tested here in isolation rather than once
// per call site.

test('terrainFieldsFor geocodes and returns the grid for a disclosed venue', async () => {
  await withFetch(OK_GEOCODE_AND_ELEVATION, async () => {
    const result = await terrainFieldsFor({ location_tba: 0, venue_name: 'Sideway', venue_address: '1 Lonsdale St' });
    assert.equal(result.venue_lat, -35.3);
    assert.equal(result.venue_lng, 149.12);
    assert.equal(JSON.parse(result.elevation_grid).values.length, 81);
  });
});

test('terrainFieldsFor never fetches, and clears any existing terrain, for a location_tba event', async () => {
  let fetchCalled = false;
  await withFetch(async (...args) => { fetchCalled = true; return OK_GEOCODE_AND_ELEVATION(...args); }, async () => {
    const result = await terrainFieldsFor(
      { location_tba: 1, venue_name: null, venue_address: null },
      { venue_lat: -35.3, venue_lng: 149.12, elevation_grid: '{"size":9}' },
    );
    assert.deepEqual(result, { venue_lat: null, venue_lng: null, elevation_grid: null });
  });
  assert.equal(fetchCalled, false);
});

test('terrainFieldsFor keeps existing terrain (does not fetch) when there is no venue text and it is not TBA', async () => {
  let fetchCalled = false;
  await withFetch(async (...args) => { fetchCalled = true; return OK_GEOCODE_AND_ELEVATION(...args); }, async () => {
    const existing = { venue_lat: -35.3, venue_lng: 149.12, elevation_grid: '{"size":9}' };
    const result = await terrainFieldsFor({ location_tba: 0, venue_name: null, venue_address: null }, existing);
    assert.deepEqual(result, existing);
  });
  assert.equal(fetchCalled, false);
});

test('terrainFieldsFor keeps existing terrain when the fetch fails, rather than erasing it', async () => {
  const existing = { venue_lat: -35.3, venue_lng: 149.12, elevation_grid: '{"size":9}' };
  const result = await withFetch(async () => ({ ok: true, json: async () => [] }), () => terrainFieldsFor(
    { location_tba: 0, venue_name: 'Sideway', venue_address: '1 Lonsdale St' },
    existing,
  ));
  assert.deepEqual(result, existing);
});

test('terrainFieldsFor overwrites existing terrain with a fresh fetch', async () => {
  const existing = { venue_lat: 1, venue_lng: 2, elevation_grid: '{"size":1}' };
  const result = await withFetch(OK_GEOCODE_AND_ELEVATION, () => terrainFieldsFor(
    { location_tba: 0, venue_name: 'Sideway', venue_address: '1 Lonsdale St' },
    existing,
  ));
  assert.equal(result.venue_lat, -35.3);
  assert.equal(result.venue_lng, 149.12);
});
