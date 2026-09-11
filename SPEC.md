# Project C-EDM: Build Specification

| | |
|---|---|
| Spec version | 1.0.0 |
| Date | 11 September 2026 |
| Status | Ready for build |
| Working name | Project C-EDM (final name TBC, see section 18) |

## Spec changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 11/09/2026 | First complete spec from brainstorming session |

---

## 0. Instructions for Claude Code

Read this whole document before writing any code. Then:

1. Work through the phases in section 17 in order. Do not start a phase until the previous phase meets its acceptance criteria.
2. Use git from the very first file. Commit in small, meaningful steps using Conventional Commits (`feat:`, `fix:`, `style:`, `docs:`, `chore:`). Maintain `CHANGELOG.md` in Keep a Changelog format and tag each completed phase (`v0.1.0`, `v0.2.0`, etc).
3. Keep the site name, slogan, Acknowledgement text and contact addresses in one config file so they can be changed in one place.
4. Before writing any UI, produce the design token plan described in section 13 and check it against the banned list. Revise anything that reads as a generic default.
5. When something in this spec conflicts with current Cloudflare documentation (limits, bindings, config syntax), follow the current documentation and note the difference in `CHANGELOG.md`.
6. Never use em dashes or en dashes anywhere: code comments, UI copy, docs or commit messages. Use a regular hyphen.
7. Never commit secrets, personal names, personal email addresses or phone numbers.
8. Ask the owner rather than guessing when a decision here is marked TBC.

---

## 1. Overview

### The problem
Canberra's underground electronic music events are mostly announced on Facebook and Instagram. People who don't use those platforms miss out.

### The product
A simple, community-run noticeboard for underground EDM events in and around Canberra. Crews post their own events, the admin checks them, and anyone can see what's coming up and what has happened, without an account, an app or a feed.

### Slogan
> No algorithm, just the info you need, for the ones not on the feed

The slogan doubles as the site's description. It appears at the top of the home page.

### Audience
- People in the Canberra underground scene who don't use Facebook or Instagram.
- Local crews and collectives who put on events.
- One admin (the owner), possibly more later.

### Principles
1. **Built by the community, for the community.** No scraping of any other website, ever.
2. **Low effort to run.** Trusted crews post their own events. The admin mostly just checks.
3. **No logins for the public.** No accounts, no personal profiles.
4. **An archive as much as a noticeboard.** Published events are kept forever.
5. **Respect the scene.** Location TBA is normal. Crews control their own listings.
6. **Private by default.** No tracking cookies. The admin's personal details never appear anywhere.
7. **Readable first.** Gritty look, but all text is real, accessible text.

### Coverage
Canberra, plus events within a short trip of Canberra (e.g. Queanbeyan and surrounding NSW), especially when a Canberra crew is putting it on. This is an editorial guideline for the admin, not something the software enforces.

---

## 2. Scope

### In scope (across all phases)
- Home page with a two-column board (upcoming and past) and a month calendar.
- Individual shareable event pages.
- Forever archive of past events.
- Admin panel for manual entry, moderation and crew management.
- Public event submissions (no required fields) with an admin review queue.
- Private edit links for submitters.
- Crew keys for trusted crews (auto-publish, edit, unpublish).
- Removal and cancellation requests.
- Contact form.
- Email alerts to the admin.
- Inbound email address that drops emails into the admin queue.
- Harm reduction page plus a small link on every event.
- Subscribable calendar feed (.ics).
- Privacy-friendly analytics.
- Crews directory page.

### Out of scope
- Public user accounts, logins, saving events, "going" buttons.
- Filters or search.
- Comments or ratings.
- Scraping or importing from any other site.
- Sending email to anyone other than the admin (see section 10.4).
- Email digests or newsletters (parked).
- AI parsing of emails (possible later phase, see section 17).

---

## 3. Technology and architecture

### 3.1 Stack
| Layer | Choice | Notes |
|---|---|---|
| Hosting and server | Cloudflare Workers with static assets | Workers Free plan |
| Language | Plain JavaScript (ES modules) | No TypeScript build step required. JSDoc types are welcome. |
| Front end | Server-rendered HTML, plain CSS, small vanilla JS | No framework, no bundler, no CSS framework |
| Database | Cloudflare D1 | Migrations in `/migrations` |
| Image storage | Cloudflare R2 | Owner has a card on file |
| Admin protection | Cloudflare Access (Zero Trust free tier) | Plus JWT verification in the Worker |
| Spam protection | Cloudflare Turnstile | On every public form |
| Inbound email | Cloudflare Email Routing to an Email Worker | Same Worker or a second one |
| Outbound email | Email Service `send_email` binding to a verified destination address only | Free on all plans |
| Analytics | Cloudflare Web Analytics plus first-party daily counters in D1 | Cookieless |
| Source control and deploy | Personal GitHub repo (private) connected to Cloudflare Workers Builds | Push to `main` deploys |

### 3.2 Dependencies
Keep them to an absolute minimum. Acceptable:
- `wrangler` (dev dependency).
- `postal-mime` for parsing inbound email.
- A small, well-maintained HTML sanitiser for inbound email HTML, only if the plain text part is not enough.
- A tiny QR code library for the printable poster (phase 4), vendored.

Anything else must be justified in `CHANGELOG.md`.

### 3.3 Rendering approach
- The Worker renders pages as HTML using template literal functions. Every value inserted into HTML must pass through an escaping helper.
- The home page, event pages, archive and harm reduction page work fully without JavaScript.
- JavaScript enhances: calendar month switching without reload, the mobile board/calendar toggle, image resizing on upload, Turnstile, and the edit page.
- Forms that need JavaScript (because of Turnstile and image processing) show a plain message when JS is off.
- Public pages send `Cache-Control: public, max-age=60`. Admin, edit and crew pages send `no-store`.

### 3.4 Time and date handling
- Store all timestamps in D1 as UTC ISO 8601 strings.
- Render everything in `Australia/Sydney` time (Canberra's time zone, including daylight saving) using `Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney' })`.
- Admin and submission forms take local Canberra time and convert to UTC on save.
- Display format (12-hour time, Australian date order):
  - Upcoming: `Sat 14 Mar, 10pm til late` or `Sat 14 Mar, 10pm to 4am`
  - Past and archive: include the year, `Sat 14 Mar 2026, 10pm`
  - On-the-hour times drop the minutes (`10pm`), others keep them (`10:30pm`).
  - Use `midnight` and `midday` instead of 12am and 12pm.
  - Events running past midnight show the end time only, not a second date, unless they run longer than 24 hours (multi-day events show both dates).
- Calendar weeks start on Monday.
- Currency is AUD, written as `$20`. Price is free text anyway.

### 3.5 When an event becomes "past"
- If it has an end time: once the end time has passed.
- If it has no end time: at 6am Canberra time the morning after the start date.
- Past status is calculated at render time, never stored.

### 3.6 Suggested repo layout
```
/
  src/
    index.js            Worker entry: fetch and email handlers
    router.js
    config.js           site name, slogan, ack text, addresses
    lib/                escaping, dates, tokens, auth, rate limits, ics, email
    routes/             one file per page or API group
    templates/          HTML template functions
  public/               static assets: css, js, fonts, textures, favicon
  migrations/           numbered D1 SQL migrations
  seed/                 local-only seed data, clearly fake
  wrangler.jsonc
  README.md             setup, local dev, deploy, backup routine
  CHANGELOG.md
  SPEC.md               a copy of this document
```

---

## 4. Owner setup checklist (human tasks)

Claude Code should put this list in `README.md` with step-by-step instructions, but cannot do these itself.

1. **Private GitHub repo** on the owner's personal account. Configure git to commit with the GitHub `noreply` email so no personal address appears in history.
2. **Personal Cloudflare account.**
3. **Domain.** Check whether Cloudflare Registrar supports the chosen `.au` extension at purchase time. If not, buy from an Australian registrar and point the nameservers to Cloudflare. Before buying, check what the `.au` public WHOIS lookup displays about the registrant, so personal details stay private.
4. **Dedicated project mailbox.** Create a new free email account used only for this project (not the owner's personal address). This is the admin alert destination, the Access login identity and the address used to reply to people. It keeps the owner's personal details out of every email.
5. **Email Routing** on the domain. Add the project mailbox as a verified destination. Create routes:
   - `events@domain` goes to the Email Worker (inbound submissions).
   - `noreply@domain` is the sender for admin alerts.
6. **Email Service sending** onboarded for the domain, so the Worker can send alerts to the verified project mailbox.
7. **D1 database** created and bound.
8. **R2 bucket** created and bound (requires card on file).
9. **Turnstile widget** created for the domain. Site key in config, secret key as a Worker secret.
10. **Cloudflare Access** application protecting `/admin*`, allowing only the project mailbox via one-time PIN. Record the Access team domain and application audience tag as Worker secrets or vars.
11. **Web Analytics** enabled for the domain.
12. **Workers Builds** connected to the GitHub repo.
13. **Custom domain** attached to the Worker.

### 4.1 Expected running costs
| Item | Cost |
|---|---|
| Domain | Annual registration fee |
| Workers, D1, Access, Turnstile, Email Routing, Web Analytics | Free tiers |
| Admin alert emails (to verified address) | Free |
| R2 | Free within the free tier, card required |

Claude Code should check current free tier limits in Cloudflare docs and note them in `README.md`. At roughly 5 events a month with compressed flyers, storage growth is tiny, so the forever archive fits comfortably.

---

## 5. Data model (D1)

IDs are random, URL-safe strings (at least 16 characters). Timestamps are UTC ISO strings. Use `CHECK` constraints for enums. The schema below is the intent; Claude Code may refine column names but must keep the behaviour.

```sql
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
  metric      TEXT NOT NULL,          -- see section 11
  subject_id  TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, subject_id)
);
```

Rate limiting can use the Workers Rate Limiting binding if available on the plan, otherwise a small D1 table keyed by a daily-rotating salted hash of the IP (never the raw IP).

---

## 6. Pages and routes

| Route | Purpose | Phase |
|---|---|---|
| `GET /` | Home: slogan, board and calendar | 1 |
| `GET /?month=YYYY-MM` | No-JS calendar navigation | 1 |
| `GET /e/:slug` | Event page | 1 |
| `GET /e/:slug.ics` | Add single event to calendar | 1 |
| `GET /calendar.ics` | Subscribable feed | 1 |
| `GET /archive` and `/archive/:year` | Full past events archive | 1 |
| `GET /look-after-each-other` | Harm reduction page | 1 |
| `GET /img/:key` | Serve flyer images from R2 (only for non-removed events) | 1 |
| `GET /go/:eventId` | Counted redirect to the stored ticket URL | 1 |
| `/admin/*` | Admin panel (Access protected) | 1 |
| `GET /submit` and `POST /api/submissions` | Public submission | 2 |
| `GET /edit` and `POST /api/edit/*` | Edit via private link | 2 |
| `GET /crew` and `POST /api/crew/*` | Crew key dashboard | 2 |
| `GET /contact` and `POST /api/contact` | Contact form | 2 |
| Email handler | `events@domain` inbound | 3 |
| `GET /crews` and `/crews/:slug` | Crews directory and profiles | 3 |
| `GET /poster` | Printable A4/A6 poster with QR code | 4 |
| `GET /robots.txt` | Disallow `/admin`, `/edit`, `/crew`, `/go`, `/api` | 1 |

Every page footer contains: harm reduction link, contact link (phase 2), submit link (phase 2), calendar feed link, the short privacy line, and the Acknowledgement line (section 15.3).

---

## 7. Home page

### 7.1 Structure
1. **Header:** site name and the slogan. This is the single boldest design element on the site (see section 13).
2. **Board:** two columns.
   - **Coming up:** published events that are not past, soonest first.
   - **Been and gone:** past published events, most recent first. Shows the most recent 12, then a link to the full archive.
3. **Calendar:** month grid for the current month, with previous and next month controls. Days with events are marked. Selecting a day shows that day's events (as links to event pages). Past months remain browsable all the way back to the first event.
4. **Footer.**

Column labels "Coming up" and "Been and gone" are defaults, editable in config.

### 7.2 Layout by screen size
- **Wide screens (roughly 1024px and up):** board and calendar side by side. Suggested split: board takes about two thirds (its two columns within), calendar about one third and sticky while scrolling.
- **Narrow screens:** a two-option toggle at the top, "Board" and "Calendar", using real buttons with `aria-pressed`. Board is the default. On the board view, "Coming up" sits above "Been and gone".
- Without JavaScript on narrow screens, show board then calendar stacked.

### 7.3 Empty states
- **Nothing coming up:** a scrap on the wall that reads along the lines of "Nothing on the wall right now. Quiet month. Know of something? Put it up." with a link to submit (phase 2) or contact.
- **No past events yet (launch day):** hide the column heading's empty list and show a short line instead.
- The empty state should look deliberate, never broken or abandoned.

---

## 8. Event card and event page

### 8.1 Card contents (board)
Shown when present, omitted cleanly when empty. Never render labels for empty fields.
- Flyer thumbnail
- Title
- Presented by (crew name linking to crew page in phase 3, or free text)
- Date and time
- Venue name, or "Location TBA" plus reveal date and how to find out
- Genre
- Price
- Lineup (first few acts, then "and more" linking to event page)
- Ticket link (via `/go/:eventId`)
- 18+ marker when `age_restriction = '18+'`
- Status stamp when status is not `on`, or when the location was revealed in the last 7 days
- Small "Look after each other" link to the harm reduction page

The whole card title links to the event page. Keep interactive targets at least 44 by 44 CSS pixels.

Past cards ("Been and gone") are smaller and visually weathered (see section 13), but still meet contrast requirements.

### 8.2 Status stamps
Rendered as rubber-stamp marks across the card and event page. Real text, not images.
| Condition | Stamp text |
|---|---|
| `status = 'cancelled'` | CANCELLED |
| `status = 'sold_out'` | SOLD OUT |
| `status = 'postponed'` | POSTPONED |
| `location_revealed_at` within 7 days and event not past | LOCATION DROPPED |

Cancelled events stay on the board and in the archive with the stamp. They are not removed.

### 8.3 Event page `/e/:slug`
- Everything on the card, plus full lineup, full address (when not TBA), notes and full-size flyer.
- "Add to calendar" link (`/e/:slug.ics`).
- "Share" uses the Web Share API where available, otherwise a "Copy link" button.
- "Something wrong with this listing?" link to the contact form with the event pre-filled (phase 2).
- Open Graph and Twitter card meta tags (title, date, venue, flyer image) so links texted to friends preview nicely. Pending, rejected and removed events return 404 and are never previewable.
- Flyer `alt` text is generated from the event details, e.g. "Flyer for Deep Signal, Saturday 14 March 2026, location TBA". If the flyer contains extra detail, the page text already carries it.

---

## 9. Submissions, edits, crews and removals

### 9.1 Public submission form `/submit`
- **No field is required.** People share as much or as little as they like.
- Fields: every event field from section 8.1, plus notes, plus a crew key field (collapsed under "Got a crew key?"), plus the private contact field.
- The private contact field is clearly labelled: "Optional. Only the site admin sees this. It is never published." Place it visually apart from the public fields.
- The Location TBA checkbox reveals "When will the location be announced?" and "How will people find out?".
- Flyer upload uses the image pipeline in section 10.5.
- Turnstile is required. Rate limit to a sensible number of submissions per hour per client.
- A short plain-English privacy note sits above the submit button: what is published, what stays private, and that details can be removed on request.
- Submitting creates an event with `visibility = 'pending'` and `source = 'public'`, generates an edit token (9.2), and sends an admin alert.

### 9.2 Private edit links
- On submission, generate a token of 32 random bytes (Web Crypto), encoded base64url.
- Store only the SHA-256 hash in `events.edit_token_hash`.
- Show the link once, on the confirmation page: `https://domain/edit#<token>`.
  - The token sits in the URL fragment, so browsers never send it to the server in the request line, and it never appears in logs or referrers.
  - Provide a "Copy link" button and a clear message: "Save this link. It is the only way to change or cancel your listing. Anyone with the link can suggest changes, so don't post it publicly."
  - The link is not emailed to submitters (decision: on-screen only).
- `/edit` page: JavaScript reads the fragment, POSTs the token in the request body to `/api/edit/load`, and renders the form.
- Pages under `/edit` send `Referrer-Policy: no-referrer`, `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- Behaviour:
  - Event still pending: edits update the pending event directly.
  - Event published: edits create an `event_changes` row (`kind = 'edit'`) for admin review. The public listing does not change until approved.
  - Cancel and removal: create `cancel_request` or `removal_request` rows for review. Edit link holders can never remove or cancel instantly.
- Admin can revoke an edit link (clear the hash) or issue a new one from the admin panel. Issuing a new one shows the new link once to the admin, who passes it on.

### 9.3 Crew keys (trusted crews)
- Admin creates a crew record and issues a key: 32 random bytes, base64url. Store only the SHA-256 hash. Show the key once to the admin.
- Admin can rotate (old key stops working instantly) or revoke keys, and toggle `trusted`.
- `/crew` dashboard: the crew pastes their key (JavaScript keeps it in `sessionStorage` for the tab session only). They can:
  - See all their events, including pending ones.
  - Create events. If `trusted` and the event has at least a title and start date, it publishes immediately. Otherwise it goes to pending.
  - Edit their events. Trusted crew edits publish immediately and bump `sequence`.
  - Mark events cancelled, sold out or postponed (immediate for trusted crews).
  - Unpublish (set `visibility = 'removed'`) their own events instantly. This is the only non-admin path to instant removal.
  - Edit their crew profile (phase 3).
- The submission form's crew key field does the same as the dashboard for a single new event.
- Every crew action that publishes, changes or removes something sends an admin alert, so the admin can reverse it.
- Key attempts are rate limited and protected by Turnstile to stop guessing.

### 9.4 Removal rules (troll protection)
| Who | Can do instantly | Must go through review |
|---|---|---|
| Admin | Anything, including hard delete | |
| Crew key holder (own events) | Unpublish, cancel, edit (if trusted) | Edits if not trusted |
| Edit link holder | Edit pending events | Edits to published events, cancel, removal |
| Anyone else | Nothing | "Something wrong with this listing?" contact message |

- `removed` events are hidden from every public surface (pages, feed, images, OG previews) but kept in the database so the archive stays intact and removals can be reversed.
- Admin can hard delete an event and its images for genuine privacy requests.

---

## 10. Admin, email and images

### 10.1 Admin authentication
- `/admin*` is protected by Cloudflare Access.
- The Worker must also verify the `Cf-Access-Jwt-Assertion` header against the Access team's public keys and the application audience tag. Reject the request if verification fails, even if Access is misconfigured.

### 10.2 Admin panel features
- **Queue** (landing page), newest first, with counts:
  - Pending submissions
  - Pending changes and requests (`event_changes`), with a clear before/after comparison for edits
  - New inbound emails (phase 3)
  - New contact messages
- **Events:** list with search by title (admin only), create, edit, publish, reject, remove, restore, hard delete. Admin sees `submitter_contact`.
- **Publishing rule:** an event needs at least a title and start date to publish. The admin fills gaps before publishing.
- **Location reveal:** when an event changes from TBA to a real location, set `location_revealed_at`.
- **Crews:** create, edit, issue, rotate and revoke keys, toggle trusted and listed.
- **Harm reduction links:** edit, reorder, mark as checked today. Show a warning banner on the admin home when any link's `last_checked_at` is older than 90 days.
- **Stats:** see section 11.
- **Reminder banner:** from 1 April 2027, show "CanTEST funding was due to end June 2027. Check the service is still running." until dismissed.

### 10.3 Admin alert emails
- Sent with the `send_email` binding, restricted to the single verified project mailbox (`destination_address` in config), from `noreply@domain`.
- One short email per event: new submission, crew publish, crew edit, crew removal, change request, removal request, new contact message, new inbound email.
- Subject format: `[C-EDM] New submission: <title or "untitled">`.
- Body: a plain summary and a link to the relevant admin page. Never include edit tokens, crew keys or submitter contact details in the email body.
- If sending fails, log it and carry on. The queue is the source of truth.

### 10.4 Contact form `/contact`
- Fields: name (optional), how to reply (optional, private), message (required, the only required field on the site), hidden event ID when coming from an event page.
- Turnstile and rate limiting.
- Stores to `contact_messages` and sends an admin alert.
- The admin replies, if needed, from the dedicated project mailbox. The site never reveals any address other than the public `events@domain` and never reveals the owner's identity.
- Copy near the form: "Messages go to whoever runs the site. We don't publish anything you send here."

### 10.5 Image pipeline
- Uploads are processed in the browser before upload:
  - Decode, resize to max 1600px on the long edge, and encode as WebP (quality around 0.8) for the large version.
  - Also produce a thumbnail at max 600px.
  - Re-encoding through canvas strips EXIF metadata, including GPS location from phone photos. This is a privacy requirement.
- The server validates type by magic bytes, enforces a size limit (e.g. 2 MB large, 400 KB thumb) and stores to R2 under random keys.
- Images are served through `/img/:key` with long cache headers, and return 404 if the linked event is not published (admins view through an admin route).
- Inbound email attachments are stored raw in R2 but never served publicly. When the admin converts an email into an event, the attachment is run through the same browser pipeline in the admin page before being attached as the flyer.

### 10.6 Inbound email `events@domain` (phase 3)
- Email Worker parses messages with `postal-mime`.
- Store sender, subject, plain text body (fall back to a sanitised text version of HTML) and image attachments (to R2).
- Enforce limits: ignore messages over a sensible size, keep at most a few image attachments, drop non-image attachments.
- Never render inbound HTML in the admin panel. Show plain text only. Treat links in emails as untrusted and display them as text.
- Send an admin alert.
- Admin page for each email has "Convert to event" which opens the event form pre-filled (subject as title, first image as flyer after processing), and "Dismiss".
- Keep the Email Worker light so it stays within free plan CPU limits.

---

## 11. Calendar feed and analytics

### 11.1 Calendar feed `/calendar.ics`
- iCalendar (RFC 5545), `Content-Type: text/calendar; charset=utf-8`.
- Includes all published events that start from 90 days ago onwards (keeps the feed small; the archive has everything).
- Per event: stable `UID` (`<event id>@domain`), `SEQUENCE` from `events.sequence`, `DTSTAMP`, `DTSTART` and `DTEND` in UTC (default duration 6 hours when no end time), `SUMMARY`, `LOCATION` ("Location TBA, see event page" when TBA), `DESCRIPTION` (presented by, lineup, price, event page link), `URL`.
- Cancelled events are included with `STATUS:CANCELLED` so subscribed calendars update.
- Correct line folding and text escaping.
- Footer and home page show "Subscribe to the calendar" with short instructions for Apple, Google and Outlook calendars, and a `webcal://` link.

### 11.2 Analytics
Goal: help the owner decide if the site is worth continuing, without tracking people.
- **Cloudflare Web Analytics** beacon on public pages (cookieless). Include its script origin in the CSP.
- **First-party daily counters** in `daily_counts`, incremented server-side:
  | Metric | Subject |
  |---|---|
  | `home_view` | |
  | `event_view` | event ID |
  | `ticket_click` | event ID (via `/go/:eventId`) |
  | `ics_feed_fetch` | |
  | `ics_event_download` | event ID |
  | `submission` | source |
  | `contact_message` | |
- Skip counting for obvious bots (e.g. user agents containing bot, crawler, spider) and for admin requests.
- No IP addresses, cookies or identifiers are stored.
- Admin **Stats** page: last 30 days and all time for each metric, top events by views and ticket clicks, and a per-crew summary (useful to show crews the site is sending people their way). Simple tables are fine; no charting library.
- Footer privacy line: "No tracking cookies. We count visits, not people."

---

## 12. Security and privacy

- **Output escaping** everywhere. No `innerHTML` with untrusted data in client JS.
- **URL validation:** ticket URLs and crew links must be `http:` or `https:`. `/go/:eventId` only redirects to the URL stored on that event, so it cannot be used as an open redirect.
- **Content Security Policy:** `default-src 'self'`, allowing only Turnstile and Web Analytics origins where needed. No inline scripts (use files). `frame-ancestors 'none'`.
- **Other headers:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (and `no-referrer` on edit and crew pages), `Permissions-Policy` disabling unused features.
- **Secrets** (Turnstile secret, Access audience) stored as Worker secrets. `.dev.vars` is gitignored.
- **Tokens and keys:** 32 random bytes, stored as SHA-256 hashes, compared by looking up the hash.
- **Forms:** Turnstile verification server-side, input length limits on every field, rate limits.
- **Private data:** `submitter_contact`, `contact_messages` and `inbound_emails` are never exposed by any public route, feed, OG tag or error message.
- **Owner privacy:** no owner name, personal email, phone or location anywhere in the site, repo or commit history.
- **Backups:** D1 Time Travel covers short-term recovery. `README.md` documents a monthly manual export (`wrangler d1 export`) stored somewhere safe, because the archive is meant to last forever.

---

## 13. Design direction

### 13.1 The brief in the owner's words
Dark and minimal meets photocopied flyer. Imagine a half torn down rave poster glued to a pole in the city, pulled off, photocopied at home and posted online. Gritty and authentic. It must not look like AI styled it.

### 13.2 Inspiration
Draw from the industrial, gritty feel of early UK dubstep and bass culture (mid 2000s London: DMZ, FWD>>, Rinse, Plastic People). This is a mood reference, not a template to copy. Get creative within it. Useful threads from that era:
- Home-made, DIY flyers made by the crews themselves, found on record shop flyer walls rather than plastered everywhere.
- Minimal layouts with a single strapline.
- Stark contrast, hard edges, flat blocks of colour and several typefaces interacting while still feeling ordered.
- Dark, low-light urban photography: concrete, underpasses, streetlight, tower blocks.
- Rub-down lettering, rubber stamps and hand-stamped white label records.
- A local twist is welcome: Canberra's brutalist concrete, frosty winter nights, sodium-orange streetlight.

Do not copy or trace any real flyer, logo or artwork.

### 13.3 Concept: the wall
- The page background is a wall or pole at night: dark concrete with real grain, not a flat colour.
- Each event is a photocopied paper scrap pasted onto it. Paper has toner grain, slightly uneven edges and torn corners, held by tape or paste marks.
- Crew flyers sit on the scrap in full colour, like they've been pasted on.
- Past events ("Been and gone") are weathered: smaller, sun-faded paper, more wear, but text still meets contrast requirements.
- The calendar is a photocopied, hand-ruled month grid pasted on the same wall. Days with events get a staple or paste mark.
- The slogan is the one loud moment: a torn paste-up strip across the top, big and confident. Everything else stays quieter.

### 13.4 Starting token plan (to refine)
Claude Code should produce and review its own token plan before building, using this as a starting point. Base colours on real materials, not on a UI palette.

| Name | Suggested hex | Material and use |
|---|---|---|
| Wet concrete | `#2e2d2a` | Wall base, with grain texture over it |
| Concrete patch | `#44423d` | Wall variation, calendar backing |
| Photocopy paper | `#d6d5cf` | Scraps, cool grey-white, not cream |
| Faded paper | `#bdbbb3` | Past event scraps |
| Toner | `#000000` | Text on paper, true black |
| Stamp ink | `#9c1f1f` | Status stamps only, on paper only |
| Sodium light | `#c77a2a` | Optional, very sparing, as lighting on the wall texture rather than as a UI accent colour |

Colour on the page comes mainly from crew flyers. UI chrome stays in the material palette.

**Type (candidates, verify SIL Open Font Licence, self-host as WOFF2, no Google Fonts requests):**
- Display and headings: Big Shoulders Display (heavy weights), an industrial condensed face.
- Status stamps and the occasional heavy label: Big Shoulders Stencil.
- Body and event details: Archivo, a sturdy grotesque with good readability at small sizes.
- Claude Code may propose better alternatives if they fit the brief more closely, with reasons.
- Set a clear type scale. Body text at least 16px. Line length under 80 characters.

### 13.5 Texture and craft rules
- Grain and noise are generated (SVG `feTurbulence` rendered to a small tiling image, or a hand-built texture file), not taken from stock photos.
- Torn edges use `clip-path` polygons generated from a seeded random function keyed on the event ID, so each scrap has a consistent shape on every page load.
- Rotation per scrap is seeded too, within about plus or minus 1.5 degrees. Text inside must stay crisp and readable.
- Depth comes from tape, overlap, paste stains and toner edge darkening. No soft blurred drop shadows.
- Texture always sits behind or around text, never over it.
- Motion: none on page load. One deliberate interaction is allowed, e.g. a scrap straightening when it is opened. Respect `prefers-reduced-motion`.
- Hover states are subtle and not applied as a lift effect on every card.

### 13.6 Banned list
Do not use any of these:
- Rounded corners on cards, soft grey drop shadows, gradient washes
- Purple, blue or neon gradients, glassmorphism, background blur
- A near-black background with a single bright acid-green, neon or vermilion accent colour
- Warm cream backgrounds with terracotta accents
- Inter, Roboto, system UI defaults, or any overused SaaS typeface
- Emoji as icons, icon libraries (Lucide, Heroicons, Font Awesome, etc.)
- Letter-spaced ALL-CAPS eyebrow labels above headings (status stamps are the one exception, because they imitate a physical stamp)
- Meta details joined with middle dots (`A · B · C`)
- Arrows appended to links or buttons
- Numbered section markers (`01`, `02`) when content isn't a sequence
- Fade-and-slide-up entrance animations, hover lift on every card
- Stock hero sections with big stats
- AI-generated images
- Em dashes or en dashes in any copy
- Marketing words: curated, elevate, vibrant, seamless, unleash, discover, journey

### 13.7 Copy voice
- Plain, short, local. Sentence case.
- Buttons say what they do: "Put it on the wall", "Save changes", "Send message", "Copy link".
- Errors say what went wrong and how to fix it, without apologising.
- Australian English spelling (colour, organise, licence).

---

## 14. Accessibility

Target WCAG 2.2 AA.
- Text contrast at least 4.5:1 (3:1 for large text), measured against the actual paper colour under the texture.
- Semantic HTML: `header`, `main`, `nav`, `footer`, headings in order, lists for the board columns.
- Calendar is a proper table or grid with keyboard navigation and accessible day names, and each event marker is announced.
- Visible keyboard focus styles that fit the design.
- Rotation and textures never reduce legibility. Provide a high-contrast fallback when `prefers-contrast: more` is set (flatten texture, remove rotation).
- All form fields have visible labels. Error messages are linked to fields.
- Status stamps are real text and read by screen readers in a sensible position.
- Site is usable at 200% zoom and on a 360px-wide screen.

---

## 15. Content

### 15.1 Slogan
"No algorithm, just the info you need, for the ones not on the feed"

### 15.2 Privacy line (footer)
"No tracking cookies. We count visits, not people."

### 15.3 Acknowledgement of Country
- One line, small, in the footer, out of the way. Controlled by `ACK_TEXT` in config. An empty value hides it entirely.
- Default: TBC by owner (see section 18). Build with a placeholder and make removal a one-line change.

### 15.4 Harm reduction page `/look-after-each-other`
- Title: "Look after each other" (editable).
- Only links to established services. The site never writes its own drug advice.
- A one-sentence intro, then links grouped by ACT, NSW and National, each showing title, short description, phone where relevant, and "Last checked" date.
- A line at the top: "In an emergency call 000."
- Seed data (Claude Code must mark every entry as needing verification, and the owner checks each link before launch):

| Region | Service | Notes |
|---|---|---|
| ACT | CanTEST Health and Drug Checking | Free, confidential, fixed site in Canberra City. Include current opening hours from their site. `https://cantest.com.au` |
| ACT | CanTEST community notices | Link to the notices page on the CanTEST site (find current URL) |
| ACT | ACT Health drug checking information | `https://www.act.gov.au/health/drugs-alcohol-smoking-and-vaping/drug-checking` |
| NSW | NSW Health drug warnings | Find current URL |
| NSW | NUAA peer-based harm reduction (including DanceWize NSW if still operating) | Find current URL |
| National | Poisons Information Centre | 13 11 26 |
| National | Alcohol and Drug Foundation drug facts | Find current URL |
| National | Emergency | 000 |

Note for the page copy: drug checking in NSW is offered only at selected licensed festivals, not at underground events, so CanTEST is the local option before heading out.

---

## 16. Crews directory (phase 3)

- `/crews`: all crews with `listed = 1`, alphabetical, each as a small paste-up with name, short blurb and count of events.
- `/crews/:slug`: name, blurb, links (any links the crew chooses, including social media links), their upcoming events and their full past events.
- Trusted crews edit their own profile from the `/crew` dashboard. Admin can edit any crew.
- Events with a `crew_id` link to the crew page. Events with only `presented_by` text do not.

---

## 17. Build phases

### Phase 0: Foundations (`v0.1.0`)
- Repo scaffold, `wrangler.jsonc`, config file, `README.md`, `CHANGELOG.md`, `SPEC.md`.
- D1 migrations for all tables.
- Local dev with clearly fake seed data (fake crews, fake events across past and future months, including TBA, cancelled and no-flyer cases).
- Design token plan written into `README.md` or a `DESIGN.md`, reviewed against section 13.6.

**Accepted when:** `wrangler dev` runs, migrations apply locally, seed data loads, design plan is documented.

### Phase 1: Launchable noticeboard (`v0.2.0`)
- Home page with board, calendar, responsive toggle and empty states.
- Event pages with OG tags, single event `.ics`, feed `.ics`.
- Archive pages.
- Harm reduction page and footer.
- Admin panel behind Access with JWT verification: event CRUD, image upload pipeline, harm reduction link editor, stats page.
- `/img`, `/go`, analytics counters and Web Analytics.
- Security headers and CSP.
- Full design implementation.

**Accepted when:** the owner can add, edit and publish events from the admin panel; events move from "Coming up" to "Been and gone" at the right time; the site works without JavaScript for reading; calendar feed validates and subscribes correctly in at least one calendar app; accessibility checks pass (automated plus keyboard walk-through); nothing on the banned list appears.

### Phase 2: Community posting (`v0.3.0`)
- Public submission form with Turnstile, rate limits and privacy note.
- Edit links and the `/edit` flow.
- Change, cancellation and removal requests with admin review including before/after comparison.
- Crews table management, crew keys, `/crew` dashboard, trusted auto-publish.
- Contact form and "Something wrong with this listing?".
- Admin alert emails.

**Accepted when:** a public submission reaches the queue and triggers an alert; a trusted crew key publishes instantly and triggers an alert; an edit link cannot change a published event without approval; an edit link cannot remove an event; a wrong crew key is rate limited; no private field appears on any public surface.

### Phase 3: Inbox and crews (`v0.4.0`)
- `events@domain` Email Worker and admin email queue with convert-to-event.
- Crews directory and profiles, crew profile editing.

**Accepted when:** an email with a flyer attachment lands in the queue as plain text, and can be converted to a published event with a processed, EXIF-free flyer.

### Phase 4: Getting found (`v0.5.0`)
- `/poster`: printable A4 and A6 poster with site name, slogan and QR code, in the site's visual style, for stickers and record shop walls.

### Later (not scheduled)
- Workers AI drafting event details from inbound emails (free daily allocation).
- Email digest.
- Additional admins via Access.

---

## 18. Open decisions (TBC by owner)

1. **Site name** and matching domain. Everything uses `SITE_NAME` from config until then.
2. **Acknowledgement of Country wording.** Options discussed: a line that doesn't name specific groups (e.g. "Made on Aboriginal land."), or removing it. Traditional custodianship naming in the Canberra region is the subject of an ongoing dispute, so check current guidance before naming groups.
3. **Board column labels.** Defaults "Coming up" and "Been and gone".
4. **Harm reduction links** verified before launch.
