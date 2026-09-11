# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-09-11

### Added
- Repo scaffold: `wrangler.jsonc`, `package.json`, `.gitignore`, Worker entry
  point at `src/index.js`, and `src/config.js` as the single place for site
  name, slogan, acknowledgement text and board column labels.
- D1 schema migration (`migrations/0001_init.sql`) covering crews, events,
  event changes, inbound emails, contact messages, harm reduction links and
  daily analytics counters.
- Fake local-only seed data (`seed/seed.sql`): 4 crews and 12 events covering
  published, pending, cancelled, sold out, postponed, TBA, no-flyer,
  multi-day and recently-revealed-location cases.
- `README.md` with the owner setup checklist, local dev instructions, deploy
  and backup notes, and current Cloudflare free tier limits.
- `DESIGN.md`: the design token plan required before any UI work, checked
  against the banned list in SPEC.md section 13.6.
- `SPEC.md`: a copy of the build specification.

### Notes on deviations from the spec
- **Rate limiting table added.** Section 5 offered a choice between the
  Workers Rate Limiting binding and a D1 table keyed by a salted, rotating
  hash of the client IP. A `rate_limits` table was added to the migration to
  keep that option available without a config decision blocking phase 0.
- **CPU time budget confirmed tight.** Current Cloudflare docs (checked
  September 2026) put the Workers Free plan CPU time limit at 10ms per
  request. This matters most for the phase 3 inbound email handler (section
  10.6 already calls this out) and for any admin page doing meaningful D1
  work; noted here so it isn't a surprise later.
- **D1 and R2 free tier numbers.** The spec asked for these to be checked
  against current docs rather than assumed. As of September 2026: D1 allows
  5 million rows read and 100,000 rows written per day, 5GB total storage.
  R2 allows 10GB-month storage, 1 million Class A (write) and 10 million
  Class B (read) operations per month, with no egress charge. See
  `README.md` for the full table.
- **Git and Node.js were not present on the build machine** and were
  installed as part of phase 0 (Git for Windows via winget; Node.js as a
  portable, non-admin zip distribution, since the machine has no admin
  rights). Noted here since it is unusual environment setup, not a project
  decision.

### Open decisions (see SPEC.md section 18)
- Site name and domain: TBC, currently `Project C-EDM` as a placeholder.
- Acknowledgement of Country wording: TBC, currently empty (hidden).
- Harm reduction links: seeded but marked as needing verification before
  launch, per section 15.4.

[0.1.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.1.0
