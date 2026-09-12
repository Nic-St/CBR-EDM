-- Local-only seed data. Every name, crew and flyer reference here is fictional.
-- Timestamps are illustrative UTC conversions of Canberra local time (not
-- adjusted precisely for daylight saving) -- good enough for local dev,
-- never used against a remote database.

DELETE FROM daily_counts;
DELETE FROM rate_limits;
DELETE FROM contact_messages;
DELETE FROM inbound_emails;
DELETE FROM event_changes;
DELETE FROM events;
DELETE FROM crews;
DELETE FROM harm_reduction_links;

-- Crews -----------------------------------------------------------------

INSERT INTO crews (id, slug, name, blurb, links_json, key_hash, trusted, listed, key_issued_at, created_at, updated_at) VALUES
('crw_static_freq01', 'static-frequency', 'Static Frequency', 'Dub and bass, low light, loud sound.', '[{"label":"Instagram","url":"https://instagram.com/example"}]', NULL, 1, 1, NULL, '2026-01-05T09:00:00Z', '2026-01-05T09:00:00Z'),
('crw_concrete_drft1', 'concrete-drift', 'Concrete Drift', 'Warehouse nights, occasional daytime wander.', '[]', NULL, 1, 1, NULL, '2026-01-10T09:00:00Z', '2026-01-10T09:00:00Z'),
('crw_nightbus_coll1', 'nightbus-collective', 'Nightbus Collective', 'New crew, still finding a room.', '[]', NULL, 0, 1, NULL, '2026-06-01T09:00:00Z', '2026-06-01T09:00:00Z'),
('crw_unlisted_test1', 'unlisted-test-crew', 'Unlisted Test Crew', 'Exists only to test listed = 0.', '[]', NULL, 0, 0, NULL, '2026-06-01T09:00:00Z', '2026-06-01T09:00:00Z');

-- Events ------------------------------------------------------------------

-- 1. Past, published, full details, 18+, has flyer keys (files need not exist locally)
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_deepsignal0314', 'deep-signal-2026-03-14', 'Deep Signal', 'crw_static_freq01', NULL, '2026-03-14T11:00:00Z', '2026-03-14T17:00:00Z', 'The Basement', '1 Example St, Braddon ACT', 0, NULL, NULL, NULL, 'Dub, bass', 'DJ Fictional
MC Placeholder
Static Frequency b2b', 'https://example.com/tickets/deep-signal', 'Bring earplugs, it gets loud.', 'seed/deep-signal-large.webp', 'seed/deep-signal-thumb.webp', '18+', 'on', 'published', 'admin', NULL, NULL, 3, '2026-02-01T09:00:00Z', '2026-02-20T09:00:00Z', '2026-02-01T09:00:00Z');

-- 2. Past, cancelled, stays visible with stamp
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_cancelled0502', 'washed-out-2026-05-02', 'Washed Out', 'crw_concrete_drft1', NULL, '2026-05-02T10:00:00Z', NULL, 'Warehouse 7', 'Fyshwick ACT', 0, NULL, NULL, NULL, 'Techno', 'Concrete Drift residents', NULL, 'Cancelled due to venue availability.', NULL, NULL, 'unknown', 'cancelled', 'published', 'admin', NULL, NULL, 2, '2026-04-01T09:00:00Z', '2026-04-25T09:00:00Z', '2026-04-01T09:00:00Z');

-- 3. Past, no flyer, all ages, free text presented_by
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_daylistgather1', 'daylight-gathering-2026-06-20', 'Daylight Gathering', NULL, 'Various local DJs', '2026-06-20T02:00:00Z', '2026-06-20T08:00:00Z', 'Kingston Foreshore', 'Kingston ACT', 0, NULL, NULL, NULL, 'House', 'Open decks', NULL, NULL, NULL, NULL, 'all_ages', 'on', 'published', 'admin', NULL, NULL, 1, '2026-06-01T09:00:00Z', '2026-06-01T09:00:00Z', '2026-06-01T09:00:00Z');

-- 4. Past, location was TBA and later revealed
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_signalflare0725', 'signal-flare-2026-07-25', 'Signal Flare', 'crw_static_freq01', NULL, '2026-07-25T11:00:00Z', '2026-07-25T16:00:00Z', 'Undisclosed Warehouse', 'Emailed to ticket holders on the day', 0, NULL, 'Emailed to ticket holders', '2026-07-20T09:00:00Z', 'Bass, jungle', 'DJ Fictional
MC Placeholder
Guest TBA
Static Frequency all night', NULL, NULL, NULL, NULL, 'unknown', 'on', 'published', 'admin', NULL, NULL, 2, '2026-07-01T09:00:00Z', '2026-07-20T09:00:00Z', '2026-07-01T09:00:00Z');

-- 5. Coming up, location TBA, not yet revealed
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_lowfreq0919', 'low-frequency-2026-09-19', 'Low Frequency', 'crw_nightbus_coll1', NULL, '2026-09-19T12:00:00Z', NULL, NULL, NULL, 1, '2026-09-17', 'Posted to the wall a day before', NULL, 'Dubstep', 'Nightbus Collective', 'https://example.com/tickets/low-frequency', NULL, NULL, NULL, 'unknown', 'on', 'published', 'admin', NULL, NULL, 1, '2026-08-15T09:00:00Z', '2026-08-15T09:00:00Z', '2026-08-15T09:00:00Z');

-- 6. Coming up, sold out
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_soldout1003', 'undertow-2026-10-03', 'Undertow', 'crw_static_freq01', NULL, '2026-10-02T13:00:00Z', '2026-10-02T18:00:00Z', 'The Basement', '1 Example St, Braddon ACT', 0, NULL, NULL, NULL, 'Bass', 'Static Frequency residents', 'https://example.com/tickets/undertow', NULL, NULL, NULL, '18+', 'sold_out', 'published', 'admin', NULL, NULL, 2, '2026-09-01T09:00:00Z', '2026-09-10T09:00:00Z', '2026-09-01T09:00:00Z');

-- 7. Coming up, postponed
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_postponed1010', 'aftershock-2026-10-10', 'Aftershock', 'crw_concrete_drft1', NULL, '2026-10-09T13:00:00Z', NULL, 'Warehouse 7', 'Fyshwick ACT', 0, NULL, NULL, NULL, 'Techno', 'Concrete Drift residents', NULL, 'New date to be announced.', NULL, NULL, 'unknown', 'postponed', 'published', 'admin', NULL, NULL, 2, '2026-08-20T09:00:00Z', '2026-09-05T09:00:00Z', '2026-08-20T09:00:00Z');

-- 8. Coming up, no flyer
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_noflyer1017', 'plain-notice-2026-10-17', 'Plain Notice', NULL, 'A crew without a flyer yet', '2026-10-16T12:00:00Z', '2026-10-16T15:00:00Z', 'TBC venue', 'Canberra region', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'unknown', 'on', 'published', 'admin', NULL, NULL, 1, '2026-09-01T09:00:00Z', '2026-09-01T09:00:00Z', '2026-09-01T09:00:00Z');

-- 9. Coming up, multi-day event
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_multiday1024', 'concrete-weekender-2026-10-24', 'Concrete Weekender', 'crw_concrete_drft1', NULL, '2026-10-24T05:00:00Z', '2026-10-26T04:00:00Z', 'Warehouse 7', 'Fyshwick ACT', 0, NULL, NULL, NULL, 'Techno, house, bass', 'Concrete Drift and guests', 'https://example.com/tickets/weekender', 'Two nights, one long comedown day between.', NULL, NULL, 'unknown', 'on', 'published', 'admin', NULL, NULL, 1, '2026-09-01T09:00:00Z', '2026-09-01T09:00:00Z', '2026-09-01T09:00:00Z');

-- 10. Coming up, location revealed within the last 7 days (relative to seed date 2026-09-11)
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_dropped0925', 'loose-wire-2026-09-25', 'Loose Wire', 'crw_nightbus_coll1', NULL, '2026-09-25T11:00:00Z', NULL, 'Backstreet Studio', 'Fyshwick ACT', 0, NULL, NULL, '2026-09-08T09:00:00Z', 'Jungle', 'Nightbus Collective', NULL, NULL, NULL, NULL, 'unknown', 'on', 'published', 'admin', NULL, NULL, 2, '2026-08-25T09:00:00Z', '2026-09-08T09:00:00Z', '2026-08-25T09:00:00Z');

-- 11. Pending public submission, private contact, edit link issued
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_pendingpublic1', 'pending-submission-placeholder', 'Untitled submission', NULL, 'Someone from the scene', '2026-11-01T10:00:00Z', NULL, NULL, NULL, 1, NULL, NULL, NULL, 'Bass', NULL, NULL, 'Submitted with barely any details, as the form allows.', NULL, NULL, 'unknown', 'on', 'pending', 'public', 'fake.submitter@example.com', 'fake_edit_token_hash_for_seed_only', 0, '2026-09-10T09:00:00Z', '2026-09-10T09:00:00Z', NULL);

-- 12. Pending crew submission from an untrusted crew
INSERT INTO events (id, slug, title, crew_id, presented_by, start_at, end_at, venue_name, venue_address, location_tba, location_reveal_at, location_how_to_find, location_revealed_at, genres, lineup, ticket_url, notes, flyer_key, flyer_thumb_key, age_restriction, status, visibility, source, submitter_contact, edit_token_hash, sequence, created_at, updated_at, published_at) VALUES
('evt_pendingcrew001', 'pending-crew-placeholder', 'First Try', 'crw_nightbus_coll1', NULL, '2026-11-08T10:00:00Z', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'unknown', 'on', 'pending', 'crew', NULL, NULL, 0, '2026-09-09T09:00:00Z', '2026-09-09T09:00:00Z', NULL);

-- Harm reduction links (seed set, section 15.4 -- owner must verify every entry before launch) ---

INSERT INTO harm_reduction_links (id, title, url, phone, description, region, sort_order, last_checked_at) VALUES
('hrl_cantest_service', 'CanTEST Health and Drug Checking', 'https://cantest.com.au', NULL, 'Free, confidential drug checking at a fixed site in Canberra City. NEEDS VERIFICATION: opening hours.', 'ACT', 1, '2026-01-01T00:00:00Z'),
('hrl_cantest_notices', 'CanTEST community notices', 'https://cantest.com.au', NULL, 'NEEDS VERIFICATION: current notices page URL.', 'ACT', 2, '2026-01-01T00:00:00Z'),
('hrl_act_health_info', 'ACT Health drug checking information', 'https://www.act.gov.au/health/drugs-alcohol-smoking-and-vaping/drug-checking', NULL, 'ACT Government information on drug checking.', 'ACT', 3, '2026-01-01T00:00:00Z'),
('hrl_nsw_health_warn', 'NSW Health drug warnings', NULL, NULL, 'NEEDS VERIFICATION: current URL.', 'NSW', 1, '2026-01-01T00:00:00Z'),
('hrl_nuaa_peer_based', 'NUAA peer-based harm reduction', NULL, NULL, 'NEEDS VERIFICATION: current URL, and whether DanceWize NSW is still operating.', 'NSW', 2, '2026-01-01T00:00:00Z'),
('hrl_poisons_info_ln', 'Poisons Information Centre', NULL, '13 11 26', 'National poisons information line.', 'National', 1, '2026-01-01T00:00:00Z'),
('hrl_adf_drug_facts1', 'Alcohol and Drug Foundation drug facts', NULL, NULL, 'NEEDS VERIFICATION: current URL.', 'National', 2, '2026-01-01T00:00:00Z'),
('hrl_emergency000001', 'Emergency', NULL, '000', 'In an emergency call 000.', 'National', 3, '2026-01-01T00:00:00Z');
