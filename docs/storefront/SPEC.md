# ShaderPaper storefront: working spec

Shared brief for everyone building the storefront (Figma and code). Written 2026-10-10 from the user's 9-phase request in the project thread. Decisions marked **default** were picked by Claude where the request forked; they are reversible. Anything marked **business input** must not be invented: leave the placeholder and list it in the blockers.

## 1. What is being built, and for whom

- **Brand:** ShaderPaper sells posters of generative shader art. The buyer customises the piece (four shape knobs, a palette and a colour strength, see `explorations/index.html` and memory `shaderpaper-customiser`) and orders a physical print.
- **Default:** the storefront is for ShaderPaper. The user's first message asked for "the pages necessary for the ecommerce website" of this project and to archive the Lifter app; the edited spec calls the target "Lifter", but Lifter is a workout-tracking app concept (Figma style probes only, no code, no catalogue). So "Lifter" here means: archive its Figma page and reuse its Figma file for the ShaderPaper designs.
- **Language default:** English. Markets and currencies copy Méridien's seed (region Europe in EUR; store currencies EUR and USD) until the user decides (**business input**).

## 2. What MapAndSky (Méridien) actually has, and what we reuse

Audited `moussamamadou/mapandsky` at `cdb03d5`:

| Piece | Méridien | ShaderPaper |
|---|---|---|
| Backend | Medusa 2.17.2 (`apps/backend`), Postgres | Copy, adapt `src/poster/` to shader posters |
| Storefront | Nuxt 4.5 (`apps/storefront`), Nitro `/api/*` BFF over `@medusajs/js-sdk`, httpOnly cookies, `[countryCode]` routing, region middleware, typed composables, Tailwind 3.4 | Copy the server layer, composables, utils, middleware and layouts' logic; new UI on the ShaderPaper tokens |
| Prodigi | **No API client.** Prodigi appears only as (a) sizes and frames chosen from Prodigi's formats, (b) prices set at about twice Prodigi sandbox quotes (2026-09-24) in `catalog.ts`, (c) an empty `PRODIGI_API_KEY` slot in `.env.template`. Fulfilment provider is Medusa's `manual_manual`. | Reuse (a) and (b) as the starting catalogue, flagged as Méridien's numbers. Add a small server-side Prodigi client (quotes, order submission) that stays off unless `PRODIGI_API_KEY` is set, sandbox by default, never called from the browser |
| Print files | `order.placed` subscriber → workflow → `apps/print-renderer` (headless Chrome screenshots the storefront's render page) → private file on the line item | Same pipeline; the render page draws the shader at print pixels |
| Payments | Stripe via `@stripe/stripe-js` when keys are set, otherwise Medusa's system default (manual) provider | Same. With the manual provider the UI must say "Test mode: no payment is taken" everywhere it matters |

## 3. Architecture (monorepo, pnpm 9 + Turborepo, like Méridien)

```
shaderpaper/
  apps/backend          Medusa (copied); src/poster/{catalog,print-files,print-renderer,prodigi}.ts
  apps/storefront       Nuxt 4 (copied server layer); pages per §6
  apps/print-renderer   copied; renders /render?d=… at print px
  explorations/         the shader catalogue (unchanged; the storefront embeds it)
  docs/storefront/      this spec, references, archive record, test report
```

- The browser never talks to Medusa or Prodigi. Secrets live in `apps/*/.env` (gitignored); only `.env.example` files are committed, with empty values.
- **Shader engine in the storefront (default):** the catalogue page is copied at build time to `apps/storefront/public/engine/index.html` (a script, not a hand copy) and gets an embed mode: `engine/index.html#embed?id=<poster>&seed=<n>&k=<k0,k1,k2,k3>&pal=<i>&lvl=<n|b|v>` paints one poster full-bleed and posts `{type:'sp:rendered'}` to the parent. The PDP customiser drives it with `postMessage`. One source of truth for the art.

## 4. Catalogue and data model

- **Products:** one Medusa product per catalogue poster (54, ids from `explorations/index.html`, tab Posters). `handle` = poster id (e.g. `glass`, `julia`, `mazestripes`), `title` = poster name, `description` = its blurb (`gallery/blurbs.json` in the scratchpad, or the catalogue's own text), `metadata.shader = { id, defaultSeed }`, `metadata.knobs` = the four knob definitions (names and ranges, from `KNOBDEF`).
- **Collections (categories):** the gallery's six: `geometric` Geometric, `pattern` Pattern & tiling, `lines` Lines & op-art, `organic` Organic & fluid, `light` Light & gradient, `material` 3D & material.
- **Variants:** size × frame, from Méridien's `catalog.ts`: sizes 30 × 40, 45 × 60, 60 × 80 cm (3:4); frames none, black, white, oak. 12 variants per poster, SKU `SP-<ID>-<SIZE>-<FRAME>`, `manage_inventory: false` (made to order).
- **Prices:** Méridien's `POSTER_PRICES` table (EUR 39/59/79 print; 119/149/179 framed black or white; 129/159/189 oak; USD likewise). **Business input:** these are Méridien's prices for its own posters, calibrated on Prodigi costs for the same formats; ShaderPaper's paper, margin and positioning are undecided.
- **The buyer's design** travels in the line item: `metadata.poster = { version: 1, design: { kind: 'shader', id, seed, knobs: [k0..k3|null], palette: <int|null>, strength: 'n'|'b'|'v' }, title, thumbnail? }` (same key as Méridien so the print pipeline ports unchanged).
- **Availability:** "Made to order" (no stock). Lead time and delivery promise are **business input** (Méridien says "Expédiée sous 3 à 5 jours" pending its Prodigi lab confirmation; do not reuse it as a ShaderPaper promise).

## 5. Design system (Figma variables = Tailwind theme)

Tokens: [`tokens.json`](tokens.json). Summary:

- **Look:** a quiet gallery. Warm paper ground, ink text, the posters carry all the colour. One signal colour (vermilion `#F0441A`) only for focus rings, the cart count and "New" badges, never for body text. Dark "night" bands for the footer and campaign hero.
- **Type:** Geist (display, headings, body) and Geist Mono (labels, captions, prices in tables). Labels are mono caps at 12/16, tracking 6%.
- **Shape:** posters and media are square-cornered with the `poster` shadow; buttons and inputs 2 px radius; chips, swatches and tags are pills.
- **Grid:** desktop 1440 (12 col, margin 48, gutter 24), tablet 834 (8 col), mobile 390 (4 col, margin 16, gutter 12). Max content 1344.
- **Accessibility:** text contrast ≥ 4.5:1 (ink-3 is 4.95:1 on paper, 4.53:1 on sunken, 5.48:1 on surface), visible focus ring (`shadow.focus`), hit targets ≥ 44 px on mobile, every control labelled.

### Components (Figma component sets → Vue components)

Button (primary, secondary, ghost, link × sm, md, lg × default, hover, focus, disabled, loading) · IconButton · TextField (default, focus, filled, error, disabled) · Select · Checkbox · Radio · QuantityStepper · FilterChip (off, on) · Badge (new, info, success, warning, danger) · PaletteSwatch (off, on) · KnobSlider · SegmentedControl · SizeOption / FrameOption (off, on, unavailable) · PriceTag · Breadcrumbs · Header (desktop, mobile; cart count) · MobileMenu · Footer (desktop, mobile) · ProductCard (default, hover, new) · PosterMockup (frame none, black, white, oak) · CartLine · CartDrawer · Dialog · Toast (success, error) · Accordion item · Tabs · Pagination · EmptyState · Skeleton (card, line, PDP) · Banner (test mode, info) · CheckoutStepper · OrderSummary.

## 6. Pages and routes

All storefront routes sit under `/{countryCode}` like Méridien (`/` redirects to the visitor's region).

| Route | Page | Notes |
|---|---|---|
| `/{cc}` | Home | Hero poster, categories, new 3D posters, how customising works, how it's printed |
| `/{cc}/campaigns/material` | Campaign landing | "3D & material" collection launch (the seven new 3D posters) |
| `/{cc}/shop` | All posters | Filters: category, colour family (from palette), price; sort: featured, newest, price ↑, price ↓, A–Z; grid density toggle |
| `/{cc}/collections/{handle}` | Category | Same grid, category header |
| `/{cc}/posters/{handle}` | Product (PDP) | Live customiser (4 knobs, palette, strength, new variation), size, frame, price, made-to-order, shipping info, add to cart, details accordion, related |
| `/{cc}/search?q=` | Search | Results, no results, empty query |
| `/{cc}/cart` | Cart page | Plus the cart drawer from the header; quantity, remove, empty state |
| `/{cc}/checkout` | Checkout | `?step=address`, `delivery`, `payment`, `review`; test-mode banner when only the manual provider is configured |
| `/{cc}/order/{id}/confirmed` | Confirmation | Says "test order, no payment taken" when paid with the manual provider |
| `/{cc}/account` | Login / register, then dashboard | Medusa customer auth (supported) |
| `/{cc}/account/orders`, `/orders/{id}`, `/profile`, `/addresses` | Account | Order history and detail |
| `/{cc}/about`, `/contact`, `/faq`, `/shipping`, `/returns`, `/privacy`, `/terms` | Info | Policy pages show a clearly marked "To be written" block wherever business input is missing |
| `/render` | Print render | noindex; used by the print renderer |
| any unknown | 404 / error | `error.vue` |

**States to design and build:** loading skeletons (grid, PDP, cart), empty (cart, search, orders, filters with no match), error (404, 500, add-to-cart failure, payment error), success (added-to-cart toast, order placed).

## 7. Honesty rules (from the user)

- Never present a manual-provider order as paid. Never show prices, delivery dates, policies or legal text we do not have; show "To be written" or "Calculated at checkout".
- Never commit `.env`; never put keys in client code; Prodigi stays sandbox in development.
- Nothing claims a Figma change or a test result that did not happen.
