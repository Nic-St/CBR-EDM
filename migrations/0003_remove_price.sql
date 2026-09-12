-- Price is dropped site-wide, owner request: the ticket link already
-- carries pricing, and tiered prices (presale/door, member/guest...)
-- printed flat were confusing.

ALTER TABLE events DROP COLUMN price_text;
