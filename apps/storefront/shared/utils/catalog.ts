/**
 * Posters as the shop lists them, and the shop's filters and sorts. Pure, so
 * the server's /api/catalog, the pages and the unit tests share one copy.
 *
 * Product shape (backend seed): one product per poster, handle = poster id,
 * options Size × Frame (12 variants), metadata.shader = { id, defaultSeed },
 * metadata.knobs, metadata.category, collection = category handle.
 */

/** The minimal product fields this module reads (a subset of HttpTypes.StoreProduct). */
export interface CatalogProduct {
  id: string
  handle?: string | null
  title?: string | null
  description?: string | null
  thumbnail?: string | null
  created_at?: string | Date | null
  metadata?: Record<string, unknown> | null
  collection?: { id?: string; handle?: string | null; title?: string | null } | null
  tags?: { value?: string | null }[] | null
  variants?: { calculated_price?: { calculated_amount?: number | null; currency_code?: string | null } | null }[] | null
}

export interface PosterCard {
  id: string
  handle: string
  title: string
  thumbnail: string | null
  category: { handle: string; title: string } | null
  createdAt: string | null
  /** Cheapest variant ("from" price), decimal as Medusa returns it. */
  price: { amount: number; currency: string } | null
  isNew: boolean
  /** Featured order: metadata.rank when the backend sets one, else the catalogue's order. */
  rank: number
}

/** The six collections (category handles) and their names, from the gallery. */
export const CATEGORIES = [
  { handle: 'geometric', title: 'Geometric' },
  { handle: 'pattern', title: 'Pattern & tiling' },
  { handle: 'lines', title: 'Lines & op-art' },
  { handle: 'organic', title: 'Organic & fluid' },
  { handle: 'light', title: 'Light & gradient' },
  { handle: 'material', title: '3D & material' },
] as const

const CATEGORY_ALIASES: Record<string, string> = { geo: 'geometric' }

/**
 * The seven 3D posters the "3D & material" campaign launches (the last ones
 * added to the catalogue). Used for the "New" badge unless the backend marks
 * products itself (metadata.new / metadata.is_new / a "new" tag).
 */
export const LAUNCH_IDS = ['glass', 'puffy', 'totem', 'pins', 'folds', 'gyroid', 'knot'] as const

export function categoryTitle(handle: string): string {
  return CATEGORIES.find((c) => c.handle === handle)?.title ?? handle
}

export function normalizeCategory(handle: unknown): string | null {
  if (typeof handle !== 'string' || !handle) return null
  const h = handle.toLowerCase()
  return CATEGORY_ALIASES[h] ?? h
}

/** Poster id of a product: metadata.shader.id, else its handle. */
export function posterIdOf(product: Pick<CatalogProduct, 'handle' | 'metadata'>): string {
  const shader = product.metadata?.shader
  if (shader && typeof shader === 'object' && typeof (shader as Record<string, unknown>).id === 'string') {
    return (shader as { id: string }).id
  }
  return product.handle ?? ''
}

export function defaultSeedOf(product: Pick<CatalogProduct, 'metadata'>): number {
  const shader = product.metadata?.shader as Record<string, unknown> | undefined
  const n = Number(shader?.defaultSeed ?? shader?.default_seed)
  return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : 1
}

function flag(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

export function isNewProduct(p: CatalogProduct): boolean {
  const m = p.metadata ?? {}
  if ('new' in m || 'is_new' in m) return flag(m.new) || flag(m.is_new)
  if (p.tags?.some((t) => t.value?.toLowerCase() === 'new')) return true
  return (LAUNCH_IDS as readonly string[]).includes(posterIdOf(p))
}

export function cheapestPrice(p: CatalogProduct): PosterCard['price'] {
  let best: PosterCard['price'] = null
  for (const v of p.variants ?? []) {
    const cp = v.calculated_price
    if (cp?.calculated_amount == null || !cp.currency_code) continue
    if (!best || cp.calculated_amount < best.amount) best = { amount: cp.calculated_amount, currency: cp.currency_code }
  }
  return best
}

export function toCard(p: CatalogProduct, index = 0): PosterCard {
  const handle = normalizeCategory(p.collection?.handle) ?? normalizeCategory(p.metadata?.category)
  const rank = Number(p.metadata?.rank)
  return {
    id: p.id,
    handle: p.handle ?? posterIdOf(p),
    title: p.title ?? p.handle ?? '',
    thumbnail: p.thumbnail ?? null,
    category: handle ? { handle, title: p.collection?.title || categoryTitle(handle) } : null,
    createdAt: p.created_at ? new Date(p.created_at).toISOString() : null,
    price: cheapestPrice(p),
    isNew: isNewProduct(p),
    rank: Number.isFinite(rank) ? rank : index,
  }
}

// ---- shop query --------------------------------------------------------------

export const SORTS = ['featured', 'newest', 'price-asc', 'price-desc', 'az'] as const
export type SortKey = (typeof SORTS)[number]
export type Density = 'comfortable' | 'compact'

export interface ShopQuery {
  categories: string[]
  /** Price bounds on the "from" price, in the currency's major unit. */
  min: number | null
  max: number | null
  sort: SortKey
  density: Density
  page: number
}

type Q = Record<string, string | null | undefined | (string | null)[]>
const one = (v: Q[string]): string | undefined => (Array.isArray(v) ? (v[0] ?? undefined) : (v ?? undefined))
const bound = (v: Q[string]): number | null => {
  const s = one(v)
  if (s === undefined || s === '') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function parseShopQuery(q: Q): ShopQuery {
  const cats = q.category
  const list = (Array.isArray(cats) ? cats : typeof cats === 'string' ? cats.split(',') : [])
    .map((c) => normalizeCategory(c))
    .filter((c): c is string => !!c)
  const sort = one(q.sort)
  const page = Math.floor(Number(one(q.page)))
  return {
    categories: [...new Set(list)],
    min: bound(q.min),
    max: bound(q.max),
    sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : 'featured',
    density: one(q.grid) === 'compact' ? 'compact' : 'comfortable',
    page: Number.isFinite(page) && page > 1 ? page : 1,
  }
}

/** The query object to put in the URL (defaults dropped, so a plain /shop stays plain). */
export function shopQueryToRoute(s: ShopQuery): Record<string, string> {
  const q: Record<string, string> = {}
  if (s.categories.length) q.category = s.categories.join(',')
  if (s.min != null) q.min = String(s.min)
  if (s.max != null) q.max = String(s.max)
  if (s.sort !== 'featured') q.sort = s.sort
  if (s.density !== 'comfortable') q.grid = s.density
  if (s.page > 1) q.page = String(s.page)
  return q
}

export function filterCards(cards: PosterCard[], s: Pick<ShopQuery, 'categories' | 'min' | 'max'>): PosterCard[] {
  return cards.filter((c) => {
    if (s.categories.length && !(c.category && s.categories.includes(c.category.handle))) return false
    if (s.min != null && (c.price == null || c.price.amount < s.min)) return false
    if (s.max != null && (c.price == null || c.price.amount > s.max)) return false
    return true
  })
}

export function sortCards(cards: PosterCard[], sort: SortKey): PosterCard[] {
  const out = cards.slice()
  const price = (c: PosterCard) => c.price?.amount ?? Number.POSITIVE_INFINITY
  const byTitle = (a: PosterCard, b: PosterCard) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })
  switch (sort) {
    case 'newest':
      return out.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || Number(b.isNew) - Number(a.isNew) || a.rank - b.rank)
    case 'price-asc':
      return out.sort((a, b) => price(a) - price(b) || byTitle(a, b))
    case 'price-desc':
      return out.sort((a, b) => price(b) - price(a) || byTitle(a, b))
    case 'az':
      return out.sort(byTitle)
    default:
      return out.sort((a, b) => a.rank - b.rank)
  }
}

export interface Facets {
  categories: { handle: string; title: string; count: number }[]
  price: { min: number; max: number; currency: string } | null
}

export function facetsOf(cards: PosterCard[]): Facets {
  const counts = new Map<string, { handle: string; title: string; count: number }>()
  for (const c of cards) {
    if (!c.category) continue
    const e = counts.get(c.category.handle) ?? { ...c.category, count: 0 }
    e.count++
    counts.set(c.category.handle, e)
  }
  const order = CATEGORIES.map((c) => c.handle as string)
  const categories = [...counts.values()].sort((a, b) => {
    const ia = order.indexOf(a.handle)
    const ib = order.indexOf(b.handle)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.title.localeCompare(b.title)
  })
  const priced = cards.filter((c) => c.price)
  const price = priced.length
    ? {
        min: Math.min(...priced.map((c) => c.price!.amount)),
        max: Math.max(...priced.map((c) => c.price!.amount)),
        currency: priced[0]!.price!.currency,
      }
    : null
  return { categories, price }
}

export function paginate<T>(items: T[], page: number, perPage: number): { items: T[]; page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const p = Math.min(Math.max(1, page), pages)
  return { items: items.slice((p - 1) * perPage, p * perPage), page: p, pages }
}
