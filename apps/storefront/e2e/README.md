# Storefront end-to-end checks

Browser checks against a running storefront and backend. They are not part of `pnpm test`
(the unit tests) and they need a Chromium that `playwright-core` can launch: set
`CHROMIUM_PATH` if it cannot find one. Every script takes `BASE` (default
`http://localhost:3000`) and exits 1 on any failure.

| Script | What it checks |
|---|---|
| `crawl.mjs <shots> <out.json> [route regexp]` | Every route at 1440 and 390: status, hydration, console and page errors, broken images, horizontal scroll, axe (serious and critical), a full-page screenshot; then every internal link found on those pages. Set `ORDER_ID` to include a real order's confirmation page. |
| `flow-desktop.mjs <shots> <log.json> [place]` | Product page customiser (engine paint, knob repaint, URL round trip, new variation, size and frame prices), drawer, cart line metadata, quantity and removal, checkout validation, delivery options, test-mode banners. With `place`, places one test order and checks the confirmation and the order's line metadata. |
| `flow-mobile.mjs <shots>` | The same flow at 390 without placing an order: customiser tabs, palette tap, fixed add bar, drawer, cart, checkout errors, horizontal scroll. |
| `account.mjs <shots> [order id]` | Registers a new customer, visits the signed-in pages at both widths (with axe), adds an address through the dialog, signs out; with an order id, checks another customer's order is a 404. |

`place` and `account.mjs` write to the backend (an order, a customer): run them only against a
development backend whose only payment provider is the manual (test) one.
