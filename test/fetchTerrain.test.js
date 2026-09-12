import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashToken } from '../src/lib/tokens.js';
import { handleEventFetchTerrain } from '../src/routes/admin/events.js';
import { handleCrewEventFetchTerrain } from '../src/routes/crew.js';

function withFetch(impl, fn) {
  const original = global.fetch;
  global.fetch = impl;
  return fn().finally(() => {
    global.fetch = original;
  });
}

const OK_GEOCODE_AND_ELEVATION = async (url) => {
  if (String(url).includes('nominatim')) {
    return { ok: true, json: async () => [{ lat: '-35.30', lon: '149.12' }] };
  }
  const points = new URL(url).searchParams.get('locations').split('|');
  return { ok: true, json: async () => ({ status: 'OK', results: points.map(() => ({ elevation: 580 })) }) };
};

// A minimal in-memory stand-in for env.DB, pattern-matching the exact
// statement shapes both fetch-terrain handlers issue.
function fakeDb({ crews = [], events }) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith('SELECT * FROM crews WHERE key_hash = ?')) {
                return crews.find((c) => c.key_hash === args[0]) || null;
              }
              if (sql.startsWith('SELECT id, venue_name, venue_address, location_tba FROM events WHERE id = ?')) {
                const event = events.find((e) => e.id === args[0]);
                if (!event) return null;
                return { id: event.id, venue_name: event.venue_name, venue_address: event.venue_address, location_tba: event.location_tba };
              }
              if (sql.includes('FROM events LEFT JOIN crews') && sql.includes('events.crew_id = ?')) {
                const [id, crewId] = args;
                return events.find((e) => e.id === id && e.crew_id === crewId) || null;
              }
              throw new Error(`fakeDb: unhandled first() for: ${sql}`);
            },
            async run() {
              if (sql.startsWith('UPDATE events SET venue_lat = ?, venue_lng = ?, elevation_grid = ?')) {
                const [lat, lng, grid, id] = args;
                Object.assign(events.find((e) => e.id === id), { venue_lat: lat, venue_lng: lng, elevation_grid: grid });
                return {};
              }
              throw new Error(`fakeDb: unhandled run() for: ${sql}`);
            },
          };
        },
      };
    },
  };
}

test('admin fetch-terrain geocodes and stores the grid for a disclosed venue', async () => {
  const events = [{ id: 'evt_1', venue_name: 'Sideway', venue_address: '1 Lonsdale St', location_tba: 0 }];
  const env = { DB: fakeDb({ events }) };

  await withFetch(OK_GEOCODE_AND_ELEVATION, async () => {
    const request = new Request('http://localhost/admin/events/evt_1/fetch-terrain', { method: 'POST' });
    const response = await handleEventFetchTerrain(request, env, {}, 'evt_1');
    assert.equal(response.status, 303);
  });

  const event = events[0];
  assert.equal(event.venue_lat, -35.3);
  assert.equal(event.venue_lng, 149.12);
  assert.equal(JSON.parse(event.elevation_grid).values.length, 81);
});

test('admin fetch-terrain does nothing for a location_tba event', async () => {
  const events = [{ id: 'evt_1', venue_name: null, venue_address: null, location_tba: 1 }];
  const env = { DB: fakeDb({ events }) };
  let fetchCalled = false;

  await withFetch(async (...args) => { fetchCalled = true; return OK_GEOCODE_AND_ELEVATION(...args); }, async () => {
    const request = new Request('http://localhost/admin/events/evt_1/fetch-terrain', { method: 'POST' });
    await handleEventFetchTerrain(request, env, {}, 'evt_1');
  });

  assert.equal(fetchCalled, false);
  assert.equal(events[0].elevation_grid, undefined);
});

async function setupCrew({ locationTba = false } = {}) {
  const key = 'test-crew-key';
  const crew = { id: 'crw_1', name: 'Low Frequency Society', key_hash: await hashToken(key) };
  const event = {
    id: 'evt_1', crew_id: crew.id, venue_name: 'Sideway', venue_address: '1 Lonsdale St',
    location_tba: locationTba ? 1 : 0, elevation_grid: null,
  };
  const env = { DB: fakeDb({ crews: [crew], events: [event] }) };
  return { env, key, event };
}

function postJson(body) {
  return new Request('http://localhost/api/crew/events/evt_1/fetch-terrain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('crew fetch-terrain geocodes and returns an updated flyer payload', async () => {
  const { env, key, event } = await setupCrew();

  const result = await withFetch(OK_GEOCODE_AND_ELEVATION, () => handleCrewEventFetchTerrain(postJson({ key }), env, 'evt_1').then((r) => r.json()));

  assert.equal(result.ok, true);
  assert.equal(result.terrainFetched, true);
  assert.equal(JSON.parse(event.elevation_grid).values.length, 81);
});

test('crew fetch-terrain refuses a location_tba event', async () => {
  const { env, key } = await setupCrew({ locationTba: true });

  const result = await handleCrewEventFetchTerrain(postJson({ key }), env, 'evt_1').then((r) => r.json());

  assert.equal(result.ok, false);
});

test('crew fetch-terrain reports failure when geocoding finds nothing', async () => {
  const { env, key } = await setupCrew();

  const result = await withFetch(async () => ({ ok: true, json: async () => [] }), () => handleCrewEventFetchTerrain(postJson({ key }), env, 'evt_1').then((r) => r.json()));

  assert.equal(result.ok, false);
});
