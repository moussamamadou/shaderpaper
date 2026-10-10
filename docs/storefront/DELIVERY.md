# ShaderPaper storefront: delivery notes

Status on 2026-10-10. This is the index for the nine-phase request: what exists, where it is, how it was checked, and
what still needs a decision, a credential or business input. Details live in the documents linked from each section.

## What needs you

| # | What | Why it blocks | Where it shows |
|---|---|---|---|
| 1 | **The art aspect.** The posters are now composed at 3:4, the shape of the print sizes (the recommended option of the open decision card). The 4:5 sheet still renders, pixel-identical, with `ar=4:5`. | Changing it back means re-rendering the thumbnails and the Figma art | [storefront.md § Aspect](storefront.md#the-customiser-and-the-engine-embed) |
| 2 | **Prices, shipping, taxes and markets.** The prices are Méridien's, carried over as placeholders (EUR 39 / 59 / 79 unframed, 119 to 189 framed). Shipping is the starter's flat €10 for Standard and Express. Taxes are 0 %. One EUR region. | Nothing here is a ShaderPaper decision | [backend.md § 5](backend.md#5-placeholders-and-business-input) |
| 3 | **Prodigi.** Pick the 12 SKUs (and framed attributes), give a sandbox API key, and choose public file storage for print files (S3 or similar). | The client is written and tested offline but has never called Prodigi; prodigi.com is unreachable from this machine | [backend.md § 6](backend.md#6-prodigi-client) |
| 4 | **Payments.** A Stripe test key, if card payments should be tested. | The only provider is Medusa's manual one, so every order is a test order that takes no payment | [storefront.md § Mocked](storefront.md#mocked-incomplete-or-undecided) |
| 5 | **Policies and business facts.** Who we are, print partner, paper and inks, production and delivery times, contact details, returns and withdrawal, privacy, terms of sale, four FAQ answers. | Every such block reads "To be written — needs business input" | `InfoTbw` on the info pages |
| 6 | **Photography.** No product photos exist; the product page shows the live render in a drawn frame mockup. | Nothing to show of the physical print | Product page |
| 7 | **Figma image uploads.** Allow `mcp.figma.com` in this environment's network access (Project settings, Cloud environment). | Figma's upload tool posts to that host, which the network policy denies, so images can only be sent inline as base64, which is slow and costly. 40 of the 54 posters therefore have no exact 3:4 image in Figma yet (see Phase 4) | This file, Phase 4 |

## Phase 1: audit

[audit.md](audit.md). Lifter is a Figma-only concept (no code anywhere this account can reach). MapAndSky (Méridien)
has a Medusa backend, a Nuxt storefront, a print renderer and Prodigi-shaped sizes and prices, but **no Prodigi API
client and no Stripe in the backend**. The Méridien Figma was read for structure and conventions.

## Phase 2: Lifter archive

[lifter-archive.md](lifter-archive.md). In Figma only, non-destructively: page `0:1` renamed
"99 — Archive · Lifter style probes (archived 2026-10-10)", moved last, one note added. 5,370 nodes before, 5,371
after; all 100 phone screens intact. Nothing was deleted. Recovery: rename the page back.

## Phase 3: references

[references.md](references.md): ZARA (gallery) and the Apple Store (configure, then buy) from Mobbin, plus Méridien's Figma, each with what ShaderPaper
takes and what it does not.

## Phase 4: design system (Figma)

File: <https://www.figma.com/design/WJaAvH0aRGvb46Z87FKV1A>

| Page | Holds |
|---|---|
| `17:3` 00 — Cover | Cover frame `47:2` and the page index |
| `17:4` 01 — Foundations | Variables "SP / Tokens v1" (61, mirrors [tokens.json](tokens.json)) and "SP / Content samples"; 17 text styles; grid styles; poster art: section `26:2` (16 `Art/<id>` components) and section `57:5279` "Poster art · 3:4" |
| `17:5` 02 — Components | Sections Icons, Actions, Inputs, Selection & configurator, Navigation, Feedback & states, Commerce (28 component sets) |
| `17:6` 10 — Pages · Desktop | Sections Browse `50:61`, Account & info `50:327`, Cart & checkout `50:385` |
| `17:7` 11 — Pages · Mobile | Sections Browse `53:1146`, Cart, checkout & account `51:315` |
| `17:8` 12 — States | Sections Loading `53:1861`, Empty `53:1862`, Errors `53:1863`, Success & notices `53:1864` |
| `17:9` 20 — References | The references board |
| `0:1` 99 — Archive | Lifter, archived |

**Poster art.** Images can enter Figma only through the plugin API inline (see "What needs you" #7). Section
`57:5279` holds 12 new 216 × 288 (3:4) components: sky, eclipse, form, groovy, invert, vortexp, rhythm, mesh, stones,
tiles, k_marble, qblocks. The 16 earlier `Art/<id>` components were drawn at 4:5. The remaining 3:4 JPEGs
(216 × 288, the storefront thumbnails) are ready to upload once the host is allowed.

## Phase 5: pages and states (Figma)

All frames are built from the component instances, at 1440 (desktop) and 390 (mobile).

- **Desktop · Browse** `50:61`: Home `52:953`, Campaign `53:1518`, Shop `53:2661`, Collection `53:3366`, Search `53:3728`,
  Product `53:5031`, Not found `53:5781`.
- **Desktop · Cart & checkout** `50:385`: Cart `53:1710`, Details `53:3212`, Delivery `53:3980`, Payment `53:4097`,
  Review `53:4240`, Confirmed `53:5370`.
- **Desktop · Account & info** `50:327`: sign in and register, dashboard, orders, order detail, profile, addresses
  with the add-address dialog, and the info pages (10 frames).
- **Mobile · Browse** `53:1146`: 8 frames including the menu drawer `53:5570`.
- **Mobile · Cart, checkout & account** `51:315`: 12 frames.
- **States** `17:8`: Loading (shop grid at 1440 and 390, product, cart), Empty (cart, cart drawer, search without a
  query and without results, account orders, shop filters with no match), Errors (404, 500, unknown product,
  add-to-cart failure).

## Phase 6: storefront

[storefront.md](storefront.md) (front end) and [backend.md](backend.md) (Medusa, print renderer, Prodigi).

- `apps/storefront`: Nuxt 4.5, Vue 3.5.40, vue-i18n 11.4.7, Tailwind 3.4, copied from MapAndSky's storefront
  (Nitro BFF over `@medusajs/js-sdk`, httpOnly cookies, `/{countryCode}` routing) and rebuilt for ShaderPaper.
  The Medusa publishable key is server-only; no secret reaches the client.
- `apps/backend`: Medusa 2.17.2 from MapAndSky. 6 collections, 54 posters, 648 variants (3 sizes × 4 frames).
- `apps/print-renderer`: headless Chrome service; renders the print file after `order.placed`.
- The customiser runs the poster engine (`explorations/index.html`) in an iframe; the buyer's design is kept in the
  URL, the cart line and the order.

**Routes** (all under `/{cc}`, a country of the Europe region; `/` redirects to `/fr`): home, shop (filters, sort,
density, pagination), six collections, the 3D & material campaign, search, product (customiser), cart, checkout
(address, delivery, payment, review), order confirmation, account (sign in and register, dashboard, orders, order
detail, profile, addresses), verify account, about, contact, FAQ, shipping, returns, privacy, terms, 404, and `/render`
(the print page). The full list with results is in [storefront.md § Routes](storefront.md#routes).

**Prodigi**, exactly: `apps/backend/src/poster/prodigi.ts` and `prodigi-submit.ts` implement order creation, quotes
and product lookup against Print API v4. Sandbox by default, off without `PRODIGI_API_KEY`, `live` refused outside
production, sent only when an admin presses "Send to Prodigi" on an order (never automatically). The key stays in
`apps/backend/.env` (gitignored). It has never called Prodigi.

## Phase 7: Figma and code

The code is the reference. Building the pages in Figma surfaced two phone bugs in the code, both fixed and covered
by the phone check: the checkout step label was cut off (`checkout/Stepper.vue`), and the poster rails lost their
16 px side margin when snapped (`product/Rail.vue`).

The component differences found while building the pages are listed below with their state.

## Phase 8: tests

Run on 2026-10-10 against the local backend (manual payment only), headless Chromium with SwiftShader WebGL. The
browser checks are in the repo: [apps/storefront/e2e](../../apps/storefront/e2e/README.md).

| Check | Result |
|---|---|
| Storefront unit tests (`pnpm --filter @shaderpaper/storefront test`) | 36 passed |
| Backend unit tests | 47 passed |
| Print renderer tests | 16 passed |
| Typecheck: storefront, backend, print renderer | pass |
| Builds: `nuxt build`, `medusa build` | succeed |
| Route crawl (`e2e:crawl`): status, hydration, console errors, broken images, horizontal scroll, axe WCAG A/AA serious and critical | 74 of 74 route checks pass (37 routes × 1440 and 390) |
| Internal links found on those pages | 104 checked, 0 broken |
| Desktop flow with an order (`e2e:flow … place`): customiser, URL round trip, variant prices, drawer, cart, checkout validation, delivery, test-mode banners, confirmation | 19 passed (test order #3) |
| Phone flow (`e2e:flow:mobile`): tabs, palette, add bar, drawer, cart, checkout errors, step label, rail margin | 13 passed |
| Account (`e2e:account`): register, signed-in pages at both widths, add address, sign out, another customer's order is 404 | 18 passed |
| Print file | Order #3's `order.placed` rendered its 45 × 60 cm print file through the print renderer (5400 × 7198 PNG) |

Three test orders exist in the local database (`#1` to `#3`), all with the manual provider: no payment was taken.

## Phase 9: what is mocked or incomplete

- **Payments are test-only**, and the UI says so ("Test mode — no payment will be taken", "Place test order",
  "Test order — no payment was taken"). Stripe's path is copied code and was never run.
- **Prodigi has never been called** (#3 above). Shipping status does not flow back (no webhook).
- **Shipping** €10 flat, **taxes** 0 %, **no delivery times** shown anywhere.
- **Policies** are "To be written" blocks.
- **Print resolution** is capped at 3072 × 4096 px (about 130 dpi at 60 × 80 cm, 260 dpi at 30 × 40 cm). A 300 dpi
  print needs tiling or a larger cap.
- **Not built**: the colour-family filter, a promotions field, the order transfer UI.
- **Not exercised**: email verification (the local backend does not require it), the account's detail page of the
  customer's own order, the live preview without WebGL.

## Defaults picked while you were away

- The storefront is for ShaderPaper. Lifter had no code, so its Figma page was archived and the file reused.
- 3:4 art (#1).
- English, EUR, the Europe region, `fr` as the fallback country.

## Running it

```sh
pnpm install
cp apps/backend/.env.template apps/backend/.env        # DATABASE_URL, JWT_SECRET, COOKIE_SECRET
cp apps/storefront/.env.example apps/storefront/.env   # MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY
(cd apps/backend && npx medusa db:migrate && pnpm dev) # :9000, seeds once
pnpm --filter @shaderpaper/storefront dev              # :3000
```

The print renderer and its variables are in [backend.md § 7](backend.md#7-how-to-run-it).
