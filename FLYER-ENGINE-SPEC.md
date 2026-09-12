# Project C-EDM: Generated Flyer Engine

| | |
|---|---|
| Spec version | 1.0.0 |
| Date | 12 September 2026 |
| Status | Ready for build |
| Extends | PROJECT-C-EDM-SPEC.md v1.0.0 |
| Applies to | Phase 2 onwards (see section 16) |

## Spec changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 12/09/2026 | First version. Ten templates, shared renderer, genre routing, admin picker. |

---

## 0. Instructions for Claude Code

Read this whole document before writing any code, and read PROJECT-C-EDM-SPEC.md first if you have not already. Then:

1. This document extends the main spec. Where the two disagree, the main spec wins on site architecture, stack, data model and accessibility. This document wins on anything to do with flyer artwork.
2. Every rule in the main spec section 13 still applies, including the banned list in 13.6 and the copy voice in 13.7. The flyer engine is not exempt from it.
3. Build the shared renderer (section 4 to 6) and prove it with two templates before building the other eight. Do not write ten templates against an unproven renderer.
4. Use git from the first file. Conventional Commits. Add a `## Flyers` section to `CHANGELOG.md` and record every template addition or visual change there, because visual changes are otherwise invisible in a diff.
5. Maintain a `FLYER_ENGINE_VERSION` constant. Bump it on any change that alters rendered output. It is part of the cache key, so forgetting to bump it will serve stale artwork.
6. Never use em dashes or en dashes anywhere, including inside rendered flyer copy. Use a regular hyphen.
7. All measurements in this document are millimetres or CSS pixels. All dates in flyer output are Australian format. All times are Australia/Canberra local.
8. Do not copy, trace or pastiche any real crew's logo, artwork or wordmark. Templates are built from generic devices, not from anyone's identity.
9. Ask the owner rather than guessing where something is marked TBC.

---

## 1. What this is and why it exists

The board is a wall of pasted-up paper scraps. A scrap with a real crew flyer on it looks alive. A scrap with no flyer looks like a form submission.

Most events will not come with artwork. Crews are small, often one person, and a flyer is frequently the last thing made or never made at all. The board has to look like a wall either way.

The flyer engine generates original artwork for an event from its own data. It is not a placeholder and it should not look like one. A generated flyer should be good enough that a crew would be happy to see it, and ideally good enough that some of them start asking for the file.

### Three kinds of artwork on the site

| Kind | Source | Precedence |
|---|---|---|
| Crew flyer | Uploaded by the crew or admin, stored in R2 | Always wins if present |
| Generated flyer | Built by this engine from event data | Used when there is no crew flyer |
| No artwork | Type-only scrap, main spec default | Only if generation fails, see 4.7 |

Generated artwork is never shown alongside a crew flyer for the same event. One event, one image.

### What it is not

- It is not an AI image generator. No diffusion models, no stock photography, no traced artwork. Everything is drawn in code from event data and a seeded random function.
- It is not a design tool for crews. Crews upload their own artwork if they have it. Phase 5 may add a download so they can use the generated one, but they do not get a canvas and controls.
- It does not invent content. It only arranges what the event record actually contains.

---

## 2. Definitions

**Template.** A named layout and treatment, e.g. `medi`, `consignment`. Ten of them in section 7.

**Variant.** A seeded variation within a template. The same template renders differently for two different events but identically for the same event on every page load.

**Seed.** A 32 bit integer derived from the event ID. Everything random in a flyer derives from it.

**Composition.** The output of the renderer: one SVG string plus the metadata needed to embed it.

**Surface.** Where a composition is going: `scrap` (board thumbnail), `page` (event page), `social` (Open Graph image), `print` (A5 download, phase 5).

---

## 3. Non-negotiables

These apply to every template. A template that breaks any of them does not ship.

1. **Deterministic.** Same event ID plus same event data plus same engine version equals byte-identical SVG. No `Math.random()`, no `Date.now()`, no time-of-render inputs anywhere in the render path.
2. **Readable.** The headline act and the date must be legible at 160 px wide. Test at that size before anything else.
3. **Accessible.** The flyer is decorative. Every fact on it also exists as real HTML text in the scrap or on the event page. The SVG carries `role="img"` and a `<title>`, and never becomes the only route to information.
4. **Contained.** No text may cross the canvas edge. No element may overlap text in a way that reduces contrast below 4.5:1.
5. **Self-contained.** No network requests from inside the SVG. No `<image href>` pointing anywhere external. No external CSS.
6. **Honest.** The flyer shows only fields that exist. It never renders "TBA" for a field that was simply left blank, never invents a genre, and never pads a lineup.
7. **Cheap.** Under 40 ms CPU to render on a Worker. Under 60 KB of SVG before compression.
8. **Material, not UI.** Colour comes from the material palette in section 9. No gradients, no soft shadows, no rounded corners, no glassmorphism.

---

## 4. Architecture

### 4.1 Rendering approach

**SVG, generated as a string, server side, in the Worker.**

Not canvas, not HTML-in-a-div, not a build step. Reasons: it scales to any surface without re-rendering, it is inspectable and diffable, it compresses well, it needs no browser, and it can later be rasterised without redoing the layout work.

Module layout:

```
src/flyers/
  index.js            render(event, options) -> composition
  seed.js             hash + mulberry32 PRNG
  palette.js          material palette, accent selection
  metrics.js          font width tables, text measurement
  layout.js           wrapping, fitting, grid helpers
  parts/              shared drawable pieces (section 6)
    grain.js
    halftone.js
    tape.js
    stamp.js
    barcode.js
    rules.js
    ticketFooter.js
  templates/
    medi.js
    schematic.js
    stencil.js
    consignment.js
    terminal.js
    halftoneField.js
    ransom.js
    index-list.js
    cymatic.js
    contour.js
  manifest.js         template registry + genre routing table
```

Every template module exports the same shape:

```js
export default {
  id: 'medi',
  name: 'Medi',
  blurb: 'Black field, one accent, wide-tracked caps. Restrained.',
  suits: ['dubstep', '140', 'halfstep', 'dub', 'sound system'],
  minLineup: 0,
  maxLineup: 6,
  needs: [],                  // event fields that must be present
  render(ctx) { return '<g>...</g>'; }
};
```

`ctx` is built by the renderer and contains the normalised event, the palette, the PRNG, the metrics helpers, the canvas geometry and the surface. Templates never reach outside `ctx`.

### 4.2 Where it runs and how it is cached

Render on request in the Worker, then cache. Do not pre-generate on save, because a template change would leave every stored flyer stale.

Route: `GET /flyer/:eventId.svg?v=:hash`

Cache key:

```
flyer:{eventId}:{templateId}:{seedSalt}:{surface}:{FLYER_ENGINE_VERSION}:{dataHash}
```

`dataHash` is a short hash of only the fields the flyer actually uses. Editing a field the flyer does not render must not bust the cache.

Use the Workers Cache API at the edge with a long `max-age` and an immutable response, and put the hash in the query string so a change produces a new URL. Check current Cloudflare cache limits and note them in `README.md`.

### 4.3 Determinism and seeding

```js
seed = fnv1a32(eventId + ':' + seedSalt)
rng  = mulberry32(seed)
```

`seedSalt` is an integer stored on the event, default 0. The admin picker has a "Reroll" button that increments it. That is the only way a flyer changes appearance without a data or engine change.

Every stochastic decision draws from `rng` in a fixed order. If you add a new draw in the middle of a template, every downstream draw shifts and the flyer changes. That is acceptable, but it is a visual change, so bump `FLYER_ENGINE_VERSION` and note it in the changelog.

Add `seed_salt INTEGER NOT NULL DEFAULT 0` and `flyer_template TEXT` to the `events` table. `flyer_template` null means auto-route by genre.

### 4.4 Text fitting and font metrics

This is the part that will bite you. There is no `measureText` in a Worker and SVG has no text wrapping.

**Build step.** Write `scripts/build-font-metrics.js` that reads each self-hosted WOFF2 and emits `src/flyers/metrics/{font}-{weight}.json`: `unitsPerEm` plus a map of codepoint to advance width. Cover Basic Latin, Latin-1 Supplement, and the punctuation actually used (`- / [ ] ( ) + : ' " & @ #`). Run it in CI and commit the output so the Worker has no runtime dependency on font parsing.

**Measurement.** `width = sum(advance) / unitsPerEm * fontSize`, ignoring kerning. Apply a 2 percent safety factor. Any glyph not in the table falls back to the width of `n` and logs a warning in development.

**Fitting.** Two operations, both in `layout.js`:

- `wrap(text, maxWidth, fontSize, font)` greedy word wrap, returns lines. Never breaks inside a word unless a single word exceeds `maxWidth`, in which case reduce size rather than hyphenate.
- `fitBlock(text, box, {minSize, maxSize, font, leading})` binary search on font size until the wrapped block fits the box in both axes. Fewer than 6 iterations.

**Do not use `textLength` with `lengthAdjust="spacingAndGlyphs"` for body text.** It distorts glyphs. It is allowed in exactly two places, both deliberate: the stretched display type in `stencil`, and the justified strip in `index-list`. Everywhere else, fit by size.

**Tracking** is set with `letter-spacing` in absolute units and must be added to measured width manually: `width + letterSpacing * (chars - 1)`.

### 4.5 Fonts in output, by surface

A trap worth stating plainly: an SVG loaded via `<img src>` or as a CSS background cannot use page webfonts. It will fall back to a system font and the flyer will look wrong.

| Surface | Delivery | Font handling |
|---|---|---|
| `scrap` | SVG inlined into the HTML by the Worker | Page fonts apply. Nothing extra needed. |
| `page` | SVG inlined into the HTML | Page fonts apply. |
| `social` | PNG, see below | Fonts baked in at rasterisation |
| `print` | PDF or PNG download, phase 5 | Fonts baked in |

Inlining SVG on the board means the board HTML gets larger. Keep each scrap composition under 12 KB by rendering the `scrap` surface at reduced detail: fewer grain tiles, simplified halftone, no barcode, lineup truncated to three names. The renderer takes `surface` as an input for exactly this reason.

**Rasterisation for `social` and `print` is phase 4, not phase 2.** Until then, Open Graph falls back to the crew flyer if present, otherwise the site-wide OG image. Do not ship a broken social card.

When you do build it, evaluate `resvg-wasm` inside the Worker with fonts loaded from static assets. Check the current Workers bundle size limit before committing to it, because the wasm binary is large. If it does not fit, the alternatives are Cloudflare Browser Rendering or generating the PNG once on publish and storing it in R2. Recommend one with reasons and note the decision in `CHANGELOG.md`.

### 4.6 Canvas geometry

| Surface | Canvas | Notes |
|---|---|---|
| Primary | 1080 x 1350 (4:5) | All templates author to this |
| Square-safe | 1080 x 1080 centred, y from 135 to 1215 | Headliner and date must sit inside |
| `scrap` | Same viewBox, rendered small | Reduced detail, see 4.5 |
| `social` | 1200 x 630 (1.91:1) | Re-composed, not cropped, see below |
| `print` | A5, 148 x 210 mm at 300 dpi, 3 mm bleed, 5 mm safe margin | Phase 5 |

Templates never render directly to 1.91:1. Instead each template exports an optional `renderWide(ctx)`. If it is absent, the social card uses a shared fallback: the template's background treatment, the headliner, the date and the site wordmark. A 4:5 flyer letterboxed into a landscape card looks broken.

**Grid.** 1080 x 1350, margin 72, 12 columns of 62 with 18 gutters, baseline grid of 18. Templates may break the grid deliberately but must say so in a code comment explaining why.

### 4.7 Failure and fallback

The flyer engine must never break a page.

1. Template throws, or produces text that does not fit after fitting, or exceeds the size budget.
2. Fall back to the `medi` template, which is the simplest and the most tolerant of sparse data.
3. If `medi` also fails, render nothing. The scrap falls back to the type-only layout in the main spec. Log the event ID and the template ID.
4. Never render a half-drawn flyer. Build the SVG string fully, validate it, then return it.

Validation before returning: single root `<svg>`, viewBox present, no `href` starting with `http`, no `<script>`, under the size budget, and no text node with a computed width exceeding its box.

### 4.8 Accessibility

- `role="img"` on the root, plus `<title>` reading `Flyer for {headliner} at {venue}, {date}` with graceful omission of missing parts. No `<desc>` describing the artwork, it adds noise for screen reader users.
- `aria-hidden="true"` is wrong here, because the title is useful. Use `role="img"` with the title.
- Every fact on the flyer also appears as HTML text. Test by disabling SVG rendering.
- All text inside the flyer is real `<text>`. Never convert to paths for on-page surfaces.
- Contrast measured against the actual pixel behind the text, including grain and halftone. Grain must be constrained so the darkest and lightest points still clear 4.5:1.
- `prefers-reduced-motion` is moot because flyers have no motion. Do not add any.
- `prefers-contrast: more` raises text to pure black on pure paper and drops decorative opacity by half. Build this as a palette switch, not per template.

---

## 5. Data contract

The renderer receives a normalised object. Building it is `normaliseEvent()` and it is the only place that knows about the D1 schema.

```js
{
  id: 'k3f9x...',            // required, seeds everything
  seedSalt: 0,
  headliner: 'Deep Signal',  // derived: first act, or title if no acts
  title: 'Subterranean 004',
  presenter: 'Low Frequency Society',
  acts: [
    { name: 'Deep Signal', tier: 1, note: 'AU DEBUT' },
    { name: 'Kylo B2B Mantis', tier: 2, note: null },
    { name: 'Residents', tier: 3, note: null }
  ],
  dateLong: 'Saturday 14 March',
  dateShort: 'SAT 14.03',
  dateNumeric: '14/03/2026',
  year: '2026',
  doors: '22:00',
  close: '06:00',
  venueName: 'Sideway',
  suburb: 'Braddon',
  locationTba: false,
  locationNote: 'Address to ticket holders',
  genres: ['dubstep', 'dub techno'],
  ticketText: 'Tickets via Humanitix',
  ageRestriction: '18+',
  status: 'ok',              // ok | cancelled | sold_out | postponed | location_dropped
  surface: 'page'
}
```

Rules:

- **Every field except `id` may be absent.** The main spec makes all event fields optional and the flyer engine must honour that. A flyer with only a title and a date must still look intentional. Test this.
- **Tiers.** 1 is headline, 2 is support, 3 is everything else. Derived from billing order if the crew did not set it: first act is tier 1, next two are tier 2, remainder tier 3.
- **Dates use 24 hour time** and day-first format. `22:00` not `10pm`. Day names are spelled out in `dateLong`.
- **Times crossing midnight** render as `22:00 - 06:00` with no date annotation. It is a nightclub, everyone knows.
- **`locationTba` true** renders as `LOCATION TBA` in the venue slot plus the `locationNote` if present. This is normal in this scene and should look deliberate, not like missing data.
- **Genres** are free text in the database. Normalise to lowercase, trim, split on comma and slash, and match against the routing table in section 8. Unmatched genres are still rendered as text, they just do not affect routing.

---

## 6. Shared parts library

Build these once. Templates compose them. Each takes `ctx` and returns an SVG fragment string.

**`grain(ctx, {opacity, scale, area})`**
`feTurbulence` with `type="fractalNoise"`, seeded from the event, rendered to a tiling pattern rather than applied as a full-canvas filter, because full-canvas filters are expensive. Baseline frequency around 0.8 to 1.4. Never over text.

**`halftone(ctx, {shape, lpi, angle, field})`**
A dot or line screen over a mathematical field, not over a photo. `field` is a function returning 0 to 1 for a given x, y. Dots sized by field value. At 15 to 25 lpi it reads as a printed screen. Generate as `<circle>` or `<rect>` elements, cap at 4000 elements, drop to a coarser lpi if the cap is hit.

**`dither(ctx, {field, cell})`**
Ordered Bayer 4x4 or 8x8 threshold of the same field. Cheaper than halftone and harder edged. Outputs a single `<path>` of merged cells where possible.

**`tape(ctx, {x, y, w, angle})`**
A flat parallelogram of translucent paper colour with slightly ragged short edges from the PRNG. No shadow, no gloss.

**`stamp(ctx, {text})`**
The rubber stamp from the main spec, in `stamp ink`, Big Shoulders Stencil, rotated between -14 and -6 degrees, with the ink broken up by a seeded mask so it reads as pressed rather than printed. Only the five statuses. Always the topmost element. Must not obscure the date.

**`barcode(ctx, {value, x, y, w, h})`**
Code 39 rendered from the event ID. It must scan. Do not draw random bars, because someone will try it and a fake barcode is a small lie in a project built on honesty.

**`rules(ctx, {kind})`**
Hairline dividers: `full`, `partial`, `leader` (dot leaders for lineup lists), `crop` (crop marks at the corners).

**`ticketFooter(ctx)`**
The shared bottom band: age restriction, doors and close, ticket text, harm reduction mark. Used by seven of the ten templates so it stays consistent. Height 126, sits flush to the bottom margin.

**`wordmark(ctx, {size})`**
The site wordmark, small, bottom right or in the footer band. Present on every generated flyer, absent from crew flyers. This is how someone can tell at a glance which is which, and it is the quiet bit of credit the site earns.

---

## 7. Templates

Ten. Each section gives the intent, the layout, the type treatment, what varies by seed, and what it does with sparse data. Build `medi` and `consignment` first, prove the renderer, then the rest.

Canvas is 1080 x 1350 with 72 margins unless stated.

---

### T-01 `medi` - deep field

**Intent.** The Croydon lineage. Restraint as a signal. This is the default and the fallback, so it has to be the most robust.

**Suits.** dubstep, 140, halfstep, dub, sound system, deep

**Layout.** Near-black field. Everything centred on the vertical axis. Presenter in small tracked caps at y 300. Headliner at y 560 to 700, large, weight 700, tracking +0.08em. Support acts stacked below in a single smaller size, centred, one per line, leading 1.4. Date and venue as one centred line at y 1050. Footer band. A single accent hairline, 2 px, 240 wide, centred at y 460, directly above the headliner. That line is the only colour on the flyer.

**Type.** Archivo throughout. No display face. The restraint is the point.

**Seeded variation.** Accent hue picked from the accent set. Vertical position of the whole block shifts plus or minus 30. Hairline width varies 180 to 320. Grain opacity 0.03 to 0.06.

**Sparse data.** Degrades to just a headline and a date, centred, with the hairline. Still looks correct. This is why it is the fallback.

**Failure modes to avoid.** Adding anything. If you find yourself wanting to put a texture or a second colour in, you have misread the template.

---

### T-02 `schematic` - sound system spec sheet

**Intent.** The flyer as technical documentation for the rig. Drawn in the language of an amp rack diagram.

**Suits.** sound system, dub, bass, techno, dub techno, hard techno

**Layout.** Paper-coloured field. A drawn schematic occupies the upper two thirds: boxes connected by orthogonal lines, labelled as signal chain stages. The stage labels are the lineup. Headliner is the largest box, drawn with a double stroke. Support acts are smaller boxes downstream. Below the diagram, a spec table in two columns with dot leaders: date, doors, venue, capacity if known, age restriction. Footer band.

**Type.** Archivo for labels, at small sizes, tracked +0.04em. All box labels in caps. A monospace face for the spec table values.

**Seeded variation.** Diagram topology: linear chain, split to two, or split to three then recombine. Chosen by lineup size. Line routing corners vary. Box proportions vary within a range.

**Sparse data.** With one act, the diagram becomes a single box with an input and an output stub. With no acts, do not use this template, route elsewhere.

**Failure modes.** Do not invent technical values. No fake wattages, no fake frequencies, no fake driver counts. The labels are real event data only. A schematic full of invented specs is the exact opposite of what this site is for.

---

### T-03 `stencil` - industrial

**Intent.** Warehouse severity. Type as a physical object sprayed on a wall.

**Suits.** hard techno, industrial, hardgroove, EBM, gabber, hard dance

**Layout.** Dark concrete field, heavier grain than elsewhere. The headliner set in stencil caps, vertically stretched to 180 to 260 percent, filling the width edge to edge with margins ignored deliberately. It may be cropped at the left and right edges. Below it, a hard-edged block of accent colour, full width, 90 tall, containing the date in reversed-out type. Support acts below in small caps, left aligned to the margin. Footer band.

**Type.** Big Shoulders Stencil for the headliner. Archivo for everything else. This is one of the two templates permitted to use `lengthAdjust="spacingAndGlyphs"`.

**Seeded variation.** Stretch factor. Crop amount at the edges, 0 to 60 either side. Accent block vertical position, 760 to 900. Grain density.

**Sparse data.** Needs a headliner and a date. Without both, route elsewhere.

**Failure modes.** The stretched headliner must remain readable. If the name is longer than about 14 characters, reduce stretch and allow two lines rather than compressing horizontally. Test with a long name like "Sunburst Collective B2B Low Frequency Society", which should trigger the two-line path or reroute.

---

### T-04 `consignment` - shipping label

**Intent.** The flyer as a freight document. Bureaucratic deadpan. Works especially well for warehouse events and location-TBA events because the format expects a withheld address.

**Suits.** warehouse, multi-genre, techno, breaks, anything with location TBA

**Layout.** Paper field, no grain beyond a light toner speckle. A heavy 4 px border inset 40 from the edges, divided into labelled cells by hairline rules, like a real consignment note. Cells:

```
+---------------------------+-------------+
| CONSIGNOR   (presenter)   | DATE        |
+---------------------------+-------------+
| CONTENTS                                |
|   (lineup, one per line, tiered sizes)  |
+---------------------------+-------------+
| DELIVER TO (venue/suburb) | WINDOW      |
|                           | (doors-close)|
+---------------------------+-------------+
| HANDLING (age, ticket text)             |
+-----------------------------------------+
| barcode + event ID                      |
+-----------------------------------------+
```

Cell labels in tiny caps at the top left of each cell, values below in a larger size. Exactly like a real form.

**Type.** Archivo for values. Monospace for the labels, the ID and the barcode caption.

**Seeded variation.** Cell proportions within limits. Barcode position, bottom band or right edge rotated 90 degrees. Presence of a diagonal "FRAGILE" style band, which carries the genre text rather than a joke. Corner clip on one cell.

**Sparse data.** Empty cells render with the label and a single hairline strike through the value area. That is how real forms handle an empty field and it looks correct rather than broken. This is the best template for thin data.

**Failure modes.** Do not add invented reference numbers, weights or hazard classes. The only number is the real event ID.

---

### T-05 `terminal` - monospace readout

**Intent.** A terminal session. Cold, precise, slightly hostile.

**Suits.** electro, IDM, experimental, ambient, breakcore, drum and bass

**Layout.** Near-black field. A monospace block, left aligned to the margin, occupying the full height. Structured as a session:

```
$ events --show k3f9x
loading...

  presenter   : Low Frequency Society
  headline    : Deep Signal
  support     : Kylo B2B Mantis
              : Residents
  date        : 14/03/2026
  doors       : 22:00
  close       : 06:00
  venue       : Sideway, Braddon
  age         : 18+
  tickets     : Humanitix

3 acts listed. 0 filters applied.
_
```

A scanline overlay at very low opacity. A block cursor at the end. The headliner line is the only one in the accent colour.

**Type.** A single monospace face at one size. No display type at all. Line height 1.6.

**Seeded variation.** The command string. The status line wording, drawn from a small fixed set, never invented at render time. Scanline pitch. Cursor position.

**Sparse data.** Absent fields are simply not printed. Do not print `null` or `-`. The block just gets shorter, which is fine.

**Failure modes.** It must not read as a joke about programmers. Keep the vocabulary about events, not about code. No fake stack traces, no fake errors, no fake IP addresses.

---

### T-06 `halftoneField` - generative duotone

**Intent.** The only template that is primarily an image. The image is mathematics rather than a photo, which keeps it original and cheap.

**Suits.** house, disco, breaks, garage, UKG, melodic

**Layout.** Full-bleed halftone field generated from a seeded scalar function: interfering sine waves, a radial falloff, or a smooth noise field. Two colours only, paper and one accent, no midtones beyond what the dot sizes create. Type knocked out in a horizontal band across the lower third where the field is darkened to a solid block, guaranteeing contrast. Headliner large, support below, date and venue on one line. Footer band.

**Type.** Archivo, heavy weight for the headliner, regular for the rest. All within the solid band.

**Seeded variation.** Field function, chosen from three. Dot shape: round, square, or line screen. Screen angle 15, 45 or 75 degrees. LPI 15 to 25. Accent colour. Band height and vertical position.

**Sparse data.** Handles it well, the band just gets shorter. Minimum content is a headliner and a date.

**Failure modes.** Element count. Cap at 4000 and drop lpi if exceeded. Contrast: the band must be solid, not a screen, or the knocked-out type will fail contrast at the dot edges.

---

### T-07 `ransom` - cut and paste

**Intent.** Photocopied zine. Genuine DIY rather than a filter applied to a clean layout.

**Suits.** jungle, hardcore, gabber, punk-adjacent, raves, all-nighters

**Layout.** Paper field, heavily degraded, with visible copier edge darkening on two sides. Content assembled as separate torn paper pieces, each with its own clip-path polygon from the PRNG, each rotated between -3 and +3 degrees, each holding one piece of information. Pieces overlap slightly. Tape across two or three of the joins. The headliner sits on the largest piece.

**Type.** Deliberately mixed. Each piece may use a different face, weight and size from a fixed set of four combinations. This is the only template permitted more than two type styles, because the format demands it.

**Seeded variation.** Piece count, 4 to 7. Polygon shapes. Rotations. Which pieces get tape. Copier degradation amount. Which type combination each piece uses.

**Sparse data.** Fewer pieces. Below three pieces it stops reading as a collage, so with very thin data route elsewhere.

**Failure modes.** Text must stay horizontal enough to read and fully inside its piece. Compute the piece polygon first, then fit the text into its inscribed rectangle, not the other way around. The degradation must never touch the glyphs.

---

### T-08 `index-list` - pure typography

**Intent.** No imagery at all. The lineup is the artwork. For nights with a long bill where every name matters.

**Suits.** all-dayers, multi-room, festivals, benefit nights, any lineup over six acts

**Layout.** Paper field, clean. A justified block of names filling the upper two thirds, set as continuous text with names separated by a slash or a bullet-free space, sized so that the block fills the measure exactly. Tier 1 names at 2.2x the base size, tier 2 at 1.4x, tier 3 at 1x, all in the same flowing block. Below, a hairline, then the event details in a single tight block. Footer band.

**Type.** Archivo only, three sizes. This is the second template permitted `lengthAdjust`, used to justify each line of the name block to the full measure.

**Seeded variation.** Very little, deliberately. Separator character. Base size within a narrow range. Whether the block is set flush left or justified.

**Sparse data.** Requires at least four acts. Below that, route elsewhere.

**Failure modes.** Justification producing rivers or absurd word spacing on lines with few names. Cap the stretch at 15 percent and fall back to flush left for lines that would exceed it.

---

### T-09 `cymatic` - standing wave

**Intent.** Sound made visible. A Chladni plate pattern or a standing wave figure, drawn as fine lines.

**Suits.** dub techno, deep, ambient, drone, minimal, experimental

**Layout.** Near-black field. A generated pattern occupying a large centred square, drawn as 200 to 600 thin accent-coloured lines or points. Below it, a quiet type block: headliner, support, date, venue, all small, all centred, all in paper colour. The pattern is the loud element, the type is deliberately understated. Footer band.

**Type.** Archivo, small, wide tracking, centred. Nothing larger than 48 px.

**Seeded variation.** Pattern parameters: mode numbers for the Chladni figure, or frequency ratio for a Lissajous figure. Line count and weight. Whether the pattern is drawn as lines, points or a contour. Accent colour.

**Sparse data.** Fine. The pattern carries it.

**Failure modes.** Element count and file size. Merge into fewer `<path>` elements with multiple subpaths rather than emitting hundreds of separate elements. The pattern must not extend behind the type block.

---

### T-10 `contour` - Canberra topography

**Intent.** The local one. A contour map as the field, referencing the landscape the scene actually happens in.

**Suits.** outdoor, bush events, doofs, ACT-specific nights, summer

**Layout.** Dark field. Contour lines drawn as nested curves across the full canvas at a consistent interval. One contour, chosen by the seed, is drawn heavier and in the accent colour, and the venue name sits on it with a leader line and a small marker, like a labelled spot height. The headliner sits in the upper third; details in the lower third. Footer band.

Two data sources, owner request (2026-09): by default the terrain is procedural, not traced from real elevation data -- an evocation of a map, not a map. If the event has a disclosed venue that's been geocoded (an explicit admin/crew action, `src/lib/geocode.js`, never run for a `location_tba` event), the lines are instead traced (marching squares) from that venue's real elevation data (Nominatim geocoding + OpenTopoData SRTM30m, a 9x9 grid ~1.2km across, cached on the event row rather than fetched at render time), and the marker sits exactly on the real geocoded point. Falls back to the procedural version whenever there's no grid -- a failed lookup, an ungeocoded venue, or a location-TBA event.

**Type.** Archivo. Small caps for the map-style labels, tracked +0.1em, which is the convention on real topographic maps.

**Seeded variation.** Procedural mode: terrain shape, contour interval and count, which contour is highlighted, marker style. Real-terrain mode: contour count and which contour is highlighted only -- the shape comes from the actual data.

**Sparse data.** Fine.

**Failure modes.** The procedural mode must never use real coordinates, real elevations or real place data beyond the venue name the event supplied. Real-terrain mode is opt-in and only ever for a disclosed venue -- real coordinates or elevation data for a location-TBA event would be an actual problem, enforced independently in both `src/lib/geocode.js` (never called) and `normaliseEvent` (never exposes a stored grid to the template even if one somehow existed).

---

## 8. Genre routing

When `flyer_template` is null, route automatically.

```js
const ROUTES = [
  { match: ['dubstep','140','halfstep','dub','sound system'],      template: 'medi' },
  { match: ['dub techno','minimal','ambient','drone'],             template: 'cymatic' },
  { match: ['hard techno','industrial','hardgroove','ebm'],        template: 'stencil' },
  { match: ['techno','warehouse'],                                 template: 'consignment' },
  { match: ['electro','idm','experimental','breakcore'],           template: 'terminal' },
  { match: ['drum and bass','dnb','jungle'],                       template: 'terminal' },
  { match: ['hardcore','gabber','hard dance','rave'],              template: 'ransom' },
  { match: ['house','disco','garage','ukg','2-step','breaks'],     template: 'halftoneField' },
  { match: ['outdoor','doof','bush','picnic'],                     template: 'contour' },
];
```

Resolution order:

1. If `flyer_template` is set, use it. Admin choice always wins.
2. If `acts.length >= 6`, use `index-list` regardless of genre. A long bill is a stronger signal than a genre tag.
3. Walk `ROUTES` in order and take the first genre match.
4. If the event has a headliner, a venue and at least two acts but no genre match, use `schematic`.
5. Otherwise `medi`.

At every step, check the chosen template's `needs` and `minLineup` against the event. If the event does not satisfy them, drop to the next candidate.

**Anti-repetition.** If the last three published events all resolved to the same template, nudge the next one to its second choice. Compute this at publish time and store the result in `flyer_template` rather than doing it at render time, otherwise the flyer changes as other events are published, which breaks determinism.

---

## 9. Colour

Inherits the material palette from the main spec 13.4. The flyer engine adds an accent set, used for exactly one element per flyer.

| Name | Hex | Use |
|---|---|---|
| Toner black | `#0a0a0a` | Dark fields. Not pure black, so grain is visible. |
| Photocopy paper | `#d6d5cf` | Paper fields, type on dark |
| Faded paper | `#bdbbb3` | Past events |
| Stamp ink | `#9c1f1f` | Status stamps only |

**Accent set.** One per flyer, picked by seed, weighted so no accent appears on more than about a fifth of the board at once.

| Name | Hex |
|---|---|
| Riso pink | `#ff48b0` |
| Riso blue | `#0078bf` |
| Riso yellow | `#ffe800` |
| Sodium | `#c77a2a` |
| Copier cyan | `#00a3ad` |
| Warning orange | `#e8590c` |

Rules:

- Two colours per flyer maximum, not counting the stamp. A field colour and an accent.
- No gradients, ever. If you want tonal variation, use a halftone or a dither.
- Riso yellow on paper fails contrast. It may only be used as a field colour with dark type on it, never as type on paper.
- Past events shift the paper colour to faded paper and drop accent saturation by 40 percent. Recheck contrast after the shift, do not assume it still passes.

---

## 10. Type

Same faces as the site, self-hosted WOFF2, no Google Fonts requests, licences verified.

| Role | Face | Used by |
|---|---|---|
| Body, most flyer text | Archivo | All |
| Display, stencil | Big Shoulders Stencil | `stencil`, stamps |
| Monospace | A licensed mono, TBC by Claude Code with reasons | `terminal`, `consignment`, `schematic` |

Rules:

- Two type styles per flyer maximum. `ransom` is the sole exception.
- Type scale on the flyer canvas: 22, 28, 36, 48, 64, 88, 120, 168, 232. Do not use sizes between steps except where `fitBlock` produces them, and round those to the nearest whole pixel.
- Tracking: body 0, small caps labels +0.08em, display -0.02em, map labels +0.1em.
- Artist names never render in title case. Caps or lowercase, consistently within a flyer, chosen by the template not by the seed.
- Minimum rendered size on the primary canvas is 22 px, which is roughly 3 px at scrap size. Anything smaller gets dropped rather than shrunk.

---

## 11. Rules that apply to every template

1. The footer band is present on every template except `terminal` and `index-list`, which incorporate the same information into their own structure.
2. The wordmark is present on every generated flyer, always.
3. Status stamps sit above everything and are drawn last. They never cover the date.
4. Past events get the faded treatment described in section 9 plus one extra layer of grain. No sepia, no blur, no opacity reduction on text.
5. The site never renders a generated flyer larger than 1080 wide on screen.
6. Hard edges only. Any stroke is a whole number of pixels. No anti-aliased decorative softness.
7. No element may be positioned by eye. Every coordinate derives from the grid, the margin, a measured text width or a seeded value within a stated range.
8. Copy inside flyers follows main spec 13.7 and the notation conventions below.

---

## 12. Notation conventions

These appear inside flyer artwork and must be consistent, because getting them wrong is the fastest way to look like an outsider to the scene.

| Thing | Rendered as |
|---|---|
| Back to back | `A B2B B` |
| Live set | `NAME (LIVE)` |
| DJ set by a live act | `NAME (DJ SET)` |
| Extended set | `NAME (EXTENDED SET)` |
| All night | `NAME ALL NIGHT LONG` |
| First local appearance | `NAME [CBR DEBUT]` |
| First Australian appearance | `NAME [AU DEBUT]` |
| More acts coming | `+ MORE TBA` |
| Support unnamed | `+ SUPPORT` |
| Presenter | `PRESENTER PRESENTS` or `PRESENTED BY PRESENTER` |
| Time range | `22:00 - 06:00` |
| Age | `18+` or `STRICTLY 18+ ID REQUIRED` |
| Withheld location | `LOCATION TBA` |
| Location reveal | `LOCATION DROPS {date}` |

Never render on a flyer: ticket prices, phone numbers, personal names, social media handles, drug references or drug imagery of any kind, alcohol imagery. The last three are legal and platform exposure for the crews as well as for the site.

The harm reduction mark in the footer band is a small text link reading `Look after each other` pointing at the harm reduction page. Keep it quiet. It is not a warning label.

---

## 13. Admin picker

In the admin event editor, below the artwork upload:

- **Preview.** The generated flyer at about 300 px wide, live.
- **Template select.** A dropdown of all ten with their blurbs, plus "Auto (by genre)" as the default. Shows which template auto-routing chose.
- **Reroll.** Increments `seed_salt` and re-renders. No animation, just the new flyer.
- **Compare.** Renders the same event through all ten templates as a grid of thumbnails, click to select. This is the fastest way to pick and it costs nothing because rendering is cheap.
- **Note.** A line of text saying the generated flyer is used only while there is no crew flyer, so the admin is never confused about precedence.

No controls for colour, type, layout or seed value. The templates are the design decisions. Opening them up produces worse flyers and an unmaintainable engine.

---

## 14. Testing

Build `scripts/flyer-contact-sheet.js` that renders a grid of every template against every fixture and writes an HTML file for visual review. Run it after any change to the engine. This is the single most useful thing you can build here.

**Fixtures.** At minimum:

| Fixture | Tests |
|---|---|
| `full` | Every field populated, 5 acts |
| `minimal` | Title and date only |
| `idOnly` | Nothing but an ID and a date |
| `longNames` | An act name of 44 characters, a venue of 38 |
| `longLineup` | 12 acts |
| `tba` | Location TBA with a reveal date |
| `cancelled` | Status stamp over a full flyer |
| `past` | Faded treatment |
| `unicode` | Names with accented characters and an ampersand |
| `singleAct` | One act, no support |

**Automated checks** in CI:

1. Determinism: render each fixture twice, assert byte equality.
2. Size: every composition under 60 KB, scrap surface under 12 KB.
3. Containment: no text box exceeds the canvas, computed from the metrics tables.
4. Contrast: every text colour against its backing colour clears 4.5:1, or 3:1 above 48 px.
5. Validity: parses as XML, single root, no external references, no `<script>`.
6. Element count under 4000.
7. Render time under 40 ms per composition on the CI runner.
8. Fallback: a deliberately broken template routes to `medi` and does not throw.

**Manual acceptance.** Print the contact sheet at A4 on a normal office printer and look at it on paper. Things that look fine on a screen fall apart on toner, and this project's whole aesthetic is about toner.

---

## 15. Acceptance criteria

Phase complete when:

- All ten templates render all ten fixtures without error.
- The contact sheet contains no flyer that a reasonable person would call broken, cut off, or empty.
- A stranger shown the board cannot immediately tell which flyers were uploaded by crews and which were generated, other than by the wordmark.
- All automated checks pass.
- Turning off the flyer engine entirely leaves a working site.

---

## 16. Build phases

| Phase | Contents |
|---|---|
| 2a | Renderer, seed, metrics, layout, parts library. `medi` and `consignment` only. Contact sheet script. |
| 2b | Remaining eight templates. Genre routing. Admin picker. |
| 3 | Scrap surface optimisation, caching, anti-repetition, past-event treatment. |
| 4 | Rasterisation for Open Graph. Decide the approach and record it. |
| 5 | A5 print download for crews. Optional. |

Do not start 2b until 2a meets its acceptance criteria with two templates.

---

## 17. Versioning

- `FLYER_ENGINE_VERSION` is a semver string in `src/flyers/index.js`.
- Patch: bug fixes producing no visual change.
- Minor: a new template, or a visual change to an existing one.
- Major: a change to the data contract or the template module interface.
- Every bump gets a `CHANGELOG.md` entry under `## Flyers` describing the visual change in words, because a diff of coordinate values tells a future reader nothing.
- Tag releases that include flyer changes.
- Keep the contact sheet output for each minor version in `docs/flyers/` so visual regressions are obvious.

---

## 18. Open questions for the owner

1. **Wordmark on generated flyers.** Confirmed as always present, or should it be suppressed on the event page where the site identity is already obvious?
2. **Print download.** Worth building in phase 5, or would crews rather just have the PNG?
3. **Template naming in the admin panel.** Internal IDs like `medi` and `consignment`, or plainer names like "Deep field" and "Shipping label"?
4. **Anti-repetition.** Is the board more interesting with visual variety, or more coherent if similar events look similar? The routing table currently favours coherence.
5. **A local template beyond `contour`.** Canberra has brutalist concrete and a very specific winter fog. Is there a second local template worth having, or does one keep it from becoming a gimmick?
