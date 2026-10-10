# ShaderPaper storefront: what is built

`apps/storefront` (`@shaderpaper/storefront`): Nuxt 4.5 on Vue 3.5.40, vue-i18n 11.4.7 and
Tailwind 3.4, themed from [`tokens.json`](tokens.json). It talks to the Medusa backend in
`apps/backend` through its own Nitro BFF; the browser never calls Medusa. Spec:
[SPEC.md](SPEC.md). Status as of 2026-10-10: every route in SPEC §6 is built and was run against
the local backend at 1440 and 390 px wide; results are under [Verification](#verification).

## Copied from MapAndSky, removed, changed

Copied from MapAndSky's `apps/storefront` (itself a port of Medusa's Next starter):

- **The BFF** (`server/`): the `/api/*` routes over `@medusajs/js-sdk`, with auth headers passed
  per request, the cache tags, Medusa error mapping, and the cookies: `_medusa_jwt` (7 days,
  httpOnly), `_medusa_cart_id` (7 days, httpOnly), `_medusa_cache_id` (1 day),
  `_medusa_locale` (1 year), `_medusa_pending_customer` (1 day, email verification).
- **Region routing**: `app/middleware/region.global.ts` (307 to `/{countryCode}/…`, geo
  headers, fallback region) and the `[countryCode]` page tree.
- **Composables and utils**: cart, customer, orders, regions, locales, categories,
  collections, money, address comparison, geo headers.
- **Checkout, account and order logic**: address, delivery, payment (Stripe or Medusa's
  manual provider), cart completion, sign-in/register with email verification, profile,
  addresses, order history, order transfer routes.

Removed (Méridien only): the star map and city map builders (`app/atelier`, `app/poster`), the
Duo/Ensemble/Trio products, the onboarding and poster-photo API routes, the French locale and
copy, the product-option filters and sort helpers written for map products, and all of the
v3/v4 Méridien UI components (`common`, `home`, `products`, `skeletons`, `store`).

Changed or new:

- **UI** rebuilt on the ShaderPaper tokens with Geist and Geist Mono, using reka-ui for
  dialogs, drawers, tabs, accordion and menus, and lucide icons.
- **English only** (`i18n/locales/en.json`, 485 messages, no prefix strategy).
- **Catalogue model** (`shared/utils/catalog.ts`): one card per poster from the product's
  `metadata.shader`, `metadata.knobs` and category; filters, sorts and pagination are pure
  functions with tests.
- **Design model** (`shared/utils/design.ts`): the buyer's design, its URL query form, the
  engine hash and message, and the base64url form for `/render`.
- **The Medusa publishable key is server-only** (`runtimeConfig.medusaPublishableKey`), since
  only the BFF uses it.
- An unknown two-letter country (`/us/posters/glass`) is swapped for the fallback region
  instead of being nested under it.
- The account's order detail returns 404 unless the order belongs to the signed-in customer.
  Medusa serves any order by id, which the guest confirmation page relies on.

## Routes

All shop routes sit under `/{cc}` (a country of the backend's region: gb, de, dk, se, fr, es,
it). `/` and unknown countries redirect (307) to the fallback region, `fr`.

| Route | Page | 1440 | 390 |
|---|---|---|---|
| `/` | 307 to `/fr`, then home | 200 ✓ | 200 ✓ |
| `/fr` | Home | 200 ✓ | 200 ✓ |
| `/de` | Home (de) | 200 ✓ | 200 ✓ |
| `/us` | 307 to `/fr` (country not served) | 200 ✓ | 200 ✓ |
| `/fr/shop` | All posters | 200 ✓ | 200 ✓ |
| `/fr/shop?category=geometric,light&sort=price-a…` | All posters, filtered, sorted, compact | 200 ✓ | 200 ✓ |
| `/fr/collections/geometric` | Collection: geometric | 200 ✓ | 200 ✓ |
| `/fr/collections/pattern` | Collection: pattern | 200 ✓ | 200 ✓ |
| `/fr/collections/lines` | Collection: lines | 200 ✓ | 200 ✓ |
| `/fr/collections/organic` | Collection: organic | 200 ✓ | 200 ✓ |
| `/fr/collections/light` | Collection: light | 200 ✓ | 200 ✓ |
| `/fr/collections/material` | Collection: material | 200 ✓ | 200 ✓ |
| `/fr/collections/nope` | Unknown collection | 404 ✓ | 404 ✓ |
| `/fr/campaigns/material` | Campaign: 3D & material | 200 ✓ | 200 ✓ |
| `/fr/search` | Search, empty query | 200 ✓ | 200 ✓ |
| `/fr/search?q=glass` | Search with results | 200 ✓ | 200 ✓ |
| `/fr/search?q=zzzzqx` | Search, no results | 200 ✓ | 200 ✓ |
| `/fr/posters/glass` | Product (customiser) | 200 ✓ | 200 ✓ |
| `/fr/posters/k-cpack` | Product, underscore id | 200 ✓ | 200 ✓ |
| `/fr/posters/julia?seed=42&strength=v` | Product with unknown query keys (ignored) | 200 ✓ | 200 ✓ |
| `/fr/posters/nope` | Unknown product | 404 ✓ | 404 ✓ |
| `/fr/cart` | Cart, empty | 200 ✓ | 200 ✓ |
| `/fr/checkout` | Checkout without a cart | 404 ✓ | 404 ✓ |
| `/fr/account` | Account, signed out | 200 ✓ | 200 ✓ |
| `/fr/account/orders` | Account orders, signed out | 200 ✓ | 200 ✓ |
| `/fr/verify-account` | Verify email | 200 ✓ | 200 ✓ |
| `/fr/about` | Info: about | 200 ✓ | 200 ✓ |
| `/fr/contact` | Info: contact | 200 ✓ | 200 ✓ |
| `/fr/faq` | Info: faq | 200 ✓ | 200 ✓ |
| `/fr/shipping` | Info: shipping | 200 ✓ | 200 ✓ |
| `/fr/returns` | Info: returns | 200 ✓ | 200 ✓ |
| `/fr/privacy` | Info: privacy | 200 ✓ | 200 ✓ |
| `/fr/terms` | Info: terms | 200 ✓ | 200 ✓ |
| `/fr/order/order_nope/confirmed` | Unknown order | 404 ✓ | 404 ✓ |
| `/fr/order/order_01M4JPEB0M13BH9B13YC7H3Q8A/confirmed` | Order confirmation (the test order) | 200 ✓ | 200 ✓ |
| `/fr/does-not-exist` | Unknown page | 404 ✓ | 404 ✓ |
| `/render?d=…&size=45x60&mm=450x600` | Print render page | 200 · ready | 200 · ready |

Status is the final response after redirects. "✓" means the page also hydrated, logged no console error other than the expected 404 document, had no broken image and no horizontal scroll, and axe-core found no serious or critical issue. `/render` is sized for the print renderer's viewport, not for phones, so it is exempt from the scroll check at 390 and from axe.

Signed-in routes, run in a separate pass with a newly registered customer, all ✓ at both widths:

- `/fr/account` (dashboard)
- `/fr/account/orders` (empty list)
- `/fr/account/profile`
- `/fr/account/addresses`, including the add-address dialog

`/fr/account/orders/<another customer's order>` returns 404 at both widths.

The end-to-end runs below cover the remaining states:

- `/fr/cart` with lines, at both widths;
- `/fr/checkout` with a cart, through its `?step=address|delivery|payment|review` steps. All
  four steps ran at 1440; at 390 only the address step's errors ran.

## Components

| Folder | Components |
|---|---|
| `ui/` | Accordion, Badge, Banner (info, success, danger, test), Breadcrumbs, Button, Checkbox, Dialog, Drawer, EmptyState, FilterChip, IconButton, KnobSlider, OptionTile (size and frame), Pagination, PaletteSwatch, PriceTag, QuantityStepper, Radio, SegmentedControl, Select, Skeleton, Spinner, Tabs, TextField |
| `layout/` | Header (desktop and mobile, cart count), MobileMenu, CartDrawer, Footer, Toasts, Wordmark |
| `poster/` | Preview (the engine iframe), Mockup (frame none, black, white, oak), Thumb |
| `product/` | Card, Grid (comfortable and compact), Rail, Customiser |
| `shop/` | Browser (filters, sort, density, chips, pagination, mobile filter drawer), Filters |
| `cart/` | Line (with the design summary), Summary |
| `checkout/` | Stepper, AddressFields, AddressStep, DeliveryStep, PaymentStep, PaymentWrapper, StripeCard, ReviewStep |
| `order/` | Details |
| `account/` | Auth (sign in and register tabs), Nav, OrderCard |
| `info/` | Page (info page frame with side navigation), Tbw (the "To be written" block) |

## The customiser and the engine embed

The engine is the poster catalogue, `explorations/index.html`. `scripts/copy-engine.mjs` copies it to
`public/engine/index.html` before `dev`, `build` and `test`. The copy is gitignored and the
script refuses a file without the embed mode. There is one source of truth for the art.

**Embed protocol.**

- **Iframe URL.** `PosterPreview` loads `/engine/index.html#embed?id=<shader id>&seed=<n>&k=<k0,k1,k2,k3>&pal=<i>&lvl=<n|b|v>&dpr=<1–4>`.
  An empty `k` slot or `pal` means "decided by the variation (seed)".
- **Messages to the engine:** `{type:'sp:set', id, seed, k, pal, lvl, seq}` repaints, and
  `{type:'sp:palettes', id}` asks for the palette list.
- **Messages from the engine:** `sp:ready`, then `sp:rendered {ms, fam, pal, seq, w, h}`,
  `sp:palettes {fam, palettes, current, knobs}` and `sp:error`.
- **Bursts.** Slider drags send at most one message per frame. A paint whose `seq` is older
  than the latest request is ignored.

**PDP state.**

- **Which shader.** The page routes by product handle and draws `product.metadata.shader.id`.
  Underscore ids have dashed handles: `k_cpack` is drawn on `/posters/k-cpack`.
- **Starting design.** The default seed comes from `metadata.shader.defaultSeed`. The default
  colour strength comes from `metadata.shader.strength`, or `b` when there is none.
- **URL.** The design round-trips in the query, debounced to 300 ms with `router.replace`.
  Only values that differ from the defaults are written:
  - `v` is the seed;
  - `k` is the four knobs, comma separated, empty for the variation's own;
  - `pal` is the palette index;
  - `lvl` is the strength;
  - `size` and `frame` are the variant options.

  A reload or a shared link restores the design.
- **Controls.**
  - **New variation** picks a random seed and clears knobs and palette.
  - **Reset** returns to the product default.
- **Phone layout.** Below 1024 px the customiser is three tabs (Shape, Colour, Size & frame)
  under a sticky preview, with a fixed add-to-cart bar.

**Add to cart.** The cart line gets this metadata:

```json
{ "poster": { "version": 1,
  "design": { "kind": "shader", "id": "glass", "seed": 2122, "knobs": [null, 0.55, null, null], "palette": null, "strength": "v" },
  "title": "Glass Lens",
  "thumbnail": "data:image/webp;base64,…" } }
```

- **Thumbnail.** A 160 px snapshot of the painted canvas. It is kept under 40 kB and falls
  back to JPEG above that; it is omitted if the canvas cannot be read.
- **Display.** The cart, drawer, order pages and account show the design in words:
  variation, knobs set, palette and colour strength.
- **Snapshot size.** In the live run the snapshot was about 4 to 10 kB, and it is copied
  into the order.

**`/render` (print page, noindex).**

- **Request.** `/render?d=<base64url JSON>&size=<id>&mm=<w>x<h>`. The page also accepts the
  whole `metadata.poster` object as `d`.
- **Page size.** The page is 1000 logical px on the short side, with the `mm` ratio (portrait,
  or landscape when the viewport is landscape). It sets `window.__POSTER_SIZE__`.
- **Art.** The art is drawn at 3:4, the sheet's own aspect, so it fills the sheet, in an engine iframe at
  `dpr = clamp(devicePixelRatio, 1, 4)`.
- **Ready signal.** After `sp:rendered` and two animation frames it sets
  `window.__POSTER_READY__ = true`. It sets `__POSTER_ERROR__` on an engine error or an
  invalid design.

This matches the contract of `apps/print-renderer`. The renderer ran against this page for test
order #3 and wrote its 45 × 60 cm print file (see [backend.md § 8](backend.md#8-verified-on-2026-10-10-local)).

**Aspect.** `shared/utils/aspect.ts` holds the one constant, `POSTER_ASPECT = 3:4`, the aspect of
the print sizes and of the engine's sheet (`SHEET_AR` in `explorations/index.html`, 3:4 since
2026-10-10). The PDP mockup, the thumbnails (`aspect-poster` and `aspect-thumb` in Tailwind) and
`/render` all read it. The engine still draws the earlier 4:5 sheet with `ar=4:5`, pixel-identical
to before the recompose.

**Thumbnails.** `public/posters/<id>.webp` and `<id>-2.webp` (600 × 800) are variations 1 and 2
of each poster with every knob left to the seed, at the strength in `public/posters/levels.json`,
rendered by the engine itself: `pnpm --filter @shaderpaper/storefront images` (runs
`scripts/render-poster-images.mjs`; set `CHROMIUM_PATH` if playwright-core cannot find Chromium).

## Environment variables

`apps/storefront/.env` (gitignored; `.env.example` is committed with empty values):

| Variable | Where it is used | Notes |
|---|---|---|
| `MEDUSA_BACKEND_URL` | server only | Default `http://localhost:9000` |
| `MEDUSA_PUBLISHABLE_KEY` | server only | Publishable key of the backend's sales channel. `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is still read as a fallback, but no longer reaches the client |
| `NUXT_PUBLIC_DEFAULT_REGION` | client and server | Default `fr` |
| `NUXT_PUBLIC_FALLBACK_REGION` | client and server | Where unplaceable visitors land; `fr` locally |
| `NUXT_PUBLIC_BASE_URL` | client and server | Canonical links; default `http://localhost:3000` |
| `NUXT_PUBLIC_STRIPE_KEY` | client | Stripe *publishable* key. Empty means no card payments |
| `NUXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY`, `NUXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID` | client | Medusa Payments variant of the above; unused locally |

## Mocked, incomplete or undecided

- **Payments are test-only.** The backend's only provider is Medusa's manual
  `pp_system_default`, and the storefront treats that as test mode
  (`isTestMode(providers)`: the list is not empty and every provider is the manual one). In
  test mode:
  - a "Test mode — no payment will be taken" banner shows on the checkout and payment step;
  - the review step's button reads "Place test order";
  - the confirmation says "Test order — no payment was taken", and the order details read
    "Test payment: no payment was taken";
  - the account marks manual-provider orders as test orders.
- **Stripe is untested.** The Stripe path (`PaymentWrapper`, `StripeCard`,
  `confirmCardPayment`) is copied logic. No key was set, so it was not run.
- **Prodigi** is not wired into the storefront. Quotes and order submission belong to the
  backend, sandbox only. Shipping options and prices are whatever the backend returns. Locally
  that is "Standard Shipping" and "Express Shipping", both €10.00. No delivery time is shown
  anywhere.
- **Policies and business facts** show the "To be written — needs business input" block
  (`InfoTbw`). This covers:
  - who we are, and the print partner, paper, inks and production time;
  - contact details;
  - shipping times;
  - returns and withdrawal, and damaged or misprinted posters;
  - privacy, terms of sale, and the terms the buyer agrees to at checkout;
  - what happens after an order;
  - four FAQ answers.

  The privacy page lists the cookies above as technical facts only.
- **Prices** are the backend's catalogue (EUR 39/59/79 unframed, 119 to 189 framed). These
  are Méridien's numbers, carried over as a placeholder (SPEC §4). Taxes show €0.00 because
  the local region has no tax rates.
- **Art aspect.** The art is composed at 3:4 to match the print sizes (default picked on
  2026-10-10 while the decision card was unanswered; the 4:5 sheet remains available, see
  **Aspect** above).
- **The print resolution is capped.** The engine caps the embed at `dpr` 4 and at 4096 px for
  the canvas (also capped by the GPU's maximum viewport size).
  - On the 1000 × 1333 logical page, the 3:4 art fills the page, so its canvas is at most
    3072 × 4096 px, whatever scale factor the renderer asks for.
  - That is about 130 dpi at 60 × 80 cm and about 260 dpi at 30 × 40 cm.
  - A 300 dpi print needs tiling or a larger cap.
  - Not solved here.
- **Search** is Medusa's store product search (`q`) through the BFF. No ranking or
  synonyms of our own.
- **Not built:**
  - the SPEC's shop filter by colour family (category and price filters are built);
  - promotions UI (the BFF route exists, with no field in the cart);
  - order transfer UI (the BFF routes exist).
- **Not exercised:**
  - the account's detail page for the customer's *own* order, because the test orders were
    placed as a guest;
  - email verification, because the local backend did not require it.
- **Copy.** Hero and section copy is descriptive (what the product is and how customising
  works). It makes no claims about quality, speed or prices beyond the backend's numbers.

## Running it

```sh
pnpm install                                    # root; then nuxt prepare runs in postinstall
cp apps/storefront/.env.example apps/storefront/.env   # fill in the backend URL and publishable key
pnpm --filter @shaderpaper/storefront dev       # http://localhost:3000 (backend on :9000)
pnpm --filter @shaderpaper/storefront test      # vitest: utils, design, catalogue, aspect, checkout
pnpm --filter @shaderpaper/storefront typecheck # nuxt typecheck (vue-tsc)
pnpm --filter @shaderpaper/storefront build
```

## Verification

Run on 2026-10-10 against the local Medusa backend (region Europe/EUR, only the manual payment provider), with `nuxt dev` on port 3000 and headless Chromium (SwiftShader WebGL).

**Unit tests, typecheck and build.**

- `pnpm --filter @shaderpaper/storefront test`: 7 files, 36 tests passed. They cover the
  catalogue, design, knobs, variants, aspect and render decoding, checkout and address
  validation, and the design summary.
- `typecheck` exited 0.
- `build` succeeded (7.68 MB, 1.95 MB gzip).
- The production build was also served on port 3001 and the product page hydrated in a
  browser.
- The client HTML contains no `pk_` key.

**Accessibility.** `@axe-core/playwright` 4.13.0 checked WCAG 2.0, 2.1 and 2.2 A/AA plus best
practice on every route above.

- Fixed in this round: `heading-order` on the grid pages, and the phone-width overflow on the
  shop toolbar and the account navigation.
- Result after the fixes: 0 serious or critical issues and 0 moderate.
- Excluded: Nuxt's dev-only error overlay (`nuxt-error-overlay`), which is not storefront
  markup.

**End to end, desktop 1440** (all passed):

1. **Product page.** The engine iframe paints the design. Moving a knob repaints it, and the
   canvas changes.
2. **Design in the URL.** The design lands in the URL (`?k=,0.72,,&lvl=v`), and a reload
   restores it.
3. **New variation and options.** "New variation" repaints with a new seed. Size and frame
   change the price: €39, then €59 (45 × 60 cm), then €149 (Black frame).
4. **Add to cart.** The drawer opens with "Added to your cart: Glass Lens · 45 × 60 cm ·
   Black frame" and the design summary. The cart line's `metadata.poster` is
   `{ version: 1, design: { kind: 'shader', id: 'glass', seed, knobs, palette, strength },
   title, thumbnail }`.
5. **Cart.** Quantity + updates the subtotal. Removing a second line works.
6. **Checkout: address.** The test-mode banner shows. An empty submit lists six errors in an
   error summary that takes focus, and marks the fields `aria-invalid`.
7. **Checkout: delivery, payment and review.**
   - Delivery lists two options from the backend.
   - The payment step shows the test-mode banner and the single "Test payment (manual)"
     option.
   - The review button reads "Place test order".
8. **The one test order.**
   - Order: `order_01M4JPEB0M13BH9B13YC7H3Q8A`, display #1, placed as a guest.
   - Contents: 2 × Glass Lens, 45 × 60 cm, Black frame, design seed 2122 with knob 2 set to
     0.55. €298 plus €10 shipping, €308 in total.
   - The confirmation reads "Your test order is placed" and "Test order — no payment was
     taken", and its payment line reads "Test payment: no payment was taken".
   - The order's line carries `metadata.poster`.
   - The header cart is empty afterwards. The script's own final cart check failed on the
     empty response; that was a script bug, not a store error.
9. **Console.** No console errors during the flow.

**End to end, phone 390** (no order placed; all passed):

- **Product page.** The customiser shows three tabs, and the Colour tab shows the palettes. A
  palette tap repaints the art.
- **Layout.** No horizontal scroll, and the add bar is fixed at the bottom. The add bar opens
  the drawer with the design summary.
- **Cart and checkout.** The cart works. The checkout's empty submit lists the errors.
- **Usable area.** Between the sticky preview and tabs (about 470 px at 844 px tall) and the
  add bar, the controls have a band of about 290 px.

**Account** (passed): registration (with validation), the signed-in pages at both widths, the
add-address dialog (with validation, then saved), and sign out.

**Screenshots**: `/tmp/claude-0/-home-claude-shaderpaper/a77498ee-5a59-580c-9cd0-9bb75817eb52/scratchpad/storefront_shots/`. These are outside the repo. Files:

- `desktop-<route>.png` and `mobile-<route>.png`: full page, for every route and the signed-in pages;
- `e2e-01…10` (desktop flow) and `e2e-m01…m05` (phone flow).

**Caveats.**

- **Clicking before hydration.** Before hydration finishes, the server-rendered buttons do
  nothing. In dev that takes 1 to 2 s; this is how the first cart-quantity check failed. The
  tests now wait for `<html data-hydrated>`.
- **WebGL.** The live preview needs WebGL, and the product thumbnail stands in until the
  first paint. What the preview shows on a browser without WebGL was not exercised.
