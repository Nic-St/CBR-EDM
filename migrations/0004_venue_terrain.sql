-- Real-world terrain for the contour flyer template, owner request.
-- Geocoded once (an explicit action, not on every save) and cached here
-- rather than fetched live at render time, since flyer rendering must
-- stay synchronous. Never populated for a location_tba event.
ALTER TABLE events ADD COLUMN venue_lat REAL;
ALTER TABLE events ADD COLUMN venue_lng REAL;
ALTER TABLE events ADD COLUMN elevation_grid TEXT;
