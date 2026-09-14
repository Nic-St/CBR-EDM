import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashToken } from '../src/lib/tokens.js';
import {
  handleCrewEventFlyer, handleCrewEventFlyerTemplate, handleCrewEventRerollFlyer,
} from '../src/routes/crew.js';

// A minimal in-memory stand-in for env.DB, pattern-matching the exact
// statement shapes the three flyer handlers in src/routes/crew.js issue.
function fakeDb({ crews, events }) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith('SELECT * FROM crews WHERE key_hash = ?')) {
                return crews.find((c) => c.key_hash === args[0]) || null;
              }
              if (sql.includes('FROM events LEFT JOIN crews') && sql.includes('events.crew_id = ?')) {
                const [id, crewId] = args;
                const event = events.find((e) => e.id === id && e.crew_id === crewId);
                if (!event) return null;
                const crew = crews.find((c) => c.id === event.crew_id);
                return { ...event, crew_name: crew ? crew.name : null };
              }
              throw new Error(`fakeDb: unhandled first() for: ${sql}`);
            },
            async run() {
              if (sql.startsWith('UPDATE events SET flyer_template = ?')) {
                const [flyerTemplate, id] = args;
                events.find((e) => e.id === id).flyer_template = flyerTemplate;
                return {};
              }
              if (sql.startsWith('UPDATE events SET seed_salt = ?')) {
                const [seedSalt, id] = args;
                events.find((e) => e.id === id).seed_salt = seedSalt;
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

async function setup(eventOverrides = {}) {
  const key = 'test-crew-key';
  const crew = { id: 'crw_1', name: 'Low Frequency Society', key_hash: await hashToken(key) };
  const event = {
    id: 'evt_1',
    crew_id: crew.id,
    title: 'Deep Signal',
    start_at: '2026-06-01T12:00:00.000Z',
    genres: 'techno',
    lineup: 'DJ One\nDJ Two',
    venue_name: 'Sideway',
    flyer_template: null,
    flyer_thumb_key: null,
    seed_salt: 0,
    ...eventOverrides,
  };
  const env = { DB: fakeDb({ crews: [crew], events: [event] }) };
  return { env, key, event };
}

function postJson(body) {
  return new Request('http://localhost/api/crew/events/x/flyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('a crew can preview the auto-routed flyer for its own event', async () => {
  const { env, key, event } = await setup();
  const result = await handleCrewEventFlyer(postJson({ key }), env, event.id).then((r) => r.json());

  assert.equal(result.ok, true);
  assert.equal(result.current, null);
  assert.equal(result.auto.id, 'contour');
  assert.equal(result.templates.length, 1);
  assert.ok(result.svg.startsWith('<svg'));
});

test('an uploaded flyer suppresses the generated preview', async () => {
  const { env, key, event } = await setup({ flyer_thumb_key: 'evt_1/flyer.webp' });
  const result = await handleCrewEventFlyer(postJson({ key }), env, event.id).then((r) => r.json());

  assert.equal(result.ok, true);
  assert.equal(result.svg, null);
});

test('a crew can set an explicit template for its own event', async () => {
  const { env, key, event } = await setup();
  const result = await handleCrewEventFlyerTemplate(postJson({ key, template: 'contour' }), env, event.id).then((r) => r.json());

  assert.equal(result.current, 'contour');
  assert.equal(event.flyer_template, 'contour');
});

test('an unrecognised template value is treated as Auto', async () => {
  const { env, key, event } = await setup();
  const result = await handleCrewEventFlyerTemplate(postJson({ key, template: 'not-a-real-template' }), env, event.id).then((r) => r.json());

  assert.equal(result.current, null);
  assert.equal(event.flyer_template, null);
});

test('a crew cannot set a template on an event it does not own', async () => {
  const { env, key } = await setup();
  const result = await handleCrewEventFlyerTemplate(postJson({ key, template: 'contour' }), env, 'evt_someone_elses').then((r) => r.json());

  assert.equal(result.ok, false);
});

test('reroll bumps seed_salt and changes the rendered flyer', async () => {
  const { env, key, event } = await setup();
  const before = await handleCrewEventFlyer(postJson({ key }), env, event.id).then((r) => r.json());
  const after = await handleCrewEventRerollFlyer(postJson({ key }), env, event.id).then((r) => r.json());

  assert.equal(event.seed_salt, 1);
  assert.notEqual(before.svg, after.svg);
});
