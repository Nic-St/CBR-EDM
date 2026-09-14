-- Small generic key/value store for admin-editable page copy that used to
-- be hardcoded, starting with the harm reduction page's intro text.
CREATE TABLE site_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
