#!/usr/bin/env node
/**
 * Product thumbnails for the 54 posters, rendered by the shader engine itself.
 *
 * Loads explorations/index.html (?norender, the sheet at its default 3:4) in
 * headless Chromium and paints variation 1 and variation 2 of every poster with
 * every knob and the palette left to the seed, at the colour strength listed in
 * public/posters/levels.json, exactly as the product page's live preview does
 * (embed mode: KNOB unset, PAL unset, setPosterVivid(level), paintGated(sys,
 * cv, czSeed(sys, n))). Writes public/posters/<id>.webp and <id>-2.webp at
 * 600 × 800, WebP quality 80, rendered at twice that size and scaled down.
 *
 *   node scripts/render-poster-images.mjs [id …]
 *
 * Needs a Chromium for playwright-core: set CHROMIUM_PATH, or have Playwright's
 * browsers installed (PLAYWRIGHT_BROWSERS_PATH).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

const here = dirname(fileURLToPath(import.meta.url))
const engine = resolve(here, '../../../explorations/index.html')
const outDir = resolve(here, '../public/posters')
const W = 600
const H = 800
const QUALITY = 0.8

const levels = JSON.parse(readFileSync(resolve(outDir, 'levels.json'), 'utf8'))
const only = process.argv.slice(2)
const ids = only.length ? only : Object.keys(levels)

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(`${pathToFileURL(engine).href}?norender`, { timeout: 300000 })

let written = 0
for (const id of ids) {
  const lvl = { n: 0, b: 0.5, v: 1 }[levels[id] ?? 'b']
  const urls = await page.evaluate(
    ({ id, lvl, W, H, QUALITY }) => {
      if (SHEET_AR !== '3:4') throw new Error(`sheet is ${SHEET_AR}, expected 3:4`)
      const sys = SYSTEMS.find((s) => s.id === id)
      if (!sys) throw new Error(`no poster ${id}`)
      const out = []
      for (const n of [1, 2]) {
        const cv = document.createElement('canvas')
        cv.style.cssText = `position:absolute;left:-99999px;width:${W}px;height:${H}px`
        document.body.appendChild(cv)
        KNOB = [null, null, null, null]
        PAL = null
        setPosterVivid(lvl)
        paintGated(sys, cv, czSeed(sys, n))
        const small = document.createElement('canvas')
        small.width = W
        small.height = H
        const c = small.getContext('2d')
        c.imageSmoothingQuality = 'high'
        c.drawImage(cv, 0, 0, W, H)
        out.push(small.toDataURL('image/webp', QUALITY))
        cv.remove()
      }
      return out
    },
    { id, lvl, W, H, QUALITY },
  )
  urls.forEach((url, i) => {
    if (!url.startsWith('data:image/webp')) throw new Error(`${id}: the browser did not encode WebP`)
    writeFileSync(resolve(outDir, `${id}${i ? '-2' : ''}.webp`), Buffer.from(url.split(',')[1], 'base64'))
    written++
  })
}
await browser.close()
console.log(`wrote ${written} images for ${ids.length} posters to ${outDir}`)
if (errors.length) {
  console.error(`console errors:\n  ${errors.join('\n  ')}`)
  process.exit(1)
}
