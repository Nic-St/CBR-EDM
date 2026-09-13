import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleEventPublish } from '../src/routes/admin/events.js';

// A minimal in-memory stand-in for env.DB, just enough to drive the four
// statements handleEventPublish and its freezeFlyerTemplate helper issue.
// Not a general D1 mock: it pattern-matches the exact statement shapes in
// src/routes/admin/events.js, so a change to those queries should update
// this alongside it.
function fakeDb(rows) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith('SELECT * FROM events WHERE id = ?')) {
                return rows.find((r) => r.id === args[0]) || null;
              }
              throw new Error(`fakeDb: unhandled first() for: ${sql}`);
            },
            async all() {
              if (sql.includes("SELECT flyer_template FROM events WHERE visibility = 'published'")) {
                const [excludeId] = args;
                const results = rows
                  .filter((r) => r.visibility === 'published' && r.id !== excludeId)
                  .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
                  .slice(0, 3)
                  .map((r) => ({ flyer_template: r.flyer_template }));
                return { results };
              }
              throw new Error(`fakeDb: unhandled all() for: ${sql}`);
            },
            async run() {
              if (sql.startsWith("UPDATE events SET visibility = 'published'")) {
                const [publishedAt, updatedAt, id] = args;
                const row = rows.find((r) => r.id === id);
                row.visibility = 'published';
                row.published_at = row.published_at || publishedAt;
                row.updated_at = updatedAt;
                return {};
              }
              if (sql.startsWith('UPDATE events SET flyer_template = ?')) {
                const [flyerTemplate, id] = args;
                rows.find((r) => r.id === id).flyer_template = flyerTemplate;
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

function pendingEvent(overrides = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    title: 'Test Night',
    start_at: '2026-06-01T12:00:00.000Z',
    genres: 'techno',
    lineup: 'DJ One\nDJ Two',
    venue_name: 'Sideway',
    visibility: 'pending',
    published_at: null,
    flyer_template: null,
    seed_salt: 0,
    ...overrides,
  };
}

test('publishing an event with no explicit template freezes the auto-routed choice', async () => {
  const event = pendingEvent();
  const env = { DB: fakeDb([event]) };
  const request = new Request('http://localhost/admin/events/x/publish', { method: 'POST' });

  await handleEventPublish(request, env, {}, event.id);

  assert.equal(event.visibility, 'published');
  assert.equal(event.flyer_template, 'contour');
});

test('publishing does not touch an explicit flyer_template', async () => {
  const event = pendingEvent({ flyer_template: 'ransom' });
  const env = { DB: fakeDb([event]) };
  const request = new Request('http://localhost/admin/events/x/publish', { method: 'POST' });

  await handleEventPublish(request, env, {}, event.id);

  assert.equal(event.flyer_template, 'ransom');
});

test('the fourth event in a row nudges away from three-in-a-row', async () => {
  const now = Date.now();
  const priorPublished = ['consignment', 'consignment', 'consignment'].map((t, i) => pendingEvent({
    id: `prior${i}`,
    visibility: 'published',
    published_at: new Date(now - (3 - i) * 1000).toISOString(),
    flyer_template: t,
  }));
  const event = pendingEvent();
  const env = { DB: fakeDb([...priorPublished, event]) };
  const request = new Request('http://localhost/admin/events/x/publish', { method: 'POST' });

  await handleEventPublish(request, env, {}, event.id);

  assert.notEqual(event.flyer_template, 'consignment');
});
