// Flyer engine test fixtures, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 14.
// Shaped like a raw `events` row (optionally joined with crews.name AS
// crew_name), since that's what render() takes. Used by both
// scripts/flyer-contact-sheet.js and test/flyers.test.js so the two never
// drift apart.

const base = {
  seed_salt: 0,
  crew_name: null,
  presented_by: null,
  location_tba: 0,
  location_reveal_at: null,
  location_how_to_find: null,
  location_revealed_at: null,
  age_restriction: 'unknown',
  status: 'on',
  flyer_template: null,
};

export const FIXTURES = {
  full: {
    ...base,
    id: 'evt_full00000000000001',
    title: 'Subterranean 004',
    crew_name: 'Low Frequency Society',
    start_at: '2026-03-14T11:00:00.000Z',
    end_at: '2026-03-14T19:00:00.000Z',
    venue_name: 'Sideway',
    venue_address: '1 Lonsdale St, Braddon',
    genres: 'dubstep, 140',
    lineup: 'Deep Signal\nKylo B2B Mantis\nResidents',
    age_restriction: '18+',
  },

  minimal: {
    ...base,
    id: 'evt_minimal000000000001',
    title: 'Untitled Night',
    start_at: '2026-06-01T11:00:00.000Z',
  },

  idOnly: {
    ...base,
    id: 'evt_idonly0000000000001',
    title: null,
    start_at: '2026-06-01T11:00:00.000Z',
  },

  longNames: {
    ...base,
    id: 'evt_longnames000000001',
    title: 'A Very Long Night Title That Keeps Going',
    start_at: '2026-04-01T11:00:00.000Z',
    venue_name: 'The Longest Named Venue In The Whole Territory',
    genres: 'techno',
    lineup: 'Sunburst Collective B2B Low Frequency Society\nAnother Fairly Long Act Name\nThird',
  },

  longLineup: {
    ...base,
    id: 'evt_longlineup0000001',
    title: 'All Dayer',
    start_at: '2026-05-01T02:00:00.000Z',
    genres: 'house',
    lineup: Array.from({ length: 12 }, (_, i) => `Act ${i + 1}`).join('\n'),
  },

  tba: {
    ...base,
    id: 'evt_tba00000000000001',
    title: 'Warehouse Thing',
    start_at: '2026-07-01T11:00:00.000Z',
    genres: 'warehouse',
    location_tba: 1,
    location_reveal_at: '1 week before',
    location_how_to_find: 'Emailed to ticket holders',
  },

  cancelled: {
    ...base,
    id: 'evt_cancelled00000001',
    title: 'Deep Signal',
    crew_name: 'Low Frequency Society',
    start_at: '2026-03-14T11:00:00.000Z',
    venue_name: 'Sideway',
    genres: 'dubstep',
    lineup: 'Deep Signal\nSupport Act',
    status: 'cancelled',
  },

  past: {
    ...base,
    id: 'evt_past0000000000001',
    title: 'Deep Signal',
    crew_name: 'Low Frequency Society',
    start_at: '2025-01-01T11:00:00.000Z',
    end_at: '2025-01-01T19:00:00.000Z',
    venue_name: 'Sideway',
    genres: 'dubstep',
    lineup: 'Deep Signal\nSupport Act',
  },

  unicode: {
    ...base,
    id: 'evt_unicode000000001',
    title: 'Zoë & Café Résumé',
    start_at: '2026-03-01T11:00:00.000Z',
    genres: 'techno',
    lineup: 'Zoë\nMüller & Søn\nBjörk B2B Zoë',
  },

  singleAct: {
    ...base,
    id: 'evt_singleact000001',
    title: 'Solo Night',
    start_at: '2026-08-01T11:00:00.000Z',
    lineup: 'Solo Act',
  },
};

export const FIXTURE_NOW = new Date('2026-01-15T00:00:00.000Z');
