-- Equal billing, owner request: a lot of small community events put the
-- same emphasis on every act's name rather than one headliner -- this flag
-- lets the flyer engine (contour.js) render every act at the same size
-- instead of picking acts[0] as a big headliner with everyone else smaller.

ALTER TABLE events ADD COLUMN lineup_equal_billing INTEGER NOT NULL DEFAULT 0;
