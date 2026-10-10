import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { imageSize } from './render.ts'

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
