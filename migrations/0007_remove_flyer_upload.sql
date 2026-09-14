-- Flyer uploads removed entirely, owner request: the site only ever
-- shows the generated contour map now, for crews, the public submission
-- form and admin alike. flyer_key/flyer_thumb_key (R2 keys for an
-- uploaded image) are dead columns now that nothing writes or reads them.
ALTER TABLE events DROP COLUMN flyer_key;
ALTER TABLE events DROP COLUMN flyer_thumb_key;
