// Crawl every storefront route at 1440 and 390: status, console errors,
// page errors, hydration warnings, broken images, horizontal scroll, axe
// (serious + critical), and a screenshot per route and width. Then requests
// every internal link found on those pages and reports the broken ones.
//
//   BASE=http://localhost:3000 [ORDER_ID=order_…] [CHROMIUM_PATH=…] \
//     node e2e/crawl.mjs <shots dir> <results.json> [route-name regexp]
//
// Exits 1 when any route or link fails.
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright-core'
import { AxeBuilder } from '@axe-core/playwright'

const BASE = process.env.BASE || 'http://localhost:3000'
const SHOTS = process.argv[2]
const OUT = process.argv[3]
const ONLY = process.argv[4] ? new RegExp(process.argv[4]) : null
mkdirSync(SHOTS, { recursive: true })

const design = { kind: 'shader', id: 'glass', seed: 7, knobs: [0.3, null, null, null], palette: null, strength: 'b' }
const d = Buffer.from(JSON.stringify(design)).toString('base64url')

const routes = [
  ['root', '/'],
  ['home', '/fr'],
  ['home-de', '/de'],
  ['unknown-country', '/us'],
  ['shop', '/fr/shop'],
  ['shop-filtered', '/fr/shop?category=geometric,light&sort=price-asc&grid=compact'],
  ['collection-geometric', '/fr/collections/geometric'],
  ['collection-pattern', '/fr/collections/pattern'],
  ['collection-lines', '/fr/collections/lines'],
  ['collection-organic', '/fr/collections/organic'],
  ['collection-light', '/fr/collections/light'],
  ['collection-material', '/fr/collections/material'],
  ['collection-unknown', '/fr/collections/nope', 404],
  ['campaign-material', '/fr/campaigns/material'],
  ['search', '/fr/search'],
  ['search-glass', '/fr/search?q=glass'],
  ['search-none', '/fr/search?q=zzzzqx'],
  ['pdp-glass', '/fr/posters/glass'],
  ['pdp-k-cpack', '/fr/posters/k-cpack'],
  ['pdp-julia-query', '/fr/posters/julia?seed=42&strength=v'],
  ['pdp-unknown', '/fr/posters/nope', 404],
  ['cart-empty', '/fr/cart'],
  ['checkout-no-cart', '/fr/checkout', 404],
  ['account-guest', '/fr/account'],
  ['account-orders-guest', '/fr/account/orders'],
  ['verify-account', '/fr/verify-account'],
  ['about', '/fr/about'],
  ['contact', '/fr/contact'],
  ['faq', '/fr/faq'],
  ['shipping', '/fr/shipping'],
  ['returns', '/fr/returns'],
  ['privacy', '/fr/privacy'],
  ['terms', '/fr/terms'],
  ['order-unknown', '/fr/order/order_nope/confirmed', 404],
  // A real order placed with the test (manual) provider, when one exists.
  ...(process.env.ORDER_ID ? [['order-confirmed', `/fr/order/${process.env.ORDER_ID}/confirmed`]] : []),
  ['not-found', '/fr/does-not-exist', 404],
  ['render', `/render?d=${d}&size=45x60&mm=450x600`],
]

const widths = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const results = []
const links = new Map() // internal href -> first page it was seen on

for (const [wname, viewport] of widths) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  for (const [name, path, expected = 200] of routes) {
    if (ONLY && !ONLY.test(name)) continue
    const page = await context.newPage()
    const consoleErrors = []
    const hydration = []
    page.on('console', (m) => {
      const t = m.text()
      if (m.type() === 'error') consoleErrors.push(t.slice(0, 300))
      else if (/hydration/i.test(t)) hydration.push(t.slice(0, 300))
    })
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`))
    const r = { width: wname, name, path }
    try {
      const resp = await page.goto(BASE + path, { waitUntil: 'load', timeout: 120000 })
      r.status = resp?.status()
      r.finalUrl = page.url().replace(BASE, '')
      r.expected = expected
      // Hydrated = Vue app mounted on #__nuxt (render page has its own check).
      await page.waitForFunction(() => !!document.documentElement.hasAttribute('data-hydrated'), null, { timeout: 60000 }).catch(() => {})
      r.hydrated = await page.evaluate(() => !!document.documentElement.hasAttribute('data-hydrated'))
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      if (name === 'render') {
        await page.waitForFunction(() => window.__POSTER_READY__ === true || window.__POSTER_ERROR__, null, { timeout: 90000 }).catch(() => {})
        r.render = await page.evaluate(() => ({ ready: window.__POSTER_READY__ ?? null, error: window.__POSTER_ERROR__ ?? null, size: window.__POSTER_SIZE__ ?? null }))
      }
      // Lazy images: scroll through the page, then back to the top.
      await page.evaluate(async () => {
        const step = window.innerHeight
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y)
          await new Promise((res) => setTimeout(res, 120))
        }
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(600)
      r.brokenImages = await page.evaluate(() =>
        [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src')),
      )
      r.unloadedImages = await page.evaluate(() => [...document.images].filter((i) => !i.complete).length)
      // /render is sized for the print renderer's viewport (short side 1000), not for phones.
      r.hScroll = name === 'render' ? false : await page.evaluate(() => {
        const el = document.documentElement
        return el.scrollWidth > el.clientWidth ? `${el.scrollWidth} > ${el.clientWidth}` : false
      })
      for (const href of await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))) {
        if (href && href.startsWith('/') && !href.startsWith('//') && !links.has(href.split('#')[0])) links.set(href.split('#')[0], path)
      }
      r.title = await page.title()
      r.h1 = await page.evaluate(() => [...document.querySelectorAll('h1')].map((h) => h.textContent?.trim().slice(0, 60)))
      if (name !== 'render') {
        // nuxt-error-overlay is Nuxt's dev-only error panel, not storefront markup.
        const axe = await new AxeBuilder({ page }).exclude('nuxt-error-overlay').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
        r.axe = axe.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')), summary: v.nodes[0]?.failureSummary?.slice(0, 240) }))
        r.axeMinor = axe.violations.filter((v) => !(v.impact === 'serious' || v.impact === 'critical')).map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`)
      }
      await page.screenshot({ path: `${SHOTS}/${wname}-${name}.png`, fullPage: name !== 'render' })
    } catch (e) {
      r.crash = String(e).slice(0, 400)
    }
    r.consoleErrors = consoleErrors
    r.hydration = hydration
    r.ok = !r.crash && r.status === r.expected && r.hydrated && !consoleErrors.filter((c) => !/status of 404/.test(c)).length && !r.brokenImages?.length && !r.hScroll && !(r.axe || []).length && !hydration.length
    results.push(r)
    console.log(
      `${r.ok ? 'OK  ' : 'FAIL'} ${wname.padEnd(7)} ${name.padEnd(22)} ${r.status}${r.expected !== 200 ? `(exp ${r.expected})` : ''} ${r.finalUrl ?? ''}` +
        `${r.hydrated ? '' : ' NOT-HYDRATED'}${r.consoleErrors.length ? ` console=${r.consoleErrors.length}` : ''}${r.hydration.length ? ` hydration=${r.hydration.length}` : ''}` +
        `${r.brokenImages?.length ? ` broken=${r.brokenImages.length}` : ''}${r.hScroll ? ` hscroll=${r.hScroll}` : ''}${r.axe?.length ? ` axe=${r.axe.map((a) => a.id).join(',')}` : ''}${r.crash ? ` crash=${r.crash}` : ''}`,
    )
    await page.close()
  }
  await context.close()
}

// Every internal link seen on the crawled pages must answer 2xx (after redirects).
const api = await browser.newContext()
const brokenLinks = []
for (const [href, from] of links) {
  const res = await api.request.get(BASE + href, { maxRedirects: 5, timeout: 60000 }).catch((e) => ({ status: () => String(e).slice(0, 80) }))
  const status = res.status()
  if (!(typeof status === 'number' && status < 400)) brokenLinks.push({ href, from, status })
}
console.log(`${brokenLinks.length ? 'FAIL' : 'OK  '} links   ${links.size} internal links checked, ${brokenLinks.length} broken${brokenLinks.length ? `: ${JSON.stringify(brokenLinks.slice(0, 10))}` : ''}`)
await browser.close()
writeFileSync(OUT, JSON.stringify({ routes: results, links: { checked: links.size, broken: brokenLinks } }, null, 2))
const failed = results.filter((r) => !r.ok).length
console.log(`${results.length - failed}/${results.length} route checks passed`)
if (failed || brokenLinks.length) process.exitCode = 1
