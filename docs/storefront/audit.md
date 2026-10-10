# Phase 1 audit: Lifter, MapAndSky, Méridien Figma (2026-10-10)

What was inspected, with the evidence, before anything was built.

## Access

| Resource | Access | How it was checked |
|---|---|---|
| `moussamamadou/shaderpaper` | read/write | this repo |
| `moussamamadou/mapandsky` | read (attached to the session, cloned at `cdb03d5`) | `list_repos`, `add_repo`, `git clone --depth 1` |
| A "Lifter" code repository | **none exists** among the repositories this account can reach | `list_repos` (complete list, `has_more: false`) has no repo whose name contains "lifter" |
| Figma file `WJaAvH0aRGvb46Z87FKV1A` ("Lifter — style probes, one app per row") | read/write as Figma user "Bayero" | `whoami`, `get_metadata`, `use_figma` |
| Figma file `gMvo7pPlFJev1yPdDGbWL3` (Méridien) | read | `get_metadata`, `get_screenshot` |
| Mobbin | available | `search_screens`, `search_flows` |
| prodigi.com, api.sandbox.prodigi.com | **blocked** from this machine (proxy 403) | `curl`; Prodigi docs were read through the web fetch tool instead |
| figma.com image upload host | **blocked** (proxy 403) | `curl`; images reach Figma inline through the plugin API instead |

## Lifter

Lifter exists only as a Figma file: one page, "Style probes — one app per row", holding ten rows of a workout-tracking app restyled after ten Mobbin apps (Flighty, Duolingo, Cash App, Oura, Stoic, Opal, (Not Boring) Weather, GOAT, Vestiaire Collective, Tolan). Each row has a source card and ten 360 × 780 phone screens (Today, Active log, Rest timer, Workout summary, PR moment, Weekly recap, History, Analytics, Routine builder, Upgrade), plus a caption under each screen. There is no code, catalogue, brand guide or commerce function to carry into a store.

Archive: see [lifter-archive.md](lifter-archive.md).

## MapAndSky (Méridien)

A pnpm 9 + Turborepo monorepo (`meridien-commerce`):

- `apps/backend`: Medusa 2.17.2 on Postgres. The poster products, prices and print pipeline sit in `src/poster/` (`catalog.ts`, `print-files.ts`, `print-renderer.ts`), with an `order.placed` subscriber, a render workflow, an admin route and widget for print files, and seed scripts per product.
- `apps/storefront`: Nuxt 4.5. The browser only calls Nitro routes (`server/api/**`, 47 routes) that call Medusa through `@medusajs/js-sdk` on the server. JWT and cart ids sit in httpOnly cookies, routing is `/{countryCode}/…` with a region middleware, and there are typed composables (`useCart`, `useCustomer`, …). It uses Tailwind 3.4 with the Medusa UI preset, `@headlessui/vue`, `reka-ui` and `@nuxtjs/i18n` (no_prefix, locale from country), plus Stripe through `@stripe/stripe-js` when keys are set. `CONTRACTS.md` documents every route and cookie.
- `apps/print-renderer`: a headless-Chrome service. After an order, Medusa posts the design and it screenshots the storefront's render page at print resolution.
- `apps/storefront-nextjs`: Medusa's Next starter, kept for reference only.

### The Prodigi integration, exactly

There is no Prodigi API client in the repository. Searching every `.ts`, `.mjs`, `.vue` and `.md` file finds Prodigi only in:

- `apps/backend/src/poster/catalog.ts`: comments explaining that the 3:4 sizes (30 × 40, 45 × 60, 60 × 80 cm) and the square star sizes follow Prodigi's formats, and that prices are "at least twice Prodigi's cost … sandbox quotes of 2026-09-24".
- `apps/backend/.env.template`: an empty `PRODIGI_API_KEY` with the warning to use sandbox keys in development.
- `CLAUDE.md` and the design docs: the sandbox-only rule, the frame choice (no mounted frame, because Prodigi's CFPM window is 2:3), and the open items "Prodigi lab country" and "Prodigi image licence".
- The seed's fulfilment provider is Medusa's `manual_manual`. Nothing sends orders to Prodigi.

So the reusable "Prodigi setup" is the catalogue (formats, frames, Prodigi-calibrated prices) plus the print-file pipeline. ShaderPaper gets those, plus a new opt-in Prodigi client written against Prodigi's v4 documentation.

## Méridien Figma

The file has 37+ pages. v4 is the current direction (pages 24 to 37), with design rules in `design/v3/figma.md` of the repo. Useful as reference:

- the product page (page 29), with a gallery on the left and a sticky buy panel on the right showing title, rating, a short pitch, quick numbers (styles, colours, layouts, formats), a "Personnaliser mon affiche · dès 39 €" bar, a quick-facts grid and a cross-sell card;
- the home page (page 31), with a split hero pairing two posters on photographed walls, then numbered sections;
- the product card (page 34), the global chrome, and the `v2/Mockup/Prodigi` frame kit.

ShaderPaper is a separate brand (see `CLAUDE.md`), so Méridien informs the structure and none of its visuals: no serif, no French copy, no Méridien photos.
