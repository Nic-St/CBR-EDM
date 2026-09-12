-- Flyer engine columns, PROJECT-C-EDM-FLYER-ENGINE-SPEC.md section 4.3.
-- seed_salt: bumped by the admin "Reroll" button, the only way a
-- generated flyer changes appearance without a data or engine change.
-- flyer_template: an explicit admin choice; null means auto-route by genre.

ALTER TABLE events ADD COLUMN seed_salt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN flyer_template TEXT;
