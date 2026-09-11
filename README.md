# Project C-EDM

A community-run noticeboard for underground EDM events in and around Canberra.
No algorithm, no accounts, no feed. See [SPEC.md](./SPEC.md) for the full
build specification and [CHANGELOG.md](./CHANGELOG.md) for what has actually
been built.

The site name is a placeholder (`Project C-EDM`) until the owner picks a real
one. Everything reads it from [`src/config.js`](./src/config.js), so renaming
is a one-file change.

## Local development

Requirements: Node.js 18 or later, and `npx` (comes with Node).

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

This starts `wrangler dev` on `http://127.0.0.1:8787`, backed by a local D1
database seeded with clearly fake crews and events (see
[`seed/seed.sql`](./seed/seed.sql)). `GET /health` confirms the Worker, D1 and
static assets bindings are all wired up correctly.

Local dev never touches your real Cloudflare account. Add `--remote` to the
migration or seed commands only if you deliberately want to run them against
the live database, and never run the seed script against remote.

## Owner setup checklist

Claude Code cannot do any of the following steps itself; they need a human
with access to accounts, a card, and a domain registrar.

1. **Private GitHub repo.** Create it on your personal GitHub account and
   push this repo to it. Set your git commit email to your GitHub `noreply`
   address (Settings > Emails > "Keep my email address private" gives you
   one like `12345+username@users.noreply.github.com`) so no personal
   address appears in history:
   ```bash
   git config user.email "your-id+username@users.noreply.github.com"
   ```
2. **Personal Cloudflare account.** Sign up at
   [dash.cloudflare.com](https://dash.cloudflare.com) if you do not have one.
3. **Domain.** Pick a `.au` domain. Check whether
   [Cloudflare Registrar](https://developers.cloudflare.com/registrar/)
   supports that extension at purchase time. If not, buy it from an
   Australian registrar and point the nameservers at Cloudflare. Before
   buying, check what the `.au` public WHOIS lookup will display about the
   registrant, so your personal details stay private.
4. **Dedicated project mailbox.** Create a new, free email account used only
   for this project (not your personal address). This becomes the admin
   alert destination, the Cloudflare Access login identity, and the address
   people see replies come from.
5. **Email Routing.** Enable it on the domain in the Cloudflare dashboard.
   Add the project mailbox as a verified destination address. Create routes:
   - `events@yourdomain` to the Email Worker (inbound submissions, phase 3).
   - `noreply@yourdomain` as the sender identity for admin alerts.
6. **Email Service sending.** Onboard the domain for outbound sending so the
   Worker can email alerts to the verified project mailbox.
7. **D1 database.** Run `npx wrangler d1 create c_edm_db`, then replace the
   placeholder `database_id` in `wrangler.jsonc` with the real one it prints.
8. **R2 bucket.** Run `npx wrangler r2 bucket create c-edm-flyers` (requires
   a card on file, even though usage should stay in the free tier at this
   project's scale).
9. **Turnstile widget.** Create one for the domain in the dashboard. Put the
   site key in `wrangler.jsonc` (`vars.TURNSTILE_SITE_KEY`) and set the
   secret key as a Worker secret: `npx wrangler secret put TURNSTILE_SECRET_KEY`.
10. **Cloudflare Access.** Protect `/admin*` with an Access application,
    allowing only the project mailbox to sign in via one-time PIN. Record the
    Access team domain and the application's audience (AUD) tag and put them
    in `wrangler.jsonc` (`vars.ACCESS_TEAM_DOMAIN`, `vars.ACCESS_AUD`).
11. **Web Analytics.** Enable it for the domain in the dashboard.
12. **Workers Builds.** Connect it to the GitHub repo so pushes to `main`
    deploy automatically.
13. **Custom domain.** Attach it to the Worker once everything above is in
    place.

## Deploying

Once Workers Builds is connected (step 12), pushing to `main` deploys
automatically. To deploy manually instead:

```bash
npm run deploy
```

Run migrations against the real database separately and deliberately:

```bash
npm run db:migrate:remote
```

## Backups

D1 [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
covers point-in-time recovery for the last 30 days automatically. Because the
archive is meant to last forever, also do a manual export monthly and store
it somewhere outside Cloudflare (a personal backup drive or cloud storage you
control):

```bash
npx wrangler d1 export c_edm_db --remote --output backup-$(date +%Y-%m-%d).sql
```

## Current free tier limits (checked against Cloudflare docs, September 2026)

These are the limits that matter at this project's expected scale (roughly
5 events a month, small compressed flyers). Check
[developers.cloudflare.com](https://developers.cloudflare.com) for current
numbers before relying on any of these for a decision, since free tiers do
change.

| Service | Free tier limit |
|---|---|
| Workers requests | 100,000 / day |
| Workers CPU time | 10 ms / request |
| Workers subrequests | 50 external / request |
| D1 rows read | 5 million / day |
| D1 rows written | 100,000 / day |
| D1 storage | 5 GB total |
| R2 storage | 10 GB-month / month |
| R2 Class A operations (writes) | 1 million / month |
| R2 Class B operations (reads) | 10 million / month |
| R2 egress | Always free |
| Email Routing destination addresses | 200 / account |
| Email Routing inbound message size | 25 MiB |

At 5 events a month with compressed WebP flyers (a few hundred KB each), R2
storage growth is a few MB a month. The forever archive fits comfortably
inside the free tier for years.

## Repo layout

See [SPEC.md](./SPEC.md) section 3.6 for the intended layout. In short:
`src/` is the Worker (routes, templates, and `lib/` helpers), `public/` is
static assets, `migrations/` is numbered D1 SQL, `seed/` is fake local-only
data.
