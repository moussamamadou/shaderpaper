// End-to-end: PDP customiser -> cart drawer -> cart -> checkout -> (with
// `place`) ONE test order through the manual provider -> confirmation.
// Desktop 1440. Each step logs PASS/FAIL with what it saw; screenshots go to
// SHOTS/e2e-*.png. Exits 1 on any failure.
//
//   BASE=http://localhost:3000 node e2e/flow-desktop.mjs <shots dir> <log.json> [place]
//
// `place` creates a real order in the backend it runs against: only use it
// against a development backend whose only payment provider is the manual one.
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright-core'

const BASE = process.env.BASE || 'http://localhost:3000'
const SHOTS = process.argv[2]
const OUT = process.argv[3]
const PLACE = process.argv[4] === 'place'
mkdirSync(SHOTS, { recursive: true })

const log = []
const step = (name, ok, detail = '') => {
  log.push({ name, ok, detail })
  if (!ok) process.exitCode = 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`)
}
const shot = (page, n) => page.screenshot({ path: `${SHOTS}/e2e-${n}.png`, fullPage: false })

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`))
await page.addInitScript(() => {
  window.__sp = []
  window.addEventListener('message', (e) => {
    if (e.data && typeof e.data === 'object' && String(e.data.type || '').startsWith('sp:')) window.__sp.push({ type: e.data.type, seq: e.data.seq, pal: e.data.pal })
  })
})
const hydrated = () => page.waitForFunction(() => !!document.documentElement.hasAttribute('data-hydrated'), null, { timeout: 60000 })
const renders = () => page.evaluate(() => window.__sp.filter((m) => m.type === 'sp:rendered').length)
const canvasHash = () =>
  page.evaluate(() => {
    const f = document.querySelector('[data-testid="engine-frame"]')
    const cv = f?.contentDocument?.getElementById('spembed')
    if (!cv) return null
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 80
    c.getContext('2d').drawImage(cv, 0, 0, 64, 80)
    const d = c.getContext('2d').getImageData(0, 0, 64, 80).data
    let h = 0
    for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0
    return h
  })
// /api/cart answers 204 with no body when the visitor has no cart (e.g. after an order).
const cart = () => page.evaluate(() => fetch('/api/cart').then((r) => (r.status === 204 ? {} : r.json())))

try {
  // 1. PDP renders through the engine iframe.
  await page.goto(`${BASE}/fr/posters/glass`, { waitUntil: 'load' })
  await hydrated()
  await page.waitForFunction(() => window.__sp.some((m) => m.type === 'sp:rendered'), null, { timeout: 90000 })
  const h0 = await canvasHash()
  step('PDP: engine iframe paints the design', true, { renders: await renders(), src: await page.getAttribute('[data-testid="engine-frame"]', 'src') })
  await shot(page, '01-pdp')

  // 2. A knob re-renders the iframe and lands in the URL.
  const n0 = await renders()
  const knob = page.locator('input[type="range"]').first()
  const knobLabel = await knob.getAttribute('aria-label').catch(() => null)
  await knob.focus()
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight')
  await page.waitForFunction((n) => window.__sp.filter((m) => m.type === 'sp:rendered').length > n, n0, { timeout: 60000 })
  await page.waitForTimeout(700)
  const h1 = await canvasHash()
  const url1 = page.url()
  step('PDP: knob change re-renders the iframe', h1 !== h0, { knob: knobLabel, rendersBefore: n0, rendersAfter: await renders(), canvasChanged: h1 !== h0 })
  step('PDP: design round-trips in the URL query', /[?&]k=/.test(url1), url1.replace(BASE, ''))
  await shot(page, '02-pdp-knob')

  // Reload with that URL: the knob value must come back.
  const knobVal = await knob.inputValue()
  await page.goto(url1, { waitUntil: 'load' })
  await hydrated()
  const knobVal2 = await page.locator('input[type="range"]').first().inputValue()
  step('PDP: reload restores the design from the query', knobVal === knobVal2, { before: knobVal, after: knobVal2 })
  await page.waitForFunction(() => window.__sp.some((m) => m.type === 'sp:rendered'), null, { timeout: 90000 })

  // 3. New variation changes the seed and re-renders.
  const v0 = await page.textContent('[data-testid="variation-number"]')
  const n1 = await renders()
  await page.click('[data-testid="new-variation"]')
  await page.waitForFunction((n) => window.__sp.filter((m) => m.type === 'sp:rendered').length > n, n1, { timeout: 60000 })
  const v1 = await page.textContent('[data-testid="variation-number"]')
  step('PDP: new variation re-renders with another seed', v0 !== v1, { before: v0?.trim(), after: v1?.trim() })
  // Set a knob again on the new variation, so the ordered design carries one.
  const n2 = await renders()
  await page.locator('input[type="range"]').first().focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
  await page.waitForFunction((n) => window.__sp.filter((m) => m.type === 'sp:rendered').length > n, n2, { timeout: 60000 })

  // 4. Size and frame change the price.
  const p0 = (await page.textContent('[data-testid="product-price"]'))?.trim()
  const sizes = page.locator('[data-testid="size-options"] label')
  const frames = page.locator('[data-testid="frame-options"] label')
  const ns = await sizes.count()
  const nf = await frames.count()
  if (ns > 1) await sizes.nth(1).click()
  await page.waitForTimeout(300)
  const pSize = (await page.textContent('[data-testid="product-price"]'))?.trim()
  const frameNames = (await frames.allInnerTexts()).map((x) => x.replace(/\s+/g, ' '))
  if (nf > 1) await frames.nth(1).click()
  await page.waitForTimeout(500)
  const frameChecked = await page.locator('[data-testid="frame-options"] input:checked').evaluate((i) => i.value)
  const p1 = (await page.textContent('[data-testid="product-price"]'))?.trim()
  step('PDP: size and frame options change the price', p0 !== pSize && pSize !== p1, { sizes: ns, frames: frameNames, before: p0, afterSize: pSize, afterFrame: p1, frameChecked, url: page.url().replace(BASE, '') })
  await shot(page, '03-pdp-options')

  // 5. Add to cart opens the drawer with the design summary.
  await page.click('[data-testid="add-to-cart"]')
  await page.waitForSelector('[data-testid="drawer-added"]', { timeout: 30000 })
  const summary = await page.locator('[data-testid="drawer-lines"] [data-testid="design-summary"]').first().innerText().catch(() => '')
  const addedText = await page.locator('[data-testid="drawer-added"]').innerText()
  step('Drawer: opens with the added line and its design summary', !!summary && addedText.includes(frameChecked), { added: addedText.replace(/\s+/g, ' '), summary: summary.replace(/\s+/g, ' ') })
  await page.waitForTimeout(500)
  await shot(page, '04-drawer')
  const c1 = await cart()
  const line = (c1.cart ?? c1).items?.[0]
  const poster = line?.metadata?.poster
  const okMeta = poster?.version === 1 && poster?.design?.kind === 'shader' && poster?.design?.id === 'glass' && typeof poster?.design?.seed === 'number' && Array.isArray(poster?.design?.knobs) && 'palette' in poster.design && ['n', 'b', 'v'].includes(poster?.design?.strength) && typeof poster?.title === 'string'
  step('Cart line: metadata.poster = { version: 1, design: {kind, id, seed, knobs, palette, strength}, title }', okMeta, { ...poster, thumbnail: poster?.thumbnail ? `${String(poster.thumbnail).slice(0, 30)}… (${String(poster.thumbnail).length} chars)` : undefined })
  await page.keyboard.press('Escape')

  // A second poster, to remove in the cart.
  await page.goto(`${BASE}/fr/posters/julia`, { waitUntil: 'load' })
  await hydrated()
  await page.waitForFunction(() => window.__sp.some((m) => m.type === 'sp:rendered'), null, { timeout: 90000 })
  await page.click('[data-testid="add-to-cart"]')
  await page.waitForSelector('[data-testid="drawer-added"]', { timeout: 30000 })
  await page.keyboard.press('Escape')

  // 6. Cart: quantity and removal.
  await page.goto(`${BASE}/fr/cart`, { waitUntil: 'load' })
  await hydrated()
  await page.waitForSelector('[data-testid="cart-line"]')
  const lines0 = await page.locator('[data-testid="cart-line"]').count()
  const sub0 = (await page.textContent('[data-testid="cart-subtotal"]'))?.trim()
  const glassLine = page.locator('[data-testid="cart-line"]', { hasText: /glass/i }).first()
  await glassLine.getByRole('button', { name: /increase|more|\+/i }).first().click()
  await page.waitForFunction((s) => document.querySelector('[data-testid="cart-subtotal"]')?.textContent?.trim() !== s, sub0, { timeout: 20000 })
  const sub1 = (await page.textContent('[data-testid="cart-subtotal"]'))?.trim()
  step('Cart: quantity + updates the subtotal', sub0 !== sub1, { before: sub0, after: sub1 })
  const juliaLine = page.locator('[data-testid="cart-line"]', { hasText: /julia/i }).first()
  await juliaLine.locator('[data-testid="remove-line"]').click()
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="cart-line"]').length < n, lines0, { timeout: 20000 })
  const lines1 = await page.locator('[data-testid="cart-line"]').count()
  step('Cart: removing a line', lines1 === lines0 - 1, { before: lines0, after: lines1 })
  await shot(page, '05-cart')

  // 7. Checkout: test-mode banner, empty submit, delivery, payment.
  await page.click('[data-testid="checkout-button"]')
  await page.waitForURL(/\/checkout/)
  await hydrated()
  const banner = await page.locator('[data-testid="test-mode-banner"]').innerText().catch(() => '')
  step('Checkout: test-mode banner (only the manual provider exists)', /test mode/i.test(banner), banner.replace(/\s+/g, ' '))
  await page.click('[data-testid="submit-address"]')
  await page.waitForSelector('[data-testid="address-errors"]', { timeout: 10000 })
  const errs = await page.locator('[data-testid="address-errors"] li').allInnerTexts()
  const focused = await page.evaluate(() => document.activeElement?.closest('[data-testid="address-errors"]') ? 'error summary' : document.activeElement?.tagName)
  const invalid = await page.locator('[aria-invalid="true"]').count()
  step('Checkout: empty submit lists the errors and focuses the summary', errs.length >= 5 && focused === 'error summary', { errors: errs, invalidFields: invalid, focus: focused })
  await shot(page, '06-checkout-errors')

  await page.fill('[name="email"]', 'e2e.test@example.com')
  await page.fill('[name="shipping.first_name"]', 'Test')
  await page.fill('[name="shipping.last_name"]', 'Order')
  await page.fill('[name="shipping.address_1"]', '1 Rue de Test')
  await page.fill('[name="shipping.postal_code"]', '75001')
  await page.fill('[name="shipping.city"]', 'Paris')
  await page.selectOption('[name="shipping.country_code"]', 'fr')
  await page.click('[data-testid="submit-address"]')
  await page.waitForSelector('[data-testid="delivery-option"]', { timeout: 30000 })
  const options = await page.locator('[data-testid="delivery-option"]').allInnerTexts()
  step('Checkout: delivery options listed', options.length > 0, options.map((o) => o.replace(/\s+/g, ' ')))
  await shot(page, '07-checkout-delivery')
  await page.locator('[data-testid="delivery-option"]').first().click()
  await page.waitForTimeout(800)
  await page.click('[data-testid="submit-delivery"]')
  await page.waitForSelector('[data-testid="payment-option"]', { timeout: 30000 })
  const payBanner = await page.locator('[data-testid="test-mode-banner-payment"]').innerText().catch(() => '')
  const payOptions = await page.locator('[data-testid="payment-option"]').allInnerTexts()
  step('Checkout: payment step shows the test-mode banner', /test/i.test(payBanner), { banner: payBanner.replace(/\s+/g, ' '), options: payOptions.map((o) => o.replace(/\s+/g, ' ')) })
  await shot(page, '08-checkout-payment')
  await page.click('[data-testid="submit-payment"]')
  await page.waitForSelector('[data-testid="place-order"]', { timeout: 30000 })
  const placeLabel = (await page.textContent('[data-testid="place-order"]'))?.trim()
  const reviewBanner = await page.locator('[data-testid="test-mode-banner-review"]').innerText().catch(() => '')
  step('Checkout: review offers a test order, not a payment', /test/i.test(placeLabel ?? '') && /test/i.test(reviewBanner), { button: placeLabel, banner: reviewBanner.replace(/\s+/g, ' ') })
  await shot(page, '09-checkout-review')

  // 8. ONE test order (the manual provider is the only one).
  if (PLACE) {
    await page.click('[data-testid="place-order"]')
    await page.waitForURL(/\/order\/[^/]+\/confirmed/, { timeout: 90000 })
    await hydrated()
    const orderUrl = page.url().replace(BASE, '')
    const ob = await page.locator('[data-testid="test-order-banner"]').innerText().catch(() => '')
    const pay = await page.locator('[data-testid="order-payment"]').innerText().catch(() => '')
    const h1 = await page.locator('h1').first().innerText()
    step('Confirmation: says no payment was taken', /no payment was taken/i.test(ob) && /no payment/i.test(pay), { url: orderUrl, h1, banner: ob.replace(/\s+/g, ' '), payment: pay.replace(/\s+/g, ' ') })
    const id = orderUrl.split('/')[3]
    const o = await page.evaluate((oid) => fetch(`/api/orders/${oid}`).then((r) => r.json()), id)
    const ord = o.order ?? o
    step('Order: line carries metadata.poster', !!ord?.items?.[0]?.metadata?.poster?.design, { id: ord?.id, display_id: ord?.display_id, items: ord?.items?.map((i) => ({ title: i.title, qty: i.quantity, design: i.metadata?.poster?.design })) })
    await page.screenshot({ path: `${SHOTS}/e2e-10-confirmation.png`, fullPage: true })
    const after = await cart()
    step('Cart is cleared after the order', !(after.cart ?? after)?.items?.length, '')
  }
} catch (e) {
  step('crash', false, String(e).slice(0, 600))
  await shot(page, 'crash').catch(() => {})
}
step('No console errors during the flow', errors.length === 0, errors.slice(0, 8))
await browser.close()
writeFileSync(OUT, JSON.stringify(log, null, 2))
