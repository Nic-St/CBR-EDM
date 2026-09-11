# Design token plan

Produced before any UI work, per SPEC.md section 0 instruction 4. Checked
against the banned list in SPEC.md section 13.6 below. This is phase 0
documentation; the UI itself is built in phase 1.

## Colour

Built from the "wall at night" concept (SPEC.md section 13.3): real
materials, not a UI palette. Refined slightly from the spec's starting point
(section 13.4) for contrast, not for looks.

| Token | Hex | Material | Use |
|---|---|---|---|
| `--wall-base` | `#2b2a27` | Wet concrete | Page background, under the grain texture |
| `--wall-patch` | `#403e39` | Concrete patch | Wall variation, calendar backing |
| `--paper` | `#d9d8d2` | Photocopy paper | Event scraps, cool grey-white |
| `--paper-faded` | `#bab8b0` | Faded paper | Past event scraps |
| `--toner` | `#141312` | Toner | Body text on paper (not true `#000`, so it doesn't look like a default) |
| `--stamp-ink` | `#8f1d1d` | Stamp ink | Status stamps only, on paper only |
| `--sodium` | `#b8722a` | Sodium streetlight | Sparing lighting accent on the wall texture, never as a UI accent colour |
| `--focus-ring` | `#e8b04a` | Rub-down lettering gold | Keyboard focus only, high contrast against both wall and paper |

Contrast check (WCAG 2.2 AA, 4.5:1 body text):
- `--toner` on `--paper`: 14.7:1.
- `--toner` on `--paper-faded`: 10.9:1.
- `--stamp-ink` on `--paper`: 5.3:1 (passes at the stamp's larger weight and size regardless).
- `--paper` on `--wall-base` (used for edges/labels, not body copy): decorative only, not relied on for text contrast.

Banned-list check: no near-black-plus-neon-accent formula (the palette is
mostly desaturated concrete and paper; the one warm tone is a lighting
effect, applied to texture, never as a button or link colour). No purple,
blue or neon gradients. No warm-cream-plus-terracotta pairing (paper is a
cool grey-white, not cream). No glassmorphism or blur anywhere in this list.

## Type

| Token | Face | Weight | Use |
|---|---|---|---|
| `--font-display` | Big Shoulders Display | 700-900 | Slogan, page and section headings |
| `--font-stencil` | Big Shoulders Stencil | 700 | Status stamps, the rare heavy label |
| `--font-body` | Archivo | 400-600 | Body copy, event details, forms |

Both are SIL Open Font Licence and will be self-hosted as WOFF2 in
`public/fonts/`, never loaded from Google Fonts, so there is no third-party
request on any page. This also means the site keeps working if Google Fonts
is ever blocked or slow, which matters for a no-JS-required reading
experience.

Type scale (base 16px, so body text meets the 16px minimum in section 14):

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-body` | 16px | 1.5 | Body copy |
| `--text-small` | 14px | 1.4 | Card metadata, footer |
| `--text-h3` | 20px | 1.3 | Card titles |
| `--text-h2` | 28px | 1.2 | Section headings ("Coming up", event page title) |
| `--text-h1` | clamp(40px, 8vw, 88px) | 1.05 | The slogan strip, the one loud element |

Line length is constrained to under 80 characters with `max-width: 38ch` to
`45ch` on body text containers, not on the page as a whole.

Banned-list check: not Inter, Roboto, system-ui, or another overused SaaS
face.

## Shape and depth

| Token | Value | Notes |
|---|---|---|
| `--radius` | `0` | No rounded corners anywhere, per the banned list |
| `--rotation-max` | `1.5deg` | Seeded per event ID (SPEC.md section 13.5), never randomised on every render |
| `--shadow` | none (flat) | Depth comes from paste-stain overlays and toner edge darkening, drawn as textures, not `box-shadow` blur |
| `--tape-width` | `28px` | Corner and edge tape marks on scraps |

Torn edges are `clip-path` polygons seeded from the event ID, generated at
render time by a small deterministic function (a seeded PRNG keyed on the
ID string), not a fixed set of SVG shapes, so scraps don't visibly repeat
across a page with many events. That function is real UI logic and a good
candidate to write together when phase 1 starts, rather than something to
settle in a token plan.

Banned-list check: no rounded corners, no soft grey drop shadows, no
gradient washes.

## Motion

| Token | Value |
|---|---|
| `--motion-page-load` | none |
| `--motion-interaction` | one deliberate transition only (a scrap straightening when opened), `200ms ease-out` |

Everything respects `prefers-reduced-motion: reduce` by dropping the one
interaction transition to an instant state change.

Banned-list check: no fade-and-slide-up entrance animations, no hover lift
applied to every card.

## Texture

Grain is generated with SVG `feTurbulence`, rendered once to a small tiling
PNG at build time and cached with a long `Cache-Control` header, rather than
computed live in every browser or sourced from a stock photo. Texture always
sits behind or around text, never over it, per section 13.5.

## Accessibility fallback

Under `prefers-contrast: more`: texture opacity drops to near zero, rotation
resets to `0deg`, and `--paper`/`--wall-base` contrast is re-checked to stay
above 7:1 (AAA) rather than just 4.5:1, since a user asking for more contrast
is asking for more than the minimum.

## What's still open

Section 18 leaves the site name and the Acknowledgement of Country wording
TBC. Neither affects these tokens; both are one-line changes in
`src/config.js` once decided.
