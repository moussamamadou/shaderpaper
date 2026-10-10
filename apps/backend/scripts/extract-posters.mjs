#!/usr/bin/env node
/**
 * Generates src/poster/posters.json, the poster list the catalogue (src/poster/catalog.ts) and the seed
 * are built from, out of the shader catalogue (explorations/index.html) and the gallery's data.
 *
 *   node apps/backend/scripts/extract-posters.mjs --gallery <dir with data.json, cats.json, picks.json>
 *
 * From the catalogue, loaded in headless Chromium with `?norender` (nothing is drawn): every system of
 * the Posters tab (`cat: 'K'` in SYSTEMS) with its id, name, blurb and its four knob definitions
 * (KNOBDEF[id]: `{ n, lo, hi, d }` for a slider, `{ n, opts, steps, d }` for a choice).
 * From the gallery: data.json (the product list: id, name, blurb), blurbs.json (blurbs, optional),
 * cats.json (id → geo | pattern | lines | organic | light | material) and picks.json (id → v | b | n,
 * the recommended colour strength). The gallery's name and blurb win over the catalogue's.
 *
 * Fails, writing nothing, when a gallery poster isn't in the Posters tab, lacks four knobs, a category
 * or a pick.
 *
 * Playwright: the `playwright` package if it resolves, else PLAYWRIGHT_MODULE, else the global install
 * at /opt/node22/lib/node_modules/playwright.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')
const catalogue = join(repoRoot, 'explorations/index.html')
const out = join(here, '../src/poster/posters.json')

/** The gallery's category ids, and the collection each becomes (src/poster/catalog.ts). */
const CATEGORIES = ['geo', 'pattern', 'lines', 'organic', 'light', 'material']
const STRENGTHS = ['n', 'b', 'v']

const { values } = parseArgs({ options: { gallery: { type: 'string' }, check: { type: 'boolean' } } })
if (!values.gallery) fail('Pass --gallery <dir> (the gallery build: data.json, cats.json, picks.json, blurbs.json)')

function fail(message) {
  console.error(`extract-posters: ${message}`)
  process.exit(1)
}

const readJson = (name, optional = false) => {
  const file = join(values.gallery, name)
  if (!existsSync(file)) return optional ? {} : fail(`${file} is missing`)
  return JSON.parse(readFileSync(file, 'utf8'))
}

function loadPlaywright() {
  const require = createRequire(import.meta.url)
  for (const id of ['playwright', process.env.PLAYWRIGHT_MODULE, '/opt/node22/lib/node_modules/playwright']) {
    if (!id) continue
    try {
      return require(id)
    } catch {}
  }
  return fail('Playwright not found (install it, or set PLAYWRIGHT_MODULE)')
}

async function readCatalogue() {
  if (!existsSync(catalogue)) fail(`${catalogue} is missing`)
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`${pathToFileURL(catalogue).href}?norender`, { waitUntil: 'load' })
    await page.waitForFunction(() => typeof SYSTEMS !== 'undefined' && typeof KNOBDEF !== 'undefined', null, {
      timeout: 30_000,
    })
    const systems = await page.evaluate(() =>
      SYSTEMS.filter((s) => s.cat === 'K').map((s) => ({
        id: s.id,
        name: s.name,
        blurb: s.blurb ?? null,
        knobs: KNOBDEF[s.id] ?? null,
      }))
    )
    if (errors.length) console.warn(`extract-posters: the catalogue logged ${errors.length} page error(s): ${errors[0]}`)
    return systems
  } finally {
    await browser.close()
  }
}

/** A knob definition, with only the fields the storefront needs, checked. */
function knob(def, id, i) {
  const where = `${id} knob ${i}`
  if (!def || typeof def.n !== 'string' || !def.n) fail(`${where}: no name`)
  const d = def.d ?? 0.5
  if (typeof d !== 'number' || d < 0 || d > 1) fail(`${where}: default ${def.d} is not in 0..1`)
  if (def.opts !== undefined || def.steps !== undefined) {
    const { opts, steps } = def
    if (!Array.isArray(opts) || !opts.every((o) => typeof o === 'string')) fail(`${where}: opts must be strings`)
    if (steps !== opts.length) fail(`${where}: steps ${steps} ≠ ${opts.length} options`)
    return { n: def.n, opts, steps, d }
  }
  const lo = def.lo
  const hi = def.hi
  if (typeof lo !== 'string' || typeof hi !== 'string') fail(`${where}: a slider needs lo and hi labels`)
  return { n: def.n, lo, hi, d }
}

const gallery = readJson('data.json')
const blurbs = readJson('blurbs.json', true)
const cats = readJson('cats.json')
const picks = readJson('picks.json')
if (!Array.isArray(gallery) || !gallery.length) fail('data.json must be a non-empty array')

const systems = new Map((await readCatalogue()).map((s) => [s.id, s]))
const problems = []
const posters = gallery.map((entry, order) => {
  const id = entry.id
  const system = systems.get(id)
  if (!system) return problems.push(`${id}: not in the catalogue's Posters tab`)
  if (!Array.isArray(system.knobs) || system.knobs.length !== 4) {
    return problems.push(`${id}: KNOBDEF has ${system.knobs?.length ?? 'no'} knobs, not 4`)
  }
  const category = cats[id]
  if (!CATEGORIES.includes(category)) return problems.push(`${id}: category ${JSON.stringify(category)} unknown`)
  const strength = picks[id]
  if (!STRENGTHS.includes(strength)) return problems.push(`${id}: pick ${JSON.stringify(strength)} unknown`)
  const name = entry.name || system.name
  const blurb = entry.blurb || blurbs[id] || system.blurb
  if (!name) return problems.push(`${id}: no name`)
  if (!blurb) return problems.push(`${id}: no blurb`)
  return {
    id,
    name,
    blurb,
    category,
    strength,
    order,
    knobs: system.knobs.map((def, i) => knob(def, id, i)),
  }
})
const ids = gallery.map((entry) => entry.id)
const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
if (duplicates.length) problems.push(`duplicate ids: ${duplicates.join(', ')}`)
if (problems.length) fail(`${problems.length} problem(s):\n  ${problems.join('\n  ')}`)

const notSold = [...systems.keys()].filter((id) => !ids.includes(id))
const json = `${JSON.stringify(posters, null, 2)}\n`
if (values.check) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : ''
  if (current !== json) fail(`${out} is out of date: run without --check`)
  console.log(`extract-posters: ${out} is up to date (${posters.length} posters)`)
} else {
  writeFileSync(out, json)
  console.log(
    `extract-posters: wrote ${posters.length} posters to ${out}` +
      (notSold.length ? ` (in the Posters tab but not in the gallery, so not sold: ${notSold.join(', ')})` : '')
  )
}
