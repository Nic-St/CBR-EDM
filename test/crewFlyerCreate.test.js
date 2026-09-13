import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashToken } from '../src/lib/tokens.js';
import { handleCrewFlyerPreview, handleCrewEventCreate } from '../src/routes/crew.js';

// A minimal in-memory stand-in for env.DB, pattern-matching the exact
// statement shapes handleCrewEventCreate and freezeFlyerTemplate issue.
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
              throw new Error(`fakeDb: unhandled first() for: ${sql}`);
            },
            async all() {
              if (sql.includes("SELECT flyer_template FROM events WHERE visibility = 'published'")) {
                const [excludeId] = args;
                const results = events
                  .filter((e) => e.visibility === 'published' && e.id !== excludeId)
                  .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
                  .slice(0, 3)
                  .map((e) => ({ flyer_template: e.flyer_template }));
                return { results };
              }
              throw new Error(`fakeDb: unhandled all() for: ${sql}`);
            },
            async run() {
              if (sql.startsWith('INSERT INTO events')) {
                const [id, slug, title, crewId, startAt, endAt, venueName, venueAddress, genres, lineup,
                  ticketUrl, notes, ageRestriction, visibility, publishedFlag, createdAt, updatedAt,
                  publishedAt, flyerTemplate] = args;
                events.push({
                  id, slug, title, crew_id: crewId, start_at: startAt, end_at: endAt, venue_name: venueName,
                  venue_address: venueAddress, genres, lineup, ticket_url: ticketUrl, notes,
                  age_restriction: ageRestriction, status: 'on', visibility, published: publishedFlag,
                  created_at: createdAt, updated_at: updatedAt, published_at: publishedAt,
                  flyer_template: flyerTemplate, seed_salt: 0, flyer_thumb_key: null,
                });
                return {};
              }
              if (sql.startsWith('UPDATE events SET flyer_template = ?')) {
                const [flyerTemplate, id] = args;
                events.find((e) => e.id === id).flyer_template = flyerTemplate;
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

async function setup({ trusted = false, priorPublished = [] } = {}) {
  const key = 'test-crew-key';
  const crew = { id: 'crw_1', name: 'Low Frequency Society', key_hash: await hashToken(key), trusted: trusted ? 1 : 0 };
  const events = [...priorPublished];
  const env = { DB: fakeDb({ crews: [crew], events }) };
  return { env, key, crew, events };
}

function postJson(url, body) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('a crew can preview a flyer before the event is saved', async () => {
  const { env, key } = await setup();
  const result = await handleCrewFlyerPreview(postJson('http://localhost/api/crew/flyer-preview', {
    key, title: 'Open Decks', genres: 'house', lineup: 'DJ One\nDJ Two',
    start_at_local: '2026-06-20T22:00', venue_name: 'Kingston Foreshore',
  }), env).then((r) => r.json());

  assert.equal(result.ok, true);
  assert.equal(result.auto.id, 'contour');
  assert.ok(result.svg.startsWith('<svg'));
});

test('an untrusted crew\'s creation-time template choice is stored but the event stays pending', async () => {
  const { env, key } = await setup({ trusted: false });
  const result = await handleCrewEventCreate(postJson('http://localhost/api/crew/events/create', {
    key, title: 'Deep Signal', genres: 'techno', lineup: 'DJ One', start_at_local: '2026-06-01T22:00',
    venue_name: 'Sideway', flyer_template: 'ransom',
  }), env).then((r) => r.json());

  assert.equal(result.ok, true);
  assert.equal(result.published, false);
});

test('a trusted crew publishing at creation gets the anti-repetition freeze applied', async () => {
  const now = Date.now();
  const priorPublished = ['consignment', 'consignment', 'consignment'].map((t, i) => ({
    id: `prior${i}`,
    visibility: 'published',
    published_at: new Date(now - (3 - i) * 1000).toISOString(),
    flyer_template: t,
  }));
  const { env, key, events } = await setup({ trusted: true, priorPublished });

  const result = await handleCrewEventCreate(postJson('http://localhost/api/crew/events/create', {
    key, title: 'Washed Out', genres: 'techno', lineup: 'DJ One', start_at_local: '2026-06-01T22:00',
    venue_name: 'Sideway',
  }), env).then((r) => r.json());

  assert.equal(result.ok, true);
  assert.equal(result.published, true);

  const created = events.find((e) => e.title === 'Washed Out');
  assert.notEqual(created.flyer_template, 'consignment');
});
