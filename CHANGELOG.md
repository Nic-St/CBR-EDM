# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-09-12

### Added
- Home page: two-column board ("Coming up" / "Been and gone"), a Monday-start
  month calendar with no-JS `?month=YYYY-MM` navigation, and a mobile
  board/calendar toggle that only hides a panel once JavaScript confirms it
  can bring the other one back.
- Event pages (`/e/:slug`) with Open Graph and Twitter card tags, a single
  event `.ics` download, and the subscribable `/calendar.ics` feed (RFC
  5545: line folding, escaping, `STATUS:CANCELLED` for cancelled events).
- Forever archive (`/archive`, `/archive/:year`).
- Harm reduction page (`/look-after-each-other`) sourced from the
  `harm_reduction_links` table.
- `/img/:key` (serves R2 flyers only for published events), `/go/:eventId`
  (counted, scheme-validated ticket redirect), `/robots.txt`.
- First-party analytics counters (`daily_counts`) on every metric in section
  11.2, skipping obvious bots.
- Security headers and CSP on every HTML response (no inline scripts
  anywhere, including admin: destructive-action confirmations and the flyer
  uploader are both external files).
- The full design system from `DESIGN.md`: self-hosted variable fonts (3
  files covering every weight), the seeded torn-paper scrap shape (workshopped
  with the owner across several visual iterations before landing on a
  combined light/heavy/torn-top approach that varies per event), and the
  generated concrete grain texture.
- Admin panel behind Cloudflare Access, with the Worker independently
  verifying the Access JWT's signature (via the Access JWKS endpoint),
  audience and issuer, and rejecting the request if that verification fails
  for any reason: queue (pending counts, stale harm-reduction-link warning),
  event CRUD with publish/reject/unpublish/restore/hard-delete, the flyer
  image pipeline (browser-side resize to WebP at two sizes, which also
  strips EXIF/GPS data; server-side magic-byte and size validation), crew
  management with key issue/rotate/revoke, harm reduction link editing, and
  a stats page.
- `DEV_BYPASS_ACCESS`, a local-only dev var (`.dev.vars`, gitignored) that
  lets the admin panel be exercised without a real Access application. Has
  no effect unless explicitly set, and is never present in a deployment.

### Notes on deviations from the spec
- **Crew profile links (`links_json`) are not yet editable from the admin
  UI.** The column exists and defaults to `[]`; a proper editor is more
  natural to build alongside the crews directory in phase 3, where the
  links are actually displayed publicly.
- **Event change requests (`event_changes`) have no review UI yet.** Nothing
  creates rows in that table until phase 2's edit-link and crew-key flows
  exist, so there was nothing real to review against.
- **Calendar feed has not been validated against a real calendar app.**
  RFC 5545 structure (folding, escaping, required fields) is covered by
  tests, but subscribing it in Apple/Google/Outlook calendar needs a
  publicly reachable URL, which only exists after deployment (owner setup
  step 13). Worth doing once the site is live.
- **No automated accessibility audit tool was run** (e.g. axe). Semantic
  landmarks, form labels, focus-visible styles and a keyboard walkthrough of
  the home page were checked by hand; a full audit is easiest once the site
  is deployed and a tool like Lighthouse can be pointed at a real URL.

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

[0.2.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.2.0
[0.1.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.1.0
