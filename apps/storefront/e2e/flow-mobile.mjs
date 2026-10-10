// Mobile (390) pass over the same flow, without placing an order: PDP tabs,
// fixed add bar, drawer, cart, checkout empty-submit errors.
import { chromium } from 'playwright-core'
const BASE = process.env.BASE || 'http://localhost:3000'
const SHOTS = process.argv[2]
const step = (name, ok, detail = '') => {
  if (!ok) process.exitCode = 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`))
await page.addInitScript(() => {
  window.__sp = []
  window.addEventListener('message', (e) => e.data?.type === 'sp:rendered' && window.__sp.push(e.data))
})
const hydrated = () => page.waitForFunction(() => !!document.documentElement.hasAttribute('data-hydrated'), null, { timeout: 60000 })
const hscroll = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
try {
  await page.goto(`${BASE}/fr/posters/k-cpack`, { waitUntil: 'load' })
  await hydrated()
  await page.waitForFunction(() => window.__sp.length > 0, null, { timeout: 90000 })
  await page.waitForTimeout(400)
  const tabs = await page.locator('[role="tab"]').allInnerTexts()
  step('PDP mobile: customiser tabs', tabs.length >= 3, tabs)
  await page.screenshot({ path: `${SHOTS}/e2e-m01-pdp.png` })
  const colourTab = page.locator('[role="tab"]').nth(1)
  await colourTab.tap()
  await page.waitForTimeout(300)
  const selected = await colourTab.getAttribute('aria-selected')
  const swatches = await page.locator('[data-testid="palette-swatches"]').isVisible()
  step('PDP mobile: second tab shows the palettes', selected === 'true' && swatches, { selected, swatches })
  const n = await page.evaluate(() => window.__sp.length)
  const sw = page.locator('[data-testid="palette-swatches"] label')
  if ((await sw.count()) > 1) {
    // The sticky preview + tabs and the fixed add bar leave a band of about
    // 290px for the controls; Playwright's own scroll alignments land under
    // them, so scroll the swatch into that band and tap its centre like a thumb.
    await sw.nth(1).evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 540))
    await page.waitForTimeout(300)
    const b = await sw.nth(1).boundingBox()
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('label')?.getAttribute('title') ?? document.elementFromPoint(x, y)?.outerHTML.slice(0, 80), [b.x + b.width / 2, b.y + b.height / 2])
    step('PDP mobile: swatch reachable in the band between preview and add bar', /Palette 2/.test(hit ?? ''), { top: Math.round(b.y), hit })
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
    await page.waitForFunction((k) => window.__sp.length > k, n, { timeout: 60000 })
  }
  step('PDP mobile: palette tap re-renders', (await page.evaluate(() => window.__sp.length)) > n, { swatches: await sw.count(), url: page.url().replace(BASE, '') })
  await page.screenshot({ path: `${SHOTS}/e2e-m02-pdp-colour.png` })
  step('PDP mobile: no horizontal scroll', !(await hscroll()))
  const bar = page.locator('[data-testid="add-to-cart-mobile"]')
  step('PDP mobile: fixed add-to-cart bar visible', await bar.isVisible())
  await bar.tap()
  await page.waitForSelector('[data-testid="drawer-added"]', { timeout: 30000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${SHOTS}/e2e-m03-drawer.png` })
  const summary = await page.locator('[data-testid="design-summary"]').first().innerText()
  step('Drawer mobile: design summary', !!summary, summary.replace(/\s+/g, ' '))
  await page.keyboard.press('Escape')
  await page.goto(`${BASE}/fr/cart`, { waitUntil: 'load' })
  await hydrated()
  await page.waitForSelector('[data-testid="cart-line"]')
  step('Cart mobile: no horizontal scroll', !(await hscroll()))
  await page.screenshot({ path: `${SHOTS}/e2e-m04-cart.png`, fullPage: true })
  await page.locator('[data-testid="checkout-button"]').tap()
  await page.waitForURL(/\/checkout/)
  await hydrated()
  await page.waitForSelector('[data-testid="checkout-stepper"] [aria-current="step"]', { timeout: 30000 })
  const label = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="checkout-stepper"] [aria-current="step"] .truncate')
    return el ? { text: el.textContent.trim(), cut: el.scrollWidth > el.clientWidth } : null
  })
  step('Checkout mobile: the current step label is not cut off', !!label && !label.cut, label)
  await page.click('[data-testid="submit-address"]')
  await page.waitForSelector('[data-testid="address-errors"]')
  step('Checkout mobile: empty submit errors', (await page.locator('[data-testid="address-errors"] li').count()) >= 5)
  step('Checkout mobile: no horizontal scroll', !(await hscroll()))
  await page.screenshot({ path: `${SHOTS}/e2e-m05-checkout-errors.png`, fullPage: true })
} catch (e) {
  step('crash', false, String(e).slice(0, 2500))
  await page.screenshot({ path: `${SHOTS}/e2e-m-crash.png` }).catch(() => {})
}
step('No console errors', !errors.length, errors.slice(0, 6))
await browser.close()
