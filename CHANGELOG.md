# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Decided
- Flyer engine phases 4 (Open Graph rasterisation) and 5 (print
  download): not building them. Rasterising an SVG to PNG needs either
  a WASM renderer (`resvg-wasm`) or Cloudflare's Browser Rendering API --
  this project's Workers Free plan caps CPU time at 10ms/request, which
  a WASM render realistically can't fit regardless of what triggers it,
  so that path needs Browser Rendering (free-tier: 10 min/day, no CPU
  cost since it's a remote call) or the Workers Paid plan. Evaluated and
  presented both; owner chose not to spend the effort on either. Social
  cards keep falling back to the crew-uploaded flyer or the site
  default; there is no flyer print download.

### Added
- Generated flyer engine, phase 2a (`FLYER-ENGINE-SPEC.md`): a
  deterministic, seeded SVG renderer with two templates (`medi`,
  `consignment`), the shared parts library (grain, hairline rules, a Code
  39 barcode that actually scans, the status stamp, the site wordmark, the
  ticket footer), font-metric-based text fitting (`scripts/build-font-metrics.js`,
  since Workers have no `measureText`), genre-based template routing, and
  a contact-sheet script for visual review (`scripts/flyer-contact-sheet.js`).
  A generated flyer now fills in on the board and the event page wherever
  there's no crew-uploaded one. Self-hosted JetBrains Mono added for the
  engine's monospace face. `seed_salt` and `flyer_template` columns added
  to `events` (migration 0002).
- Flyer engine phase 2b: the remaining eight templates (`schematic`,
  `stencil`, `terminal`, `halftoneField`, `ransom`, `index-list`,
  `cymatic`, `contour`) plus the `tape` and `halftone` shared parts they
  needed. Genre routing (already written in phase 2a) now resolves to
  real templates instead of falling through all of them to `medi`.
  Admin picker added to the event edit page (`FLYER-ENGINE-SPEC.md`
  section 13): a live preview, a template dropdown showing what auto
  routing would pick, a Reroll button (`seed_salt + 1`), and a compare
  grid rendering the event through all ten templates at once.
- Flyer engine phase 3 (`FLYER-ENGINE-SPEC.md` section 8, 4.2, 4.5, 11.4):
  anti-repetition, edge caching, and the past-event grain layer.
  `resolveTemplate` takes an `exclude` option to skip one template id
  during auto-routing without affecting an explicit choice. On publish,
  an event with no explicit `flyer_template` now has its auto-routed
  template resolved and frozen into the column immediately (rather than
  re-resolving on every render, which would let the flyer visibly change
  as later events are published) -- if the last three published events
  all resolved to the same template, this one is nudged to its second
  choice first. `GET /flyer/:id.svg` now checks the Workers Cache API
  before rendering, keyed by the same event-id/template/seed/surface/
  engine-version/data-hash tuple as `cacheKeyFor`, computed without a
  render so a cache hit skips the render entirely. Past events now get
  one extra full-canvas grain layer on top of the faded palette (section
  11.4), applied centrally in `renderWithTemplate` so every template
  gets it uniformly. `halftoneField`'s scrap surface now renders a
  coarser, simplified halftone screen (fewer dots) instead of the full
  detail one shrunk down; `halftoneField` and `stencil` now both
  truncate scrap-surface support acts to three names, matching the
  other templates and section 4.5's wording.
- Consignment note rework, owner request: kraft wrapping paper as the
  full canvas background (a deliberate one-template departure from the
  shared material palette, section 9), with the bordered form now a
  distinct, lighter label stuck onto it, sized to its actual content
  instead of a fixed height. Fixes a real bug found on a sparse
  postponed event: the CONTENTS cell used to reserve a large fixed
  height regardless of lineup length, leaving a big dead void for a
  short lineup. Also fixed a pre-existing, unrelated bug this surfaced:
  `cell()`'s values and the CONTENTS lineup names were drawn at a fixed
  font size with no measurement, so a long venue or crew name could run
  straight through the column divider or the label's border. Both now
  shrink to fit on one line via a new `fitSingleLine()` in `layout.js`.
- See "## Flyers" below for the visual-change log the engine spec asks
  for, kept separately since visual changes aren't visible in a diff.

## Flyers

Every visual change to the generated flyer engine, in order. See
`FLYER_ENGINE_VERSION` in `src/flyers/index.js`.

- **0.5.1** - The gap above and below the footer rule is now the same on
  both sides everywhere it appears (`ticketFooter`, `index-list`,
  `terminal`) -- it was 24px above and 54px below in `ticketFooter`,
  and similarly mismatched in the other two.
- **0.5.0** - Footer rule ordering, owner request: on every template, the
  event/crew-specific facts (doors, close, age, ticket text, a detail
  line) sit above the footer rule; the harm reduction line and the
  wordmark, the same on every flyer, sit below it. Fixed in the shared
  `ticketFooter` (seven templates) and `index-list`'s own footer, both
  of which had this backwards. Also closed two section-11-rule-1 gaps
  this surfaced: `terminal` and `consignment` were missing the harm
  reduction line entirely (the spec only exempts `terminal` and
  `index-list` from the shared footer band, not from carrying the
  message some other way) -- both now carry it, `consignment`'s next to
  its wordmark on the kraft paper below the label.
  `contour`'s contour lines no longer clip out of the upper third: they
  now run the full canvas instead of reading as a cut-off map.
- **0.4.3** - `consignment`: the barcode/ID row now uses the same left
  padding and top offset as every other row (it previously sat flush
  against the border with no padding), and the ID text sits a wider,
  more consistent gap below the barcode.
- **0.4.2** - `consignment`: every header (CONSIGNOR, DATE, CONTENTS,
  DELIVER TO, WINDOW, HANDLING) now sits the same fixed distance from
  its own row's top border -- previously two different hand-tuned
  offsets (34 and 22) depending on which code path drew the label -- and
  the content below each header sits a wider, consistent gap beneath it.
- **0.4.1** - `consignment`: each cell's label/value pair is now
  centred on that cell's own vertical axis instead of sitting at a
  fixed offset from the row top, so a 130px row and a 160px row no
  longer land the text at visibly different heights. Still left-aligned.
- **0.4.0** - `consignment`: kraft-paper canvas with a content-sized
  label instead of a fixed-height one; values and lineup names shrink to
  fit their column instead of overflowing into a divider or border.
- **0.3.0** - Past events get an extra full-canvas grain layer (section
  11.4). `halftoneField`'s scrap surface uses a coarser halftone screen.
  `halftoneField` and `stencil` truncate scrap-surface support acts to
  three names instead of four.
- **0.2.0** - The remaining eight templates: `schematic` (rig diagram),
  `stencil` (sprayed warehouse severity), `terminal` (monospace session
  readout), `halftoneField` (generative dot-screen), `ransom`
  (photocopied cut-and-paste collage), `index-list` (pure typography
  lineup sheet), `cymatic` (Lissajous standing-wave pattern), `contour`
  (procedural Canberra topography, the local one). Found and fixed a
  contrast bug while building the contact sheet: `halftoneField` could
  seed riso yellow as its dot colour directly on the paper field, which
  section 9 explicitly bans (yellow only clears contrast as a field
  colour with dark type on it, never as a mark on paper) -- `paletteFor`
  now takes an `excludeYellowOnPaper` option, set on any template whose
  accent draws straight onto the paper colour.
- **0.1.0** - First version. `medi` (deep field, the default/fallback) and
  `consignment` (shipping-label form) templates.

## [0.5.0] - 2026-09-12

### Added
- Printable poster (`/poster?size=a4|a6`): site name, slogan and a QR code
  linking to the home page, in the site's visual style, sized for actual
  A4/A6 paper via `@page` print rules. Size switches with a plain link, so
  it works without JavaScript; a print button is the one small JS
  enhancement.
- Vendored `kazuhikoarase/qrcode-generator` (MIT licence) for QR generation,
  per section 3.2's one approved exception for a vendored QR library. Kept
  as the base module only (`js/dist/qrcode.mjs`); the UTF-8 helper module
  was left out since every URL this site generates is plain ASCII.

This completes every phase in SPEC.md section 17. The "Later (not
scheduled)" items (Workers AI drafting from emails, an email digest,
additional admins) remain deliberately out of scope.

## [0.4.0] - 2026-09-12

### Added
- Inbound email handler for `events@domain` (`postal-mime`, the spec's one
  approved dependency for this): stores sender, subject, plain text body
  (or a stripped-tag fallback when a message has only HTML), and up to 3
  image attachments to R2. Oversized messages (over 10MB) are rejected
  before parsing; non-image attachments are dropped. Sends an admin alert.
  Verified with a real MIME message in a Node test, not a hand-built stub.
- Admin inbound email queue (`/admin/inbound-emails`): list, plain-text
  view (attachments shown as images through an admin-only route, raw
  attachments are never served publicly), dismiss, and convert-to-event.
  Converting pre-fills the new event's title from the subject; if the
  email had an image attachment, the event edit page offers a "use this
  image as the flyer" button that runs it through the same browser resize
  pipeline as any other upload (so it comes out as a processed, EXIF-free
  WebP, not the raw attachment).
- Crews directory (`/crews`) and profile pages (`/crews/:slug`): listed
  crews alphabetically with blurb and event count; profile pages with
  upcoming and past events. Events with a `crew_id` link to the crew page;
  events with only free-text `presented_by` do not.
- Trusted crews can edit their own profile (blurb and links) from the
  `/crew` dashboard.
- Slogan updated per owner request: "No algorithm - The info you need,
  for those with no feed".

### Fixed
- Home and archive pages never joined the crews table, so a crew's name
  and profile link were never available on their event cards there (only
  on the single event page, which already had the join). Both queries now
  join crews, and cards link the crew name when `crew_id` is set.

### Verified with a full browser walkthrough
An inbound email with a real PNG attachment converted end to end: queue
listing, plain-text view with the attachment visible through the
admin-only route, convert-to-event pre-filling the title, and the flyer
pipeline producing proper `.webp` flyer keys (confirmed in D1) rather than
reusing the raw attachment. Also: the crews directory excluding an
unlisted crew, a crew profile page showing the right upcoming/past split
and its links, and a trusted crew's profile edit appearing live on their
public page immediately after saving.

## [0.3.0] - 2026-09-12

### Added
- Public submission form (`/submit`) with Turnstile, per-IP daily rate
  limiting, the flyer image pipeline reused from admin, and a privacy note
  distinguishing published fields from the admin-only contact field.
- Private edit links (`/edit`): the token lives only in the URL fragment and
  this session's own fetch bodies, never in a query string. Edits to a still
  pending event apply directly; edits to a published event, and every
  cancel or removal request, always go to admin review instead, regardless
  of who holds the link.
- Admin review for pending changes (`/admin/changes`): a before/after
  comparison for proposed edits, and approve/reject for cancel and removal
  requests.
- Crew dashboard (`/crew`): key-based sign-in (key kept in
  `sessionStorage` for the tab only), event creation and editing, status
  changes (cancelled/sold out/postponed), and instant unpublish. Trusted
  crews with a title and start date publish immediately; everyone else
  goes to pending, or to admin review if editing something already
  published.
- Contact form (`/contact`) and an admin message viewer
  (`/admin/contact-messages`), wired to "Something wrong with this
  listing?" on event pages.
- Admin alert emails on every write that publishes, changes or removes
  something: submissions, crew actions, change/cancel/removal requests,
  contact messages.
- Edit-link revoke and reissue from the admin event page.

### Fixed
- The Turnstile widget injects its own inline styles into its host
  elements; the CSP's `style-src 'self'` blocked this outright and broke
  the widget. `style-src` now also allows `'unsafe-inline'`, `script-src`
  is unaffected and still blocks all inline script.
- `handleCrewEventList` originally did `SELECT *`, which would have sent
  `submitter_contact` and `edit_token_hash` to the crew's own browser
  session. Narrowed to an explicit safe column list. Caught by hand during
  the browser walkthrough below, now covered by a test.

### Notes on deviations from the spec
- **Status changes (cancelled/sold out/postponed) for untrusted crews.**
  Section 9.3's prose says these are "immediate for trusted crews," while
  the table in section 9.4 lists "cancel" among the crew's always-instant
  actions without a trust qualifier. Implemented per the more specific
  9.3 prose: untrusted crews' status changes go to admin review as an edit
  request, same as any other edit to a published event. Unpublish stays
  instant regardless of trust either way, since 9.4 is explicit that it is
  "the only non-admin path to instant removal."
- **Crew profile editing (blurb, links) is still admin-only.** The crew
  dashboard covers event management per section 9.3; profile self-editing
  is more natural to build alongside the public crews directory in phase 3.
- **Turnstile's own dashboard/API setup is not something Claude Code can
  do.** Owner setup step 9 (README.md) still needs a human with Cloudflare
  dashboard access; local dev and this walkthrough used Cloudflare's
  published "always passes" test keys instead.

### Verified with a full browser walkthrough
Submission through to a published event (both as a public submitter and
as a crew), the edit-link flow in both its instant and review-required
modes (including confirming a removal request never actually removes the
event until approved), a trusted crew publishing instantly, an untrusted
crew's submission landing as pending, wrong-crew-key rate limiting
triggering after repeated attempts, and the contact form reaching the
admin queue.

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

[0.5.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.5.0
[0.4.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.4.0
[0.3.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.3.0
[0.2.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.2.0
[0.1.0]: https://github.com/REPLACE_WITH_OWNER/REPLACE_WITH_REPO/releases/tag/v0.1.0
