#!/usr/bin/env node
// Copies the shader engine (explorations/index.html, the poster catalogue with
// its #embed mode) to public/engine/index.html, where the product page's
// customiser and the /render page load it in an iframe. Runs before dev, build
// and test, so the storefront always ships the current engine. The copy is
// gitignored: explorations/index.html stays the one source of truth.
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('../../../explorations/index.html', import.meta.url))
const dest = fileURLToPath(new URL('../public/engine/index.html', import.meta.url))

let html
try {
  html = readFileSync(src, 'utf8')
} catch {
  console.error(`copy-engine: ${src} not found; the customiser needs it.`)
  process.exit(1)
}
if (!html.includes('function embedBoot(')) {
  console.error('copy-engine: explorations/index.html has no embed mode (embedBoot); refusing to copy.')
  process.exit(1)
}

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
const kb = Math.round(statSync(dest).size / 1024)
console.log(`copy-engine: ${relative(process.cwd(), src)} → ${relative(process.cwd(), dest)} (${kb} kB)`)
