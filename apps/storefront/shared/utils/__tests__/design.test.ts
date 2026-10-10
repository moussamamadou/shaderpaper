import { describe, expect, it } from 'vitest'
import {
  decodeDesign,
  defaultDesign,
  designFromQuery,
  designToQuery,
  encodeDesign,
  engineHash,
  lineDesign,
  normalizeDesign,
  sameDesign,
} from '../design'

describe('design', () => {
  const custom = { ...defaultDesign('glass'), seed: 7, knobs: [0.125, null, 0.6, null], palette: 2, strength: 'v' as const }

  it('defaults to variation 1 with every choice left to the seed', () => {
    expect(defaultDesign('julia')).toEqual({ kind: 'shader', id: 'julia', seed: 1, knobs: [null, null, null, null], palette: null, strength: 'b' })
  })

  it('round-trips through the product URL query', () => {
    const q = designToQuery(custom)
    expect(q).toEqual({ v: '7', k: '0.125,,0.6,', pal: '2', lvl: 'v' })
    expect(designFromQuery(q, defaultDesign('glass'))).toEqual(custom)
  })

  it('keeps the base for absent query params and ignores junk', () => {
    const base = defaultDesign('glass', { strength: 'n' })
    expect(designFromQuery({}, base)).toEqual(base)
    expect(designFromQuery({ v: 'abc', k: 'x,2,-1', pal: '-3', lvl: 'loud' }, base)).toEqual({
      ...base,
      seed: 1,
      knobs: [null, 1, 0, null],
      palette: null,
    })
  })

  it('round-trips through the /render ?d= encoding', () => {
    const s = encodeDesign(custom)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeDesign(s)).toEqual(custom)
    expect(decodeDesign('not base64!')).toBeNull()
    expect(decodeDesign(encodeDesign({ ...custom, id: '../etc' } as never))).toBeNull()
  })

  it('builds the engine hash the embed mode parses', () => {
    expect(engineHash(custom)).toBe('#embed?id=glass&seed=7&k=0.125%2C%2C0.6%2C&pal=2&lvl=v')
    expect(engineHash(defaultDesign('knot'), { dpr: 3 })).toBe('#embed?id=knot&seed=1&k=%2C%2C%2C&pal=&lvl=b&dpr=3')
  })

  it('normalises and clamps', () => {
    expect(normalizeDesign({ id: 'warp', seed: 0, knobs: [2, '0.5', null], palette: 1.5, strength: 'x' })).toEqual({
      kind: 'shader', id: 'warp', seed: 1, knobs: [1, 0.5, null, null], palette: null, strength: 'b',
    })
    expect(normalizeDesign({ kind: 'map', id: 'warp' })).toBeNull()
    expect(normalizeDesign(null)).toBeNull()
  })

  it('reads the design off a cart line', () => {
    const meta = { poster: { version: 1, design: custom, title: 'Glass Lens', thumbnail: 'data:image/webp;base64,AAA' } }
    expect(lineDesign(meta)).toEqual({ version: 1, design: custom, title: 'Glass Lens', thumbnail: 'data:image/webp;base64,AAA' })
    expect(lineDesign({ poster: { design: custom, thumbnail: 'javascript:alert(1)' } })?.thumbnail).toBeUndefined()
    expect(lineDesign({})).toBeNull()
  })

  it('compares designs', () => {
    expect(sameDesign(custom, { ...custom, knobs: custom.knobs.slice() })).toBe(true)
    expect(sameDesign(custom, { ...custom, seed: 8 })).toBe(false)
  })
})
