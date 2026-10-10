import { describe, expect, it } from 'vitest'
import { POSTER_ASPECT, fitArt, posterHeightFor } from '../aspect'
import { decodeDesign, defaultDesign, encodeDesign } from '../design'

describe('aspect', () => {
  it('is the print sizes\' aspect, 3:4', () => {
    expect(POSTER_ASPECT).toEqual({ w: 3, h: 4 })
    expect(posterHeightFor(750)).toBe(1000)
  })

  it('fills a 3:4 print sheet exactly, with no bands', () => {
    // 45 × 60 cm at the render page's logical size: 1000 × 1333.
    expect(fitArt({ width: 1000, height: 1333 })).toEqual({ x: 0, y: 0, width: 1000, height: 1333 })
  })

  it('centres the art on a taller sheet (contain), full width', () => {
    expect(fitArt({ width: 1000, height: 1500 })).toEqual({ x: 0, y: 84, width: 1000, height: 1333 })
  })

  it('fits by height on a wider sheet', () => {
    expect(fitArt({ width: 1333, height: 1000 })).toEqual({ x: 292, y: 0, width: 750, height: 1000 })
  })
})

describe('render page design parameter', () => {
  const toB64Url = (s: string) => Buffer.from(s, 'utf8').toString('base64url')

  it('reads what the print renderer sends: base64url JSON of the design', () => {
    const d = { ...defaultDesign('k_cpack'), seed: 12, knobs: [0.5, null, null, 0.25], palette: 3, strength: 'v' as const }
    expect(decodeDesign(toB64Url(JSON.stringify(d)))).toEqual(d)
    expect(decodeDesign(encodeDesign(d))).toEqual(d)
  })

  it("also accepts the line's whole metadata.poster ({ version, design, title })", () => {
    const d = { ...defaultDesign('glass'), seed: 3 }
    expect(decodeDesign(toB64Url(JSON.stringify({ version: 1, design: d, title: 'Glass' })))).toEqual(d)
  })

  it('rejects anything else', () => {
    expect(decodeDesign('')).toBeNull()
    expect(decodeDesign('not base64!')).toBeNull()
    expect(decodeDesign(toB64Url('[1,2]'))).toBeNull()
    expect(decodeDesign(toB64Url(JSON.stringify({ kind: 'map', id: 'x' })))).toBeNull()
  })
})
