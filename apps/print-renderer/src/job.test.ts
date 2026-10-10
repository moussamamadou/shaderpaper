import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { JobError, logicalSize, parseJob, renderGeometry } from './job.ts'

const design = { version: 1, product: { sizeId: '30x40', orientation: 'portrait', frameId: 'none' } }
const size = { id: '30x40', widthMm: 300, heightMm: 400 }
const job = (overrides: Record<string, unknown> = {}) => ({ design, size, pixels: { width: 3600, height: 4800 }, ...overrides })

describe('geometry', () => {
  it('matches the storefront layout size (short side 1000 px)', () => {
    assert.deepEqual(logicalSize(size, false), { width: 1000, height: 1333 })
    assert.deepEqual(logicalSize(size, true), { width: 1333, height: 1000 })
    assert.deepEqual(logicalSize({ id: '50x70', widthMm: 500, heightMm: 700 }, false), { width: 1000, height: 1400 })
  })

  it('scales the logical page to the output pixels', () => {
    assert.deepEqual(renderGeometry({ size, pixels: { width: 3600, height: 4800 } }), {
      viewport: { width: 1000, height: 1333 },
      scale: 3.6,
    })
    const landscape = renderGeometry({ size, pixels: { width: 8000, height: 6000 } })
    assert.deepEqual(landscape.viewport, { width: 1333, height: 1000 })
    assert.equal(landscape.scale, 8000 / 1333)
  })
})

describe('parseJob', () => {
  it('accepts a valid job, with defaults', () => {
    const parsed = parseJob(job(), 8192)
    assert.equal(parsed.format, 'png')
    assert.equal(parsed.quality, 92)
    assert.deepEqual(parsed.pixels, { width: 3600, height: 4800 })
  })

  it('passes a set\'s poster through', () => {
    assert.equal(parseJob(job({ part: 'lieu' }), 8192).part, 'lieu')
    assert.equal('part' in parseJob(job(), 8192), false)
  })

  it('accepts landscape output', () => {
    assert.deepEqual(parseJob(job({ pixels: { width: 4800, height: 3600 } }), 8192).pixels, { width: 4800, height: 3600 })
  })

  it('rejects output that would stretch the poster', () => {
    assert.throws(() => parseJob(job({ pixels: { width: 3600, height: 3600 } }), 8192), /ratio/)
    assert.throws(() => parseJob(job({ pixels: { width: 3600, height: 4900 } }), 8192), /ratio/)
  })

  it('rejects output larger than the renderer can draw', () => {
    assert.throws(() => parseJob(job({ pixels: { width: 7200, height: 9600 } }), 8192), /pixels.height/)
  })

  it('rejects malformed input', () => {
    assert.throws(() => parseJob(null, 8192), JobError)
    assert.throws(() => parseJob(job({ design: 'x' }), 8192), /design/)
    assert.throws(() => parseJob(job({ design: { big: 'x'.repeat(40_000) } }), 8192), /too large/)
    assert.throws(() => parseJob(job({ size: { ...size, id: '../x' } }), 8192), /size.id/)
    assert.throws(() => parseJob(job({ size: { ...size, widthMm: 0 } }), 8192), /size.widthMm/)
    assert.throws(() => parseJob(job({ pixels: { width: 3600.5, height: 4800 } }), 8192), /pixels.width/)
    assert.throws(() => parseJob(job({ format: 'gif' }), 8192), /format/)
    assert.throws(() => parseJob(job({ format: 'jpeg', quality: 101 }), 8192), /quality/)
    assert.throws(() => parseJob(job({ part: '../x' }), 8192), /part/)
  })
})
