-- Initial schema. See SPEC.md section 5 for the data model this implements.

-- Crews and collectives
CREATE TABLE crews (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  blurb           TEXT,
  links_json      TEXT,              -- [{label, url}], any links the crew wants
  key_hash        TEXT UNIQUE,       -- SHA-256 of crew key, NULL if no key issued
  trusted         INTEGER NOT NULL DEFAULT 0,
  listed          INTEGER NOT NULL DEFAULT 1,  -- show on crews page
  key_issued_at   TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Events
CREATE TABLE events (
  id                    TEXT PRIMARY KEY,
  slug                  TEXT UNIQUE NOT NULL,   -- e.g. deep-signal-2026-03-14-k3f9
  title                 TEXT,
  crew_id               TEXT REFERENCES crews(id),
  presented_by          TEXT,                   -- free text when crew not in crews table
  start_at              TEXT,
  end_at                TEXT,
  venue_name            TEXT,
  venue_address         TEXT,
  location_tba          INTEGER NOT NULL DEFAULT 0,
  location_reveal_at    TEXT,                   -- when location will be announced
  location_how_to_find  TEXT,                   -- e.g. "Emailed to ticket holders"
  location_revealed_at  TEXT,                   -- set when TBA becomes a real location
  genres                TEXT,                   -- free text
  price_text            TEXT,                   -- free text, e.g. "$20 presale, $30 door"
  lineup                TEXT,                   -- one act per line
  ticket_url            TEXT,
  notes                 TEXT,                   -- event page only, not on card
  flyer_key             TEXT,                   -- R2 key, large
  flyer_thumb_key       TEXT,                   -- R2 key, small
  age_restriction       TEXT NOT NULL DEFAULT 'unknown'
                        CHECK (age_restriction IN ('18+','all_ages','unknown')),
  status                TEXT NOT NULL DEFAULT 'on'
                        CHECK (status IN ('on','cancelled','sold_out','postponed')),
  visibility            TEXT NOT NULL DEFAULT 'pending'
                        CHECK (visibility IN ('pending','published','rejected','removed')),
  source                TEXT NOT NULL
                        CHECK (source IN ('admin','public','crew','email')),
  submitter_contact     TEXT,                   -- PRIVATE, admin only, never rendered publicly
  edit_token_hash       TEXT UNIQUE,            -- SHA-256 of edit token
  sequence              INTEGER NOT NULL DEFAULT 0,  -- bumps on every published change (ics)
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  published_at          TEXT
);
CREATE INDEX idx_events_visibility_start ON events (visibility, start_at);
CREATE INDEX idx_events_crew ON events (crew_id);

-- Proposed changes to published events, and removal or cancellation requests
CREATE TABLE event_changes (
  id             TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL REFERENCES events(id),
  kind           TEXT NOT NULL CHECK (kind IN ('edit','cancel_request','removal_request')),
  proposed_json  TEXT,               -- full proposed field set for edits
  reason         TEXT,
  via            TEXT NOT NULL CHECK (via IN ('edit_link','crew_key','public_report')),
  state          TEXT NOT NULL DEFAULT 'pending'
                 CHECK (state IN ('pending','approved','rejected')),
  created_at     TEXT NOT NULL,
  decided_at     TEXT
);

-- Emails received at events@domain
CREATE TABLE inbound_emails (
  id                TEXT PRIMARY KEY,
  received_at       TEXT NOT NULL,
  from_address      TEXT,
  subject           TEXT,
  text_body         TEXT,
  attachments_json  TEXT,            -- [{r2_key, filename, content_type, size}]
  state             TEXT NOT NULL DEFAULT 'new'
                    CHECK (state IN ('new','converted','dismissed')),
  event_id          TEXT REFERENCES events(id)
);

-- Contact form messages
CREATE TABLE contact_messages (
  id             TEXT PRIMARY KEY,
  created_at     TEXT NOT NULL,
  name           TEXT,
  reply_contact  TEXT,               -- optional, private
  message        TEXT NOT NULL,
  event_id       TEXT REFERENCES events(id),   -- set when sent from "something wrong with this listing"
  state          TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new','done'))
);

-- Harm reduction links, editable in admin
CREATE TABLE harm_reduction_links (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  url              TEXT,
  phone            TEXT,
  description      TEXT,
  region           TEXT NOT NULL CHECK (region IN ('ACT','NSW','National')),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  last_checked_at  TEXT NOT NULL
);

-- First-party analytics, daily aggregates only, no personal data
CREATE TABLE daily_counts (
  day         TEXT NOT NULL,          -- YYYY-MM-DD in Canberra time
  metric      TEXT NOT NULL,          -- see SPEC.md section 11
  subject_id  TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, subject_id)
);

-- Rate limiting: daily-rotating salted hash of the client IP, never the raw IP.
CREATE TABLE rate_limits (
  bucket      TEXT NOT NULL,          -- e.g. "submit", "crew_key", "contact"
  key_hash    TEXT NOT NULL,          -- salted hash of IP, rotated daily
  day         TEXT NOT NULL,          -- YYYY-MM-DD in Canberra time
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key_hash, day)
);
