import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import { loadConfig } from './config.ts'
import { decodeDesign, parseJob } from './job.ts'
import { PosterRenderer } from './render.ts'

/**
 * Renders one poster to a file, without the HTTP server:
 *
 *   pnpm render --link '<render page link with ?d=>' --out poster.png
 *   pnpm render --design design.json --size 45x60 --dpi 300 --out poster.png
 */

const usage = `Usage: pnpm render (--link <url with ?d=> | --design <file.json>) [--size <id>] [--mm <w>x<h>]
                   [--dpi 300 | --px <w>x<h>] [--format png|jpeg] [--out poster.png]`

const { values } = parseArgs({
  options: {
    link: { type: 'string' },
    design: { type: 'string' },
    size: { type: 'string' },
    mm: { type: 'string' },
    dpi: { type: 'string', default: '300' },
    px: { type: 'string' },
    format: { type: 'string', default: 'png' },
    out: { type: 'string' },
  },
})

function fail(message: string): never {
  console.error(`${message}\n${usage}`)
  process.exit(1)
}

const pair = (value: string, name: string): [number, number] => {
  const match = /^(\d+)x(\d+)$/.exec(value)
  if (!match) fail(`--${name} must look like 300x400`)
  return [Number(match[1]), Number(match[2])]
}

async function readDesign(): Promise<Record<string, unknown>> {
  if (values.design) return JSON.parse(await readFile(values.design, 'utf8'))
  if (!values.link) fail('Pass --link or --design')
  const encoded = new URL(values.link).searchParams.get('d')
  const design = encoded ? decodeDesign(encoded) : null
  if (!design) fail('The link has no design (?d=, base64url JSON)')
  return design
}

const design = await readDesign()
// Méridien's designs carried their size in `product`; a render page link carries it as `size`.
const product = (design.product ?? {}) as { sizeId?: string; orientation?: string }
const linkSize = values.link ? (new URL(values.link).searchParams.get('size') ?? undefined) : undefined
const sizeId = values.size ?? linkSize ?? product.sizeId ?? '30x40'
// A size id like "30x40" is in cm; others (e.g. "digital") need --mm.
const [widthMm, heightMm] = values.mm
  ? pair(values.mm, 'mm')
  : /^\d+x\d+$/.test(sizeId)
    ? pair(sizeId, 'size').map((cm) => cm * 10)
    : fail(`Size "${sizeId}" isn't in cm: pass --mm`)
const landscape = product.orientation === 'landscape'

let pixels: [number, number]
if (values.px) pixels = pair(values.px, 'px')
else {
  const dpi = Number(values.dpi)
  const short = Math.round((Math.min(widthMm, heightMm) / 25.4) * dpi)
  const long = Math.round((Math.max(widthMm, heightMm) / 25.4) * dpi)
  pixels = landscape ? [long, short] : [short, long]
}

const config = loadConfig()
const job = parseJob(
  {
    design,
    size: { id: sizeId, widthMm, heightMm },
    pixels: { width: pixels[0], height: pixels[1] },
    format: values.format,
  },
  config.maxSidePx,
)
const out = values.out ?? `poster-${sizeId}.${job.format === 'jpeg' ? 'jpg' : 'png'}`

const renderer = new PosterRenderer(config)
try {
  const result = await renderer.render(job)
  await writeFile(out, result.image)
  console.log(`Wrote ${out}: ${result.width}×${result.height}, ${(result.image.length / 1e6).toFixed(1)} MB, ${(result.ms / 1000).toFixed(1)} s`)
} finally {
  await renderer.close()
}
