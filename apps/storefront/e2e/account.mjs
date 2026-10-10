// Account flow: register through the form, then visit the signed-in pages at
// 1440 and 390 (status, console errors, horizontal scroll, axe serious and
// critical), add an address through the dialog, sign out.
import { chromium } from 'playwright-core'
import { AxeBuilder } from '@axe-core/playwright'
const BASE = process.env.BASE || 'http://localhost:3000'
const SHOTS = process.argv[2]
const ORDER = process.argv[3]
const step = (name, ok, detail = '') => {
  if (!ok) process.exitCode = 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${JSON.stringify(detail)}` : ''}`)
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(`${page.url().replace(BASE, '')}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => errors.push(`pageerror ${page.url().replace(BASE, '')}: ${String(e).slice(0, 200)}`))
const hydrated = () => page.waitForFunction(() => document.documentElement.hasAttribute('data-hydrated'), null, { timeout: 60000 })
const email = `e2e.account.${Date.now()}@example.com`
try {
  await page.goto(`${BASE}/fr/account`, { waitUntil: 'load' })
  await hydrated()
  await page.getByRole('tab', { name: /create/i }).click()
  await page.click('[data-testid="register-button"]')
  const regErrors = await page.locator('[data-testid="register-form"] [aria-invalid="true"]').count()
  step('Register: empty submit marks the required fields', regErrors >= 4, { invalid: regErrors })
  await page.fill('[data-testid="register-form"] [name="first_name"]', 'Account')
  await page.fill('[data-testid="register-form"] [name="last_name"]', 'Tester')
  await page.fill('[data-testid="register-form"] [name="email"]', email)
  await page.fill('[data-testid="register-form"] [name="password"]', 'e2e-Password-123')
  await page.click('[data-testid="register-button"]')
  await page.waitForSelector('[data-testid="account-greeting"]', { timeout: 30000 })
  step('Register: signs in and shows the account', true, { email, greeting: (await page.textContent('[data-testid="account-greeting"]'))?.trim() })

  for (const [wname, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport)
    for (const [name, path, expected = 200] of [['account', '/fr/account'], ['account-orders', '/fr/account/orders'], ['account-profile', '/fr/account/profile'], ['account-addresses', '/fr/account/addresses'], ...(ORDER ? [['order-confirmed', `/fr/order/${ORDER}/confirmed`], ['account-order-detail-other', `/fr/account/orders/${ORDER}`, 404]] : [])]) {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'load' })
      await hydrated()
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      const hs = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      const axe = await new AxeBuilder({ page }).exclude('nuxt-error-overlay').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
      const bad = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)
      const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).length)
      const h1 = await page.locator('h1').first().innerText().catch(() => '')
      step(`${wname} ${name}`, resp?.status() === expected && !hs && !bad.length && !broken, { status: resp?.status(), expected, h1, hscroll: hs, axe: bad, broken })
      await page.screenshot({ path: `${SHOTS}/${wname}-${name}.png`, fullPage: true })
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/fr/account/addresses`, { waitUntil: 'load' })
  await hydrated()
  await page.click('[data-testid="add-address"]')
  await page.waitForSelector('[role="dialog"]')
  await page.locator('[role="dialog"] button[type="submit"]').click()
  const dErr = await page.locator('[role="dialog"] [aria-invalid="true"]').count()
  step('Address dialog: empty save marks the required fields', dErr >= 4, { invalid: dErr })
  await page.screenshot({ path: `${SHOTS}/desktop-account-address-dialog.png` })
  await page.fill('[role="dialog"] [name="address.first_name"]', 'Account')
  await page.fill('[role="dialog"] [name="address.last_name"]', 'Tester')
  await page.fill('[role="dialog"] [name="address.address_1"]', '2 Musterstraße')
  await page.fill('[role="dialog"] [name="address.postal_code"]', '10115')
  await page.fill('[role="dialog"] [name="address.city"]', 'Berlin')
  await page.selectOption('[role="dialog"] [name="address.country_code"]', 'de')
  await page.locator('[role="dialog"] button[type="submit"]').click()
  await page.waitForSelector('[data-testid="address-list"]', { timeout: 30000 })
  step('Address dialog: saves and lists the address', (await page.locator('[data-testid="address-list"] li').count()) === 1)
  await page.click('[data-testid="sign-out"]')
  await page.waitForSelector('[data-testid="account-auth"]', { timeout: 30000 })
  step('Sign out returns to the sign-in form', true)
} catch (e) {
  step('crash', false, String(e).slice(0, 800))
  await page.screenshot({ path: `${SHOTS}/account-crash.png` }).catch(() => {})
}
step('No console errors', !errors.filter((x) => !/status of 404/.test(x)).length, errors.slice(0, 8))
await browser.close()
