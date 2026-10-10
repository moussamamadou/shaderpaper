import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Config } from './config.ts'
import { decodeDesign, parseJob } from './job.ts'
import { imageSize, PosterRenderer } from './render.ts'

describe('imageSize', () => {
  it('reads PNG dimensions', () => {
    const png = Buffer.alloc(24)
    png.writeUInt32BE(3600, 16)
    png.writeUInt32BE(4800, 20)
    assert.deepEqual(imageSize(png, 'png'), { width: 3600, height: 4800 })
  })

  it('reads JPEG dimensions past other segments', () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0, length 4
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x12, 0xc0, 0x0e, 0x10, 0x03, // SOF0: height 4800, width 3600
      ...Array(12).fill(0),
    ])
    assert.deepEqual(imageSize(jpeg, 'jpeg'), { width: 3600, height: 4800 })
  })
})

describe('renderUrl', () => {
  const config: Config = {
    port: 4000,
    host: '127.0.0.1',
    token: null,
    production: false,
    storefrontUrl: 'http://localhost:3000',
    renderPath: '/render',
    chrome: { channel: 'chrome', gl: 'swiftshader' },
    concurrency: 1,
    queueLimit: 10,
    timeoutMs: 120_000,
    maxSidePx: 8192,
  }
  const design = { kind: 'shader', id: 'k_cpack', seed: 3, knobs: [null, 0.5, 0.25, 1], palette: null, strength: 'v' }

  it("opens the storefront's /render page with the design as base64url JSON", () => {
    // Building the URL doesn't start Chrome.
    const renderer = new PosterRenderer(config)
    const job = parseJob(
      { design, size: { id: '45x60', widthMm: 450, heightMm: 600 }, pixels: { width: 5400, height: 7200 } },
      8192,
    )
    const url = new URL(renderer.renderUrl(job))
    assert.equal(url.origin, 'http://localhost:3000')
    assert.equal(url.pathname, '/render')
    assert.deepEqual(decodeDesign(url.searchParams.get('d')!), design)
    assert.equal(url.searchParams.get('size'), '45x60')
    assert.equal(url.searchParams.get('mm'), '450x600')
    assert.equal(url.searchParams.has('part'), false)
  })
})
