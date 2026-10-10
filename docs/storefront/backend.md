# ShaderPaper backend: what was copied, what changed, how to run it

Written 2026-10-10. Covers `apps/backend` (Medusa) and `apps/print-renderer`. Both were copied from MapAndSky (Méridien, `moussamamadou/mapandsky` at `cdb03d5`) and adapted; the first commit on this branch is the verbatim copy, so `git diff` against it shows every change.

**Status:** runs locally against Postgres 16 and answers the store and admin APIs (verified below). Nothing is deployed. No order has been placed, so the print-file workflow and the Prodigi submission have only run in unit tests. The Prodigi client has never talked to Prodigi: there is no API key, and this machine cannot reach prodigi.com.

## 1. What MapAndSky actually has (audit)

- **No Prodigi API client.** Prodigi appears in Méridien only as (a) the sizes and frames, picked from Prodigi's formats; (b) the price table in `catalog.ts`, set at about twice Prodigi sandbox quotes of 2026-09-24; (c) an empty `PRODIGI_API_KEY=` in `.env.template`. Fulfilment is Medusa's manual provider (`manual_manual`). Nothing in Méridien sends an order to a print lab.
- **No Stripe in the backend.** `medusa-config.ts` registers no payment module; the seeded region uses `pp_system_default` (takes no payment). Méridien's *storefront* can drive Stripe's card form (`@stripe/stripe-js`, `NUXT_PUBLIC_STRIPE_KEY`) when a region offers a `pp_stripe_*` provider, which the seed never sets up.
- **Its jest config could not run under pnpm:** it required `@medusajs/utils` (not a direct dependency) and a missing `integration-tests/setup.js`; Méridien had no backend tests, and its pre-commit hook runs the backend's lint only.

## 2. File by file

`apps/backend` (Medusa 2.17.2, same dependency versions as Méridien):

| Méridien file | ShaderPaper | What changed |
| --- | --- | --- |
| `package.json` | adapted | Name `@shaderpaper/backend`, private; scripts `seed`, `typecheck`, `extract-posters`; `test:unit` now works; `@medusajs/eslint-plugin`, `eslint`, `jiti` moved here from Méridien's root so `medusa lint` runs; `packageManager: npm@…` dropped (the workspace is pnpm) |
| `medusa-config.ts` | adapted | Registers Medusa's Stripe provider only when `STRIPE_API_KEY` is set |
| `.env.template` | rewritten | Empty values only; `STORE_CORS` includes `http://localhost:3000`; Prodigi and Stripe documented |
| `jest.config.js` | fixed | `loadEnv` from `@medusajs/framework/utils`; no setup file |
| `tsconfig.json`, `instrumentation.ts`, `eslint.config.ts`, `.gitignore`, `src/admin/{lib,i18n,tsconfig.json,…}`, the `README.md`s under `src/` | unchanged | |
| `README.md` | rewritten | Short ShaderPaper map of the app |
| `src/poster/catalog.ts` | rewritten | See §3. Kept: the 3:4 sizes and print px, the four frames, `POSTER_PRICES` for those sizes, `PosterVariantMetadata`, `posterVariantPrices`. Dropped: star/square sizes, digital file, Duo, L'Ensemble, Trio, photo option, gift card, set discount |
| `src/poster/print-files.ts` | adapted | `design.kind === "shader"` only, one print per line (no set parts); size from the variant's metadata, else from the SKU; unknown poster ids skipped; always portrait |
| `src/poster/print-renderer.ts` | adapted | No `part`; request body factored out (`renderRequestBody`) and fetch injectable for tests |
| `src/subscribers/poster-order-placed.ts` | adapted | Comments; still renders on `order.placed`, never calls Prodigi |
| `src/workflows/render-poster-print-files.ts`, `steps/*` | adapted | No set parts; also queries `items.variant_sku` |
| `src/api/admin/orders/[id]/poster-print-files/*` | adapted | No parts; `GET` also returns the order's `prodigi` / `prodigi_error` metadata |
| `src/admin/widgets/poster-print-files.tsx` | adapted | No parts; a Prodigi row: status, why sending is blocked, "Send to Prodigi" |
| `src/api/middlewares.ts` | adapted | Registers the Prodigi route's body validation |
| `src/migration-scripts/initial-data-seed.ts` | rewritten | Same store setup, idempotent, no demo apparel, plus collections and posters (§4) |
| `src/migration-scripts/{map,star,duo,ensemble,trio}-poster-products.ts` | dropped | Replaced by the seed |
| `src/api/store/poster-photos/*` | dropped | Trio photo upload; ShaderPaper has no photos |
| `src/api/{admin,store}/custom/route.ts` | dropped | Medusa starter placeholders |
| — | new `src/poster/posters.json` | Generated poster list |
| — | new `scripts/extract-posters.mjs` | Generates it |
| — | new `src/poster/prodigi.ts`, `src/poster/prodigi-submit.ts` | Prodigi client and submission (§6) |
| — | new `src/api/admin/orders/[id]/prodigi/*`, `src/api/admin/prodigi/status/route.ts` | Prodigi admin routes |
| — | new `src/poster/__tests__/*.unit.spec.ts` | 47 unit tests |
| — | new `tsconfig.typecheck.json` | Type-checks the server code without `src/admin` (which has its own ESM config) |

`apps/print-renderer` (package `@shaderpaper/print-renderer`): only what was needed to open the storefront's `/render?d=<design JSON, base64url>` page instead of `/fr/poster/render?d=<lz-string>`: `config.ts` (default `RENDER_PATH=/render`), `render.ts` (`encodeDesign`), `job.ts` (`encodeDesign` / `decodeDesign`), `cli.ts` (decodes the new links, reads `size` from them), `.env.example`, `lz-string` dependency removed, tests use a shader design and cover the encoding and the render URL. The server, queue, geometry and validation are Méridien's. **The render page contract the storefront must implement is in [apps/print-renderer/README.md](../../apps/print-renderer/README.md).**

## 3. Catalogue and data model

Generated, not hand-written: `node apps/backend/scripts/extract-posters.mjs --gallery <gallery dir>` loads `explorations/index.html?norender` in headless Chromium (Playwright, SwiftShader), reads every Posters-tab system (`cat: 'K'` in `SYSTEMS`, 54 of them) with its four `KNOBDEF` entries, merges the gallery's `data.json` (the product list: id, name, blurb), `cats.json` (category) and `picks.json` (recommended colour strength), and writes `src/poster/posters.json`. It refuses (writing nothing) when a gallery poster is missing from the Posters tab, has other than four knobs, or lacks a category or pick; `--check` verifies the committed file is current. The gallery files live outside the repo (the session scratchpad's `gallery/`), so regenerating needs them.

| Where | Shape |
| --- | --- |
| Product | `handle` = poster id (with `_` → `-`, see below), `title` = name, `description` = blurb, `status: published`, `thumbnail: /posters/<id>.webp` (relative: the storefront serves it), collection = its category, options `Size` and `Frame` |
| `product.metadata` | `{ builder: "shader", shader: { id, strength }, knobs: [4 × {n, lo, hi, d} or {n, opts, steps, d}], category }` |
| Variants | 12 per poster (30 × 40, 45 × 60, 60 × 80 cm × none, black, white, oak), SKU `SP-<ID>-<SIZE>-<FRAME>` uppercased (`SP-GLASS-45X60-BLACK`), `manage_inventory: false` |
| `variant.metadata` | Méridien's `{ poster_size, poster_frame, width_mm, height_mm }` |
| Line item `metadata.poster` | Written by the storefront: `{ version: 1, design: { kind: "shader", id, seed, knobs, palette, strength }, title, thumbnail? }`; the backend adds `print_file` or `print_error` |
| Order `metadata.prodigi` | Written when an admin sends the order: `{ env, order_id, outcome, stage, shipping_method, submitted_at, items: [{ item_id, sku, copies }] }`; `metadata.prodigi_error` when Prodigi refused it |
| Collections | `geometric` Geometric (8), `pattern` Pattern & tiling (7), `lines` Lines & op-art (13), `organic` Organic & fluid (8), `light` Light & gradient (7), `material` 3D & material (11) |

**Handles.** Medusa 2.17 refuses `_` in handles, so the five ids `k_cpack`, `k_bands`, `k_marble`, `k_fidenza`, `k_stepped` have handles `k-cpack`, `k-bands`, `k-marble`, `k-fidenza`, `k-stepped`. `metadata.shader.id` keeps the catalogue id; the storefront must route by handle and draw by `metadata.shader.id`.

## 4. Seed

`src/migration-scripts/initial-data-seed.ts` runs once with `medusa db:migrate` (Medusa records migration scripts by name) and again whenever `pnpm seed` (`medusa exec`) runs it. Each piece is looked up first and only created when missing; a second run created nothing (checked). It creates what Méridien's seed creates, with the same values: sales channel, publishable key (linked), store with EUR (default) and USD, region **Europe** in EUR for gb, de, dk, se, fr, es, it with `pp_system_default`, tax regions for those countries (`tp_system`, no rates), stock location "European Warehouse" (Copenhagen) linked to `manual_manual`, a shipping fulfilment set with one service zone, and the options **Standard Shipping** and **Express Shipping** at 10 EUR / 10 USD each. It does not create Méridien's demo apparel, categories or inventory levels. Then the six collections and the 54 products. One deviation: the shipping option descriptions say "Delivery time to be confirmed." instead of the starter's "Ship in 2-3 days." / "Ship in 24 hours.", which would read as a delivery promise.

## 5. Placeholders and business input

None of these is a ShaderPaper decision; each is marked in the code.

| What | Now | Where |
| --- | --- | --- |
| Prices | Méridien's for its own posters (EUR 39 / 59 / 79 print, 119 / 149 / 179 black or white frame, 129 / 159 / 189 oak; USD 49 / 69 / 79, 139 / 169 / 209, 149 / 179 / 219), set at about 2× Prodigi sandbox quotes of 2026-09-24 | `POSTER_PRICES` in `catalog.ts` |
| Shipping amounts | The starter's flat 10 EUR / 10 USD for both Standard and Express | seed |
| Delivery times | None promised | seed (option descriptions) |
| Markets | One EUR region with GB in it; store currencies EUR, USD; no USD region, so USD prices are stored but no country buys in USD | seed |
| Taxes | Tax regions with no rates (0 %). Méridien's EUR prices are meant to include VAT, but nothing marks them tax-inclusive: adding rates later would add VAT on top unless tax-inclusive pricing is turned on for the region or currency | seed |
| Prodigi SKUs | All 12 `null` (which paper, which frame range) | `PRODIGI_SKUS` in `catalog.ts` |
| Prodigi item attributes | Empty (framed SKUs usually need a `color`; valid values come from `GET products/{sku}`) | `PRODIGI_ITEM_ATTRIBUTES` in `catalog.ts` |
| Print format | Sizes are 3:4 (Méridien's); since 2026-10-10 the engine composes the posters at 3:4 too (`SHEET_AR`), so the art fills the print | `POSTER_SIZES` |
| Stripe | No keys; the manual provider takes no payment, so the storefront must say "Test mode" | `.env` |
| Store name, stock location | "Default Store" (or Medusa's "Medusa Store" when the app started before the seed), "European Warehouse" (starter's) | seed, admin |

## 6. Prodigi client

`src/poster/prodigi.ts` (server only) implements the parts of Prodigi Print API v4 the backend needs, from Prodigi's reference, without having called it:

- Base URLs `https://api.sandbox.prodigi.com/v4.0/` (default) and `https://api.prodigi.com/v4.0/`; header `X-API-Key`.
- `createOrder` (`POST orders`), `quote` (`POST quotes`), `getProduct` (`GET products/{sku}`).
- **Gating** (`prodigiSettings`): off when `PRODIGI_API_KEY` is empty; `PRODIGI_ENV` is `sandbox` (default) or `live`; `live` is refused unless `NODE_ENV=production`; anything else is refused.
- **Errors** (`ProdigiError.kind`): `precondition` (ours: off, SKU or print file missing, local file URL, bad address, already sent; HTTP 409), `validation` (400 or an outcome like ValidationFailed; 422), `not_found` (404), `rate_limited` (429 → 503), `auth` (401/403 → 502), `server` (5xx → 502), `network`, `unexpected` (502). Outcomes are normalised to camelCase (`Created` → `created`); `created`, `onHold`, `createdWithIssues` and `alreadyExists` count as accepted.
- **Order body**: `merchantReference: SP-<display id>`, `idempotencyKey: medusa-<order id>` (a retried submission can't create a second print order), shipping method from Medusa's option name (Express → `Express`, else `Standard`) unless the admin passes one, recipient from the shipping address, one item per poster line (`copies` = quantity, `sizing: fillPrintArea`, asset `{ printArea: "default", url }` = the print file's URL).

Routes (admin authentication required, as for every `/admin` route):

- `GET /admin/prodigi/status` → `{ configured, env, skusMissing: ["30x40/none", …], reason? }`. Reads env and catalogue only.
- `POST /admin/orders/:id/prodigi` (body `{ shipping_method? }`) → `{ prodigi: {...} }`, recorded in `order.metadata.prodigi`. 409 with a message while Prodigi is off, a SKU is null, a print file is missing, the file URL is local, the address is incomplete, or the order was already sent.

Nothing calls Prodigi automatically: not `order.placed`, not a job. There is no Prodigi webhook (`callbackUrl`) endpoint, so shipment status does not flow back yet.

**Before the first real submission:** choose the SKUs (and attributes), set a sandbox key, store print files with a public file provider (S3 or similar: the local file provider's URLs are `localhost`, which Prodigi can't download, and the route refuses them), then send one sandbox order and compare Prodigi's answer with the types in `prodigi.ts`. Unverified assumptions to check then: the exact outcome strings and error body shape (`failures`), and whether framed SKUs need attributes.

## 7. How to run it

Requirements: Node ≥ 20 (22 here), pnpm 9 (the global pnpm 10.33 switched itself to 9.15.4 from `packageManager`; nothing else needed), Postgres.

```bash
pnpm install                                   # repository root
cp apps/backend/.env.template apps/backend/.env   # DATABASE_URL, JWT_SECRET, COOKIE_SECRET at least
cd apps/backend
npx medusa db:migrate                          # migrations + seed (once)
npx medusa user -e <email> -p <password>       # admin, dev only
pnpm dev                                       # http://localhost:9000, admin at /app
```

Get the publishable key from the seed's last log line or the admin (Settings → Publishable API keys).

| Variable | Needed | |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres URL |
| `JWT_SECRET`, `COOKIE_SECRET` | yes | Random strings |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | yes | Storefront origin `http://localhost:3000` in `STORE_CORS` (and `AUTH_CORS` for customer login) |
| `REDIS_URL` | no | Without it, in-memory event bus, cache and locking |
| `PRINT_RENDERER_URL`, `PRINT_RENDERER_TOKEN` | for print files | Without them, poster lines of a placed order get `print_error` |
| `PRODIGI_API_KEY`, `PRODIGI_ENV` | for Prodigi | Empty key = off; `sandbox` by default |
| `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | no | Registers Stripe; the region then needs `pp_stripe_stripe` |

Tests: `pnpm --filter @shaderpaper/backend test:unit`, `pnpm --filter @shaderpaper/backend typecheck` (stricter once `medusa develop` has generated `.medusa/types`, which types Query results), `pnpm --filter @shaderpaper/backend lint`, `pnpm --filter @shaderpaper/print-renderer test`, `pnpm --filter @shaderpaper/print-renderer typecheck`. The pre-commit hook runs the backend unit tests and the print renderer's tests and typecheck.

## 8. Verified on 2026-10-10 (local)

- `medusa db:migrate` then the seed: 1 store, 1 sales channel, 1 publishable key, 1 region, 7 tax regions, 1 stock location, 1 fulfilment set, 2 shipping options, 6 collections, 54 products, 648 variants, 0 inventory items. `pnpm seed` again: "0 collection(s) and 0 poster product(s) created (54 already there)", same counts.
- On two throwaway databases (dropped after): `db:migrate` alone (the seed runs as a migration script before the app ever starts), and `db:migrate --skip-scripts` then `medusa exec` of the seed (Medusa's own default store, channel and key exist first; the seed reuses them and adds USD). Both ended with the counts above.
- `GET /store/products?limit=100&region_id=…`: 54 products, 12 variants each, 648/648 with a calculated EUR price (e.g. `glass` 30 × 40 unframed 39 EUR, 45 × 60 black 149 EUR, 60 × 80 oak 189 EUR).
- `GET /store/collections`: the 6 collections.
- A cart in region Europe with `SP-GLASS-45X60-BLACK` and `metadata.poster` (shader design): line at 149 EUR, metadata kept as sent; `GET /store/shipping-options?cart_id=…`: Standard 10 EUR, Express 10 EUR. No order was completed.
- Admin: `GET /admin/prodigi/status` → `configured: false`, `env: sandbox`, 12 SKUs missing; `POST /admin/orders/:id/prodigi` → 409 "Prodigi is off: PRODIGI_API_KEY is empty"; a bad `shipping_method` → 400; without a token → 401. The admin UI loads and logs in with no console errors (the order widget itself was not seen: there is no order).
- With a dummy `STRIPE_API_KEY`, Medusa registered the Stripe providers (`pp_stripe_stripe`, …); the region still offers only `pp_system_default`.

Not verified: the print-file workflow on a real order, the print renderer against a real `/render` page (it doesn't exist yet), anything against Prodigi's servers.
