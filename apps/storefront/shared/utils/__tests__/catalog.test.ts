import { describe, expect, it } from 'vitest'
import {
  facetsOf,
  filterCards,
  paginate,
  parseShopQuery,
  posterIdOf,
  defaultSeedOf,
  shopQueryToRoute,
  sortCards,
  toCard,
  type CatalogProduct,
} from '../catalog'

const product = (id: string, cat: string, prices: number[], extra: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: `prod_${id}`,
  handle: id,
  title: id.charAt(0).toUpperCase() + id.slice(1),
  thumbnail: `/posters/${id}.webp`,
  created_at: '2026-10-01T00:00:00.000Z',
  collection: { handle: cat, title: cat },
  metadata: { shader: { id, defaultSeed: 1 }, category: cat },
  variants: prices.map((p) => ({ calculated_price: { calculated_amount: p, currency_code: 'eur' } })),
  ...extra,
})

const products = [
  product('waves', 'lines', [59, 39, 79]),
  product('glass', 'material', [39, 189], { created_at: '2026-10-09T00:00:00.000Z' }),
  product('tiles', 'geo', [45]),
  product('cells', 'pattern', []),
]
const cards = products.map((p, i) => toCard(p, i))

describe('catalog cards', () => {
  it('maps products to cards', () => {
    expect(cards[0]).toMatchObject({ handle: 'waves', price: { amount: 39, currency: 'eur' }, category: { handle: 'lines' }, isNew: false, rank: 0 })
    expect(cards[1]!.isNew).toBe(true) // a launch poster
    expect(cards[2]!.category).toEqual({ handle: 'geometric', title: 'geo' }) // "geo" alias
    expect(cards[3]!.price).toBeNull()
  })

  it('honours backend flags for "new"', () => {
    expect(toCard(product('glass', 'material', [1], { metadata: { new: false } })).isNew).toBe(false)
    expect(toCard(product('waves', 'lines', [1], { tags: [{ value: 'New' }] })).isNew).toBe(true)
  })

  it('reads the poster id and default seed', () => {
    expect(posterIdOf({ handle: 'x', metadata: { shader: { id: 'k_bands' } } })).toBe('k_bands')
    expect(posterIdOf({ handle: 'warp', metadata: null })).toBe('warp')
    expect(defaultSeedOf({ metadata: { shader: { id: 'a', defaultSeed: 3 } } })).toBe(3)
    expect(defaultSeedOf({ metadata: { shader: { id: 'a', defaultSeed: 3.2 } } })).toBe(1)
  })
})

describe('shop query', () => {
  it('parses and serialises, dropping defaults', () => {
    const q = parseShopQuery({ category: 'lines,geo', min: '40', sort: 'price-desc', grid: 'compact', page: '2' })
    expect(q).toEqual({ categories: ['lines', 'geometric'], min: 40, max: null, sort: 'price-desc', density: 'compact', page: 2 })
    expect(shopQueryToRoute(q)).toEqual({ category: 'lines,geometric', min: '40', sort: 'price-desc', grid: 'compact', page: '2' })
    expect(shopQueryToRoute(parseShopQuery({ sort: 'bogus', min: '-4', page: '0' }))).toEqual({})
  })

  it('filters by category and price', () => {
    expect(filterCards(cards, { categories: ['lines', 'material'], min: null, max: null }).map((c) => c.handle)).toEqual(['waves', 'glass'])
    expect(filterCards(cards, { categories: [], min: 40, max: 50 }).map((c) => c.handle)).toEqual(['tiles'])
  })

  it('sorts five ways', () => {
    expect(sortCards(cards, 'featured').map((c) => c.handle)).toEqual(['waves', 'glass', 'tiles', 'cells'])
    expect(sortCards(cards, 'newest')[0]!.handle).toBe('glass')
    expect(sortCards(cards, 'price-asc').map((c) => c.handle)).toEqual(['glass', 'waves', 'tiles', 'cells'])
    expect(sortCards(cards, 'price-desc').map((c) => c.handle)).toEqual(['cells', 'tiles', 'glass', 'waves'])
    expect(sortCards(cards, 'az').map((c) => c.handle)).toEqual(['cells', 'glass', 'tiles', 'waves'])
  })

  it('computes facets and pages', () => {
    const f = facetsOf(cards)
    expect(f.categories.map((c) => c.handle)).toEqual(['geometric', 'pattern', 'lines', 'material'])
    expect(f.price).toEqual({ min: 39, max: 45, currency: 'eur' })
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual({ items: [3, 4], page: 2, pages: 3 })
    expect(paginate([1, 2], 9, 2)).toEqual({ items: [1, 2], page: 1, pages: 1 })
  })
})
